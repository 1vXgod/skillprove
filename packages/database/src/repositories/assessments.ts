import type { Prisma, PrismaClient } from "../generated/prisma/client";
import type { AssessmentType, DifficultyLevel } from "../generated/prisma/enums";
import { AssessmentDataError } from "./assessment-errors";

type Tx = Prisma.TransactionClient;
type Json = Prisma.InputJsonValue;

/** A question row ready to store. Produced by the assessment-engine codec. */
export interface QuestionRow {
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "SHORT_TEXT" | "LONG_TEXT";
  prompt: string;
  options: unknown;
  answerKey: unknown;
  explanation: string | null;
  skillId: string | null;
  difficulty: DifficultyLevel | null;
  estimatedMinutes: number | null;
}

export interface CriterionRow {
  key: string;
  title: string;
  description: string | null;
  weight: number;
  maxScore: number | null;
  scoringGuidance: string | null;
  skillId: string | null;
}

export interface DraftMeta {
  title: string;
  description: string | null;
  instructions: string | null;
  language: string;
  difficulty: DifficultyLevel;
  assessmentType: AssessmentType;
  durationMinutes: number;
}

const toJson = (value: unknown): Json | undefined => (value === null || value === undefined ? undefined : (value as Json));

const versionInclude = {
  skills: true,
  questions: { orderBy: { position: "asc" } },
  rubrics: { orderBy: { version: "desc" }, take: 1, include: { criteria: { orderBy: { key: "asc" } } } },
} satisfies Prisma.AssessmentVersionInclude;

export type VersionRecord = Prisma.AssessmentVersionGetPayload<{ include: typeof versionInclude }>;
export interface AssessmentRecord {
  id: string;
  companyId: string;
  creationSource: "HUMAN" | "AI_GENERATED";
  createdAt: Date;
  /** The open draft if there is one, else the latest published version, else the latest archived one. */
  working: VersionRecord;
  hasOpenDraft: boolean;
  hasPublishedVersion: boolean;
}

function deriveFormat(types: readonly string[], assessmentType: AssessmentType | null) {
  if (types.length === 0) return "MIXED" as const;
  if (types.every((t) => t === "SINGLE_CHOICE" || t === "MULTIPLE_CHOICE")) return "MULTIPLE_CHOICE" as const;
  if (assessmentType === "PRACTICAL" && types.every((t) => t === "LONG_TEXT" || t === "SHORT_TEXT")) return "PRACTICAL_TASK" as const;
  if (types.every((t) => t === "SHORT_TEXT" || t === "LONG_TEXT")) return "WRITTEN" as const;
  return "MIXED" as const;
}

async function assertSkillsExist(tx: Tx | PrismaClient, skillIds: readonly string[]) {
  const found = await tx.skill.count({ where: { id: { in: [...skillIds] } } });
  if (found !== new Set(skillIds).size) throw new AssessmentDataError("invalid_reference", "skillIds");
}

function equalWeights(n: number): number[] {
  const base = Math.floor(10_000 / n);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? 10_000 - base * (n - 1) : base) / 100);
}

async function audit(
  tx: Tx,
  entry: { action: string; actorId: string; companyId: string; targetId: string; metadata?: Record<string, unknown> },
) {
  await tx.auditLog.create({
    data: {
      action: entry.action,
      actorType: "USER",
      actorId: entry.actorId,
      companyId: entry.companyId,
      targetType: "assessment",
      targetId: entry.targetId,
      metadata: entry.metadata as Json | undefined,
    },
  });
}

