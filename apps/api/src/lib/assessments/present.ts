import { decodeQuestion, publishIssues, toCandidateQuestion } from "@skillprove/assessment-engine";
import { getAssessment, getSkillNames, type AssessmentRecord, type PrismaClient } from "@skillprove/database";
import type { AssessmentDetail, Question, Rubric } from "@skillprove/validation";

/** Turns stored rows into the author-facing view. Corrupt rows are left out and reported as an issue, never crash the page. */
export function toDetail(record: AssessmentRecord, names: ReadonlyMap<string, string> = new Map()): AssessmentDetail {
  const v = record.working;
  const decoded = v.questions.map((q) => ({ row: q, content: decodeQuestion(q) }));
  const questions = decoded.flatMap(({ row, content }) => (content ? [{ ...content, id: row.id, position: row.position } as Question] : []));

  const rubricRow = v.rubrics[0];
  const rubric: Rubric | null = rubricRow
    ? {
        id: rubricRow.id,
        version: rubricRow.version,
        published: rubricRow.publishedAt !== null,
        criteria: rubricRow.criteria.map((c) => ({
          id: c.id,
          key: c.key,
          title: c.title,
          description: c.description ?? "",
          weight: Number(c.weight),
          maxScore: c.maxScore === null ? 10 : Number(c.maxScore),
          scoringGuidance: c.scoringGuidance ?? "",
          skillId: c.skillId,
        })),
      }
    : null;

  const issues =
    v.status === "DRAFT"
      ? publishIssues({
          title: v.title,
          instructions: v.instructions,
          durationMinutes: v.durationMinutes,
          assessmentType: v.assessmentType,
          skillIds: v.skills.map((s) => s.skillId),
          questions,
          rubric,
        })
      : [];
  if (decoded.some((d) => !d.content)) issues.push("invalidQuestion");

  return {
    id: record.id,
    companyId: record.companyId,
    creationSource: record.creationSource,
    title: v.title,
    description: v.description,
    instructions: v.instructions,
    language: v.language,
    difficulty: v.difficulty,
    assessmentType: v.assessmentType,
    durationMinutes: v.durationMinutes,
    version: {
      id: v.id,
      version: v.version,
      status: v.status,
      publishedAt: v.publishedAt?.toISOString() ?? null,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    },
    hasOpenDraft: record.hasOpenDraft,
    hasPublishedVersion: record.hasPublishedVersion,
    skills: v.skills.map((s) => ({ skillId: s.skillId, name: names.get(s.skillId) ?? "", weight: Number(s.weight) })),
    questions,
    rubric,
    aiJobId: v.aiJobId,
    publishIssues: issues,
  };
}

/** What a candidate would see. Never includes answer keys, explanations or evaluation criteria. */
export function toPreview(record: AssessmentRecord) {
  const v = record.working;
  return {
    title: v.title,
    description: v.description,
    instructions: v.instructions,
    durationMinutes: v.durationMinutes,
    language: v.language,
    questions: v.questions.flatMap((row) => {
      const content = decodeQuestion(row);
      return content ? [{ id: row.id, position: row.position, ...toCandidateQuestion(content) }] : [];
    }),
  };
}

/** Loads an assessment for authors, with skill names in the requested language. */
export async function detailOf(db: PrismaClient, companyId: string, assessmentId: string, locale: "sq" | "en"): Promise<AssessmentDetail> {
  const record = await getAssessment(db, companyId, assessmentId);
  const names = await getSkillNames(db, record.working.skills.map((s) => s.skillId), locale);
  return toDetail(record, new Map(names.map((n) => [n.id, n.name])));
}