async function writeContent(
  tx: Tx,
  versionId: string,
  content: { questions: readonly QuestionRow[]; criteria: readonly CriterionRow[] },
) {
  if (content.questions.length > 0) {
    await tx.assessmentQuestion.createMany({
      data: content.questions.map((q, i) => ({
        assessmentVersionId: versionId,
        position: i + 1,
        type: q.type,
        prompt: q.prompt,
        options: toJson(q.options),
        answerKey: toJson(q.answerKey),
        explanation: q.explanation,
        skillId: q.skillId,
        difficulty: q.difficulty,
        estimatedMinutes: q.estimatedMinutes,
      })),
    });
  }
  const rubric = await tx.assessmentRubricVersion.create({ data: { assessmentVersionId: versionId, version: 1 } });
  if (content.criteria.length > 0) {
    await tx.assessmentRubricCriterion.createMany({
      data: content.criteria.map((c) => ({ rubricVersionId: rubric.id, ...c })),
    });
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

async function loadAssessment(client: PrismaClient | Tx, companyId: string, assessmentId: string) {
  return client.assessment.findFirst({
    where: { id: assessmentId, ownerCompanyId: companyId, deletedAt: null },
    include: { versions: { orderBy: { version: "desc" }, include: versionInclude } },
  });
}

function toRecord(a: NonNullable<Awaited<ReturnType<typeof loadAssessment>>>): AssessmentRecord {
  const draft = a.versions.find((v) => v.status === "DRAFT");
  const published = a.versions.find((v) => v.status === "PUBLISHED");
  const working = draft ?? published ?? a.versions[0];
  if (!working) throw new AssessmentDataError("not_found");
  return {
    id: a.id,
    companyId: a.ownerCompanyId as string,
    creationSource: a.creationSource,
    createdAt: a.createdAt,
    working,
    hasOpenDraft: Boolean(draft),
    hasPublishedVersion: a.versions.some((v) => v.status === "PUBLISHED" || (v.status === "ARCHIVED" && v.publishedAt)),
  };
}

/** The tenant boundary: another company's assessment is indistinguishable from a missing one. */
export async function getAssessment(db: PrismaClient, companyId: string, assessmentId: string): Promise<AssessmentRecord> {
  const found = await loadAssessment(db, companyId, assessmentId);
  if (!found) throw new AssessmentDataError("not_found");
  return toRecord(found);
}

export async function listAssessments(
  db: PrismaClient,
  companyId: string,
  options: { page: number; pageSize: number; status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" },
) {
  const where: Prisma.AssessmentWhereInput = {
    ownerCompanyId: companyId,
    deletedAt: null,
    ...(options.status ? { versions: { some: { status: options.status } } } : {}),
  };
  const [total, rows] = await Promise.all([
    db.assessment.count({ where }),
    db.assessment.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (options.page - 1) * options.pageSize,
      take: options.pageSize,
      include: {
        versions: { orderBy: { version: "desc" }, include: { _count: { select: { questions: true } } } },
      },
    }),
  ]);
  const items = rows.flatMap((a) => {
    const v = a.versions.find((x) => x.status === "DRAFT") ?? a.versions.find((x) => x.status === "PUBLISHED") ?? a.versions[0];
    return v
      ? [
          {
            id: a.id,
            title: v.title,
            language: v.language,
            difficulty: v.difficulty,
            assessmentType: v.assessmentType,
            status: v.status,
            version: v.version,
            creationSource: a.creationSource,
            questionCount: v._count.questions,
            updatedAt: v.updatedAt > a.updatedAt ? v.updatedAt : a.updatedAt,
          },
        ]
      : [];
  });
  return { items, total, page: options.page, pageSize: options.pageSize };
}

export async function listVersions(db: PrismaClient, companyId: string, assessmentId: string) {
  const a = await db.assessment.findFirst({
    where: { id: assessmentId, ownerCompanyId: companyId, deletedAt: null },
    include: { versions: { orderBy: { version: "desc" } } },
  });
  if (!a) throw new AssessmentDataError("not_found");
  return a.versions;
}

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

export async function createAssessment(
  db: PrismaClient,
  input: {
    companyId: string;
    userId: string;
    source: "HUMAN" | "AI_GENERATED";
    meta: DraftMeta;
    skillIds: readonly string[];
    aiJobId?: string | null;
    questions?: readonly QuestionRow[];
    criteria?: readonly CriterionRow[];
  },
): Promise<string> {
  await assertSkillsExist(db, input.skillIds);
  return db.$transaction(async (tx) => {
    const assessment = await tx.assessment.create({
      data: {
        ownerType: "COMPANY",
        ownerCompanyId: input.companyId,
        creationSource: input.source,
        createdById: input.userId,
        versions: {
          create: {
            version: 1,
            title: input.meta.title,
            description: input.meta.description,
            instructions: input.meta.instructions,
            language: input.meta.language,
            difficulty: input.meta.difficulty,
            assessmentType: input.meta.assessmentType,
            durationMinutes: input.meta.durationMinutes,
            format: deriveFormat((input.questions ?? []).map((q) => q.type), input.meta.assessmentType),
            aiJobId: input.aiJobId ?? null,
          },
        },
      },
      include: { versions: true },
    });
    const version = assessment.versions[0]!;
    const weights = equalWeights(input.skillIds.length);
    await tx.assessmentSkill.createMany({
      data: input.skillIds.map((skillId, i) => ({ assessmentVersionId: version.id, skillId, weight: weights[i]! })),
    });
    await writeContent(tx, version.id, { questions: input.questions ?? [], criteria: input.criteria ?? [] });
    await audit(tx, {
      action: input.source === "AI_GENERATED" ? "assessment.generated" : "assessment.created",
      actorId: input.userId,
      companyId: input.companyId,
      targetId: assessment.id,
      metadata: { source: input.source, questionCount: input.questions?.length ?? 0, ...(input.aiJobId ? { aiJobId: input.aiJobId } : {}) },
    });
    return assessment.id;
  });
}

// ---------------------------------------------------------------------------
// Drafts and versions
// ---------------------------------------------------------------------------

async function cloneAsDraft(tx: Tx, assessmentId: string, source: VersionRecord) {
  const top = await tx.assessmentVersion.findFirst({ where: { assessmentId }, orderBy: { version: "desc" } });
  const next = (top?.version ?? 0) + 1;
  const created = await tx.assessmentVersion.create({
    data: {
      assessmentId,
      version: next,
      title: source.title,
      description: source.description,
      instructions: source.instructions,
      language: source.language,
      format: source.format,
      difficulty: source.difficulty,
      durationMinutes: source.durationMinutes,
      maxAttempts: source.maxAttempts,
      attemptTtlHours: source.attemptTtlHours,
      assessmentType: source.assessmentType,
    },
  });
  if (source.skills.length > 0) {
    await tx.assessmentSkill.createMany({
      data: source.skills.map((s) => ({ assessmentVersionId: created.id, skillId: s.skillId, weight: s.weight })),
    });
  }
  const rubric = source.rubrics[0];
  await writeContent(tx, created.id, {
    questions: source.questions.map((q) => ({
      type: q.type as QuestionRow["type"],
      prompt: q.prompt,
      options: q.options,
      answerKey: q.answerKey,
      explanation: q.explanation,
      skillId: q.skillId,
      difficulty: q.difficulty,
      estimatedMinutes: q.estimatedMinutes,
    })),
    criteria: (rubric?.criteria ?? []).map((c) => ({
      key: c.key,
      title: c.title,
      description: c.description,
      weight: Number(c.weight),
      maxScore: c.maxScore === null ? null : Number(c.maxScore),
      scoringGuidance: c.scoringGuidance,
      skillId: c.skillId,
    })),
  });
  return created;
}

/** Editing a published assessment starts here: a new draft copied from the latest published version. Returns the existing draft if one is open. */
export async function ensureDraft(db: PrismaClient, companyId: string, assessmentId: string, userId: string) {
  return db.$transaction(async (tx) => {
    const found = await loadAssessment(tx, companyId, assessmentId);
    if (!found) throw new AssessmentDataError("not_found");
    const record = toRecord(found);
    if (record.hasOpenDraft) return { created: false };
    await cloneAsDraft(tx, assessmentId, record.working);
    await audit(tx, {
      action: "assessment.draft_created",
      actorId: userId,
      companyId,
      targetId: assessmentId,
      metadata: { fromVersion: record.working.version },
    });
    return { created: true };
  });
}

/** Copies any earlier version (including a published one) into a new draft. Refused while a draft is open. */
export async function restoreVersion(db: PrismaClient, companyId: string, assessmentId: string, versionId: string, userId: string) {
  return db.$transaction(async (tx) => {
    const found = await loadAssessment(tx, companyId, assessmentId);
    if (!found) throw new AssessmentDataError("not_found");
    if (found.versions.some((v) => v.status === "DRAFT")) throw new AssessmentDataError("draft_exists");
    const source = found.versions.find((v) => v.id === versionId);
    if (!source) throw new AssessmentDataError("not_found");
    const draft = await cloneAsDraft(tx, assessmentId, source);
    await audit(tx, {
      action: "assessment.version_restored",
      actorId: userId,
      companyId,
      targetId: assessmentId,
      metadata: { restoredVersion: source.version, newVersion: draft.version },
    });
    return draft.version;
  });
}

async function requireDraft(tx: Tx, companyId: string, assessmentId: string) {
  const found = await loadAssessment(tx, companyId, assessmentId);
  if (!found) throw new AssessmentDataError("not_found");
  const draft = found.versions.find((v) => v.status === "DRAFT");
  if (!draft) throw new AssessmentDataError("immutable");
  return draft;
}

export async function updateDraftMeta(
  db: PrismaClient,
  companyId: string,
  assessmentId: string,
  patch: Partial<DraftMeta> & { skillIds?: readonly string[] },
  expectedUpdatedAt: Date,
) {
  if (patch.skillIds) await assertSkillsExist(db, patch.skillIds);
  await db.$transaction(async (tx) => {
    const draft = await requireDraft(tx, companyId, assessmentId);
    if (draft.updatedAt.getTime() !== expectedUpdatedAt.getTime()) throw new AssessmentDataError("stale");
    const { skillIds, ...fields } = patch;
    await tx.assessmentVersion.update({ where: { id: draft.id }, data: fields });
    if (skillIds) {
      const weights = equalWeights(skillIds.length);
      await tx.assessmentSkill.deleteMany({ where: { assessmentVersionId: draft.id } });
      await tx.assessmentSkill.createMany({
        data: skillIds.map((skillId, i) => ({ assessmentVersionId: draft.id, skillId, weight: weights[i]! })),
      });
    }
  });
}

async function touch(tx: Tx, versionId: string) {
  await tx.assessmentVersion.update({ where: { id: versionId }, data: { updatedAt: new Date() } });
}

// ---------------------------------------------------------------------------
// Questions (drafts only; published versions are also frozen by database triggers)
// ---------------------------------------------------------------------------

function questionData(versionId: string, q: QuestionRow) {
  return {
    assessmentVersionId: versionId,
    type: q.type,
    prompt: q.prompt,
    options: toJson(q.options),
    answerKey: toJson(q.answerKey),
    explanation: q.explanation,
    skillId: q.skillId,
    difficulty: q.difficulty,
    estimatedMinutes: q.estimatedMinutes,
  };
}

export async function addQuestion(db: PrismaClient, companyId: string, assessmentId: string, row: QuestionRow, maxQuestions: number) {
  return db.$transaction(async (tx) => {
    const draft = await requireDraft(tx, companyId, assessmentId);
    if (draft.questions.length >= maxQuestions) throw new AssessmentDataError("limit", "questions");
    const created = await tx.assessmentQuestion.create({
      data: { ...questionData(draft.id, row), position: (draft.questions.at(-1)?.position ?? 0) + 1 },
    });
    await touch(tx, draft.id);
    return created.id;
  });
}

export async function updateQuestion(db: PrismaClient, companyId: string, assessmentId: string, questionId: string, row: QuestionRow) {
  await db.$transaction(async (tx) => {
    const draft = await requireDraft(tx, companyId, assessmentId);
    if (!draft.questions.some((q) => q.id === questionId)) throw new AssessmentDataError("not_found");
    await tx.assessmentQuestion.update({ where: { id: questionId }, data: questionData(draft.id, row) });
    await touch(tx, draft.id);
  });
}

export async function deleteQuestion(db: PrismaClient, companyId: string, assessmentId: string, questionId: string) {
  await db.$transaction(async (tx) => {
    const draft = await requireDraft(tx, companyId, assessmentId);
    if (!draft.questions.some((q) => q.id === questionId)) throw new AssessmentDataError("not_found");
    await tx.assessmentQuestion.delete({ where: { id: questionId } });
    const rest = draft.questions.filter((q) => q.id !== questionId);
    // Close the gap. Positions are unique, so move up in order.
    for (const [i, q] of rest.entries()) {
      if (q.position !== i + 1) await tx.assessmentQuestion.update({ where: { id: q.id }, data: { position: i + 1 } });
    }
    await touch(tx, draft.id);
  });
}

export async function reorderQuestions(db: PrismaClient, companyId: string, assessmentId: string, orderedIds: readonly string[]) {
  await db.$transaction(async (tx) => {
    const draft = await requireDraft(tx, companyId, assessmentId);
    const current = new Set(draft.questions.map((q) => q.id));
    if (orderedIds.length !== current.size || !orderedIds.every((id) => current.has(id))) {
      throw new AssessmentDataError("invalid_reference", "questionIds");
    }
    // Two passes avoid colliding with the unique (version, position) index.
    for (const [i, id] of orderedIds.entries()) {
      await tx.assessmentQuestion.update({ where: { id }, data: { position: 1000 + i } });
    }
    for (const [i, id] of orderedIds.entries()) {
      await tx.assessmentQuestion.update({ where: { id }, data: { position: i + 1 } });
    }
    await touch(tx, draft.id);
  });
}

// ---------------------------------------------------------------------------
// Rubric
// ---------------------------------------------------------------------------

export async function replaceRubric(db: PrismaClient, companyId: string, assessmentId: string, criteria: readonly CriterionRow[]) {
  await db.$transaction(async (tx) => {
    const draft = await requireDraft(tx, companyId, assessmentId);
    const rubric = draft.rubrics[0] ?? (await tx.assessmentRubricVersion.create({ data: { assessmentVersionId: draft.id, version: 1 } }));
    if (rubric.publishedAt) throw new AssessmentDataError("immutable");
    await tx.assessmentRubricCriterion.deleteMany({ where: { rubricVersionId: rubric.id } });
    await tx.assessmentRubricCriterion.createMany({ data: criteria.map((c) => ({ rubricVersionId: rubric.id, ...c })) });
    await touch(tx, draft.id);
  });
}

// ---------------------------------------------------------------------------
// Publish and delete
// ---------------------------------------------------------------------------

/**
 * Publishes the open draft. The caller has already checked readiness; this runs again inside the
 * transaction against what is actually stored. The rubric is published first, which the database
 * accepts only if its weights total 100. Earlier published versions are archived. The audit record
 * is written in the same transaction, so a publication can never exist without one.
 */
export async function publishDraft(
  db: PrismaClient,
  companyId: string,
  assessmentId: string,
  userId: string,
  prepare: (draft: VersionRecord) => { issues: string[]; skillWeights: { skillId: string; weight: number }[] },
) {
  return db.$transaction(async (tx) => {
    const draft = await requireDraft(tx, companyId, assessmentId);
    const { issues, skillWeights } = prepare(draft);
    if (issues.length > 0) throw new AssessmentDataError("not_ready", issues.join(","));
    const rubric = draft.rubrics[0];
    if (!rubric) throw new AssessmentDataError("not_ready", "rubricRequired");

    for (const w of skillWeights) {
      await tx.assessmentSkill.updateMany({
        where: { assessmentVersionId: draft.id, skillId: w.skillId },
        data: { weight: w.weight },
      });
    }
    // Skills no question measures cannot carry weight (it must be above 0), so they are dropped.
    await tx.assessmentSkill.deleteMany({
      where: { assessmentVersionId: draft.id, skillId: { notIn: skillWeights.filter((w) => w.weight > 0).map((w) => w.skillId) } },
    });

    const now = new Date();
    await tx.assessmentRubricVersion.update({ where: { id: rubric.id }, data: { publishedAt: now } });
    await tx.assessmentVersion.updateMany({
      where: { assessmentId, status: "PUBLISHED" },
      data: { status: "ARCHIVED", archivedAt: now },
    });
    await tx.assessmentVersion.update({
      where: { id: draft.id },
      data: {
        status: "PUBLISHED",
        publishedAt: now,
        format: deriveFormat(draft.questions.map((q) => q.type), draft.assessmentType),
      },
    });
    await audit(tx, {
      action: "assessment.published",
      actorId: userId,
      companyId,
      targetId: assessmentId,
      metadata: { version: draft.version, versionId: draft.id, questionCount: draft.questions.length },
    });
    return { versionId: draft.id, version: draft.version };
  });
}

export async function softDeleteAssessment(db: PrismaClient, companyId: string, assessmentId: string, userId: string) {
  await db.$transaction(async (tx) => {
    const updated = await tx.assessment.updateMany({
      where: { id: assessmentId, ownerCompanyId: companyId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (updated.count !== 1) throw new AssessmentDataError("not_found");
    await audit(tx, { action: "assessment.deleted", actorId: userId, companyId, targetId: assessmentId });
  });
}

/** Language names for prompts, with a fallback so a missing translation never blocks generation. */
export async function getSkillNames(db: PrismaClient, skillIds: readonly string[], locale: "sq" | "en") {
  const skills = await db.skill.findMany({
    where: { id: { in: [...skillIds] } },
    include: { translations: true },
  });
  return skills.map((s) => {
    const t = s.translations.find((x) => x.locale === locale) ?? s.translations[0];
    return { id: s.id, name: (t as { name?: string } | undefined)?.name ?? s.slug };
  });
}

/** Replaces one question inside an open draft, for question regeneration. Does nothing if the draft was closed meanwhile. */
export async function replaceQuestionIfDraft(db: PrismaClient, companyId: string, assessmentId: string, questionId: string, row: QuestionRow) {
  try {
    await updateQuestion(db, companyId, assessmentId, questionId, row);
    return true;
  } catch (error) {
    if (error instanceof AssessmentDataError && (error.reason === "immutable" || error.reason === "not_found")) return false;
    throw error;
  }
}

/** Resolves which company owns an assessment, so a route without a company in its path can run the membership check. Returns null for missing, deleted and platform-owned assessments alike. */
export async function findAssessmentOwner(db: PrismaClient, assessmentId: string): Promise<string | null> {
  const row = await db.assessment.findFirst({
    where: { id: assessmentId, deletedAt: null, ownerType: "COMPANY" },
    select: { ownerCompanyId: true },
  });
  return row?.ownerCompanyId ?? null;
}
