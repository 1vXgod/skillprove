import { describe, expect, it } from "vitest";
import {
  createCompany,
  createCompletedEvaluation,
  createPendingEvaluation,
  createPublishedAssessment,
  createSkill,
  createSubmittedAttempt,
  createUser,
  hasNoTestDatabase,
  useTestDatabase,
} from "./support";

describe.skipIf(hasNoTestDatabase)("assessments and evaluations", () => {
  const db = useTestDatabase();

  async function setup() {
    const [candidate, skill] = [await createUser(db), await createSkill(db)];
    const published = await createPublishedAssessment(db, { skillId: skill.id });
    return { candidate, skill, published };
  }

  it("requires company assessments, and only those, to name a company", async () => {
    const company = await createCompany(db);
    await expect(db.assessment.create({ data: { ownerType: "COMPANY" } })).rejects.toThrow();
    await expect(
      db.assessment.create({ data: { ownerType: "PLATFORM", ownerCompanyId: company.id } }),
    ).rejects.toThrow();
    const owned = await db.assessment.create({
      data: { ownerType: "COMPANY", ownerCompanyId: company.id, creationSource: "AI_GENERATED" },
    });
    expect(owned.visibility).toBe("INVITE_ONLY");
  });

  it("freezes published versions and rubrics", async () => {
    const { published } = await setup();

    await expect(
      db.assessmentVersion.update({
        where: { id: published.version.id },
        data: { title: "Changed" },
      }),
    ).rejects.toThrow(/immutable/);
    await expect(
      db.assessmentQuestion.create({
        data: {
          assessmentVersionId: published.version.id,
          position: 2,
          type: "SHORT_TEXT",
          prompt: "New",
        },
      }),
    ).rejects.toThrow(/immutable/);
    await expect(
      db.assessmentRubricCriterion.update({
        where: { id: published.criteria[0]?.id },
        data: { weight: 10 },
      }),
    ).rejects.toThrow(/immutable/);
    await expect(
      db.assessmentVersion.update({
        where: { id: published.version.id },
        data: { status: "ARCHIVED", archivedAt: new Date() },
      }),
    ).resolves.toBeDefined();
  });

  it("requires rubric weights to total 100 before publishing", async () => {
    const assessment = await db.assessment.create({ data: { ownerType: "PLATFORM" } });
    const version = await db.assessmentVersion.create({
      data: {
        assessmentId: assessment.id,
        version: 1,
        title: "Draft",
        format: "WRITTEN",
        difficulty: "BEGINNER",
      },
    });
    const rubric = await db.assessmentRubricVersion.create({
      data: {
        assessmentVersionId: version.id,
        version: 1,
        criteria: { create: { key: "only", title: "Only", weight: 50 } },
      },
    });
    await expect(
      db.assessmentRubricVersion.update({
        where: { id: rubric.id },
        data: { publishedAt: new Date() },
      }),
    ).rejects.toThrow(/total 100/);
  });

  it("creates attempts and submissions, and enforces the attempt limit", async () => {
    const { candidate, published } = await setup();
    const first = await createSubmittedAttempt(db, published, candidate.id, 1);
    await createSubmittedAttempt(db, published, candidate.id, 2);

    const found = await db.assessmentAttempt.findUniqueOrThrow({
      where: { id: first.attempt.id },
      include: { submissions: true, rubricVersion: true },
    });
    expect(found.submissions).toHaveLength(1);
    expect(found.rubricVersion.id).toBe(published.rubric.id);

    await expect(createSubmittedAttempt(db, published, candidate.id, 3)).rejects.toThrow(
      /maximum attempts/,
    );
    await expect(createSubmittedAttempt(db, published, candidate.id, 1)).rejects.toThrow();
  });

  it("rejects attempts on drafts and with another version's rubric", async () => {
    const { candidate, skill, published } = await setup();
    const other = await createPublishedAssessment(db, { skillId: skill.id });
    await expect(
      db.assessmentAttempt.create({
        data: {
          assessmentVersionId: published.version.id,
          rubricVersionId: other.rubric.id,
          candidateUserId: candidate.id,
          attemptNumber: 1,
        },
      }),
    ).rejects.toThrow();

    const draft = await db.assessmentVersion.create({
      data: {
        assessmentId: published.assessment.id,
        version: 2,
        title: "Draft",
        format: "WRITTEN",
        difficulty: "BEGINNER",
      },
    });
    await expect(
      db.assessmentAttempt.create({
        data: {
          assessmentVersionId: draft.id,
          rubricVersionId: published.rubric.id,
          candidateUserId: candidate.id,
          attemptNumber: 1,
        },
      }),
    ).rejects.toThrow(/not published/);
  });

  it("rejects submissions on expired or finished attempts", async () => {
    const { candidate, published } = await setup();
    const expired = await db.assessmentAttempt.create({
      data: {
        assessmentVersionId: published.version.id,
        rubricVersionId: published.rubric.id,
        candidateUserId: candidate.id,
        attemptNumber: 1,
        startedAt: new Date(Date.now() - 7_200_000),
        expiresAt: new Date(Date.now() - 3_600_000),
      },
    });
    await expect(
      db.assessmentSubmission.create({ data: { attemptId: expired.id, responses: {} } }),
    ).rejects.toThrow(/expired/);

    const finished = await createSubmittedAttempt(db, published, candidate.id, 2);
    await expect(
      db.assessmentSubmission.create({
        data: { attemptId: finished.attempt.id, revision: 2, responses: {} },
      }),
    ).rejects.toThrow(/not in progress/);
  });

  it("keeps submissions immutable, but allows erasure", async () => {
    const { candidate, published } = await setup();
    const { submission } = await createSubmittedAttempt(db, published, candidate.id);

    await expect(
      db.assessmentSubmission.update({
        where: { id: submission.id },
        data: { responses: { answer: "Rewritten" } },
      }),
    ).rejects.toThrow(/immutable/);
    await expect(db.assessmentSubmission.delete({ where: { id: submission.id } })).rejects.toThrow(
      /immutable/,
    );

    await db.$executeRaw`UPDATE "assessment_submissions"
      SET "responses" = NULL, "content_erased_at" = now() WHERE "id" = ${submission.id}::uuid`;
    const erased = await db.assessmentSubmission.findUniqueOrThrow({ where: { id: submission.id } });
    expect(erased.responses).toBeNull();
  });

  it("only accepts submission files owned by the candidate", async () => {
    const { candidate, published } = await setup();
    const stranger = await createUser(db);
    const db_file = (ownerUserId: string) =>
      db.fileAsset.create({
        data: {
          ownerUserId,
          purpose: "SUBMISSION",
          bucket: "test",
          objectKey: crypto.randomUUID(),
          mimeType: "application/pdf",
          sizeBytes: 10,
        },
      });
    const { submission } = await createSubmittedAttempt(db, published, candidate.id);

    await expect(
      db.assessmentSubmissionFile.create({
        data: { submissionId: submission.id, fileId: (await db_file(stranger.id)).id },
      }),
    ).rejects.toThrow(/does not belong/);
    await expect(
      db.assessmentSubmissionFile.create({
        data: { submissionId: submission.id, fileId: (await db_file(candidate.id)).id },
      }),
    ).resolves.toBeDefined();
  });

  it("links an evaluation to criterion scores, evidence and its exact rubric", async () => {
    const { candidate, skill } = await setup();
    const { evaluation, published } = await createCompletedEvaluation(db, {
      skillId: skill.id,
      candidateUserId: candidate.id,
    });

    const found = await db.evaluation.findUniqueOrThrow({
      where: { id: evaluation.id },
      include: { criterionScores: { include: { evidence: true, criterion: true } } },
    });
    expect(found.rubricVersionId).toBe(published.rubric.id);
    expect(found.criterionScores[0]?.criterion.rubricVersionId).toBe(published.rubric.id);
    expect(found.criterionScores[0]?.evidence[0]?.excerpt).toBe("My work.");
  });

  it("rejects an evaluation under a different rubric or submission", async () => {
    const { candidate, skill, published } = await setup();
    const other = await createPublishedAssessment(db, { skillId: skill.id });
    const mine = await createSubmittedAttempt(db, published, candidate.id);
    const theirs = await createSubmittedAttempt(db, other, candidate.id);
    const base = { evaluatorType: "AI", provider: "p", modelName: "m" } as const;

    await expect(
      db.evaluation.create({
        data: {
          ...base,
          attemptId: mine.attempt.id,
          submissionId: mine.submission.id,
          rubricVersionId: other.rubric.id,
        },
      }),
    ).rejects.toThrow();
    await expect(
      db.evaluation.create({
        data: {
          ...base,
          attemptId: mine.attempt.id,
          submissionId: theirs.submission.id,
          rubricVersionId: published.rubric.id,
        },
      }),
    ).rejects.toThrow();
  });

  it("rejects a criterion from a different rubric", async () => {
    const { candidate, skill, published } = await setup();
    const other = await createPublishedAssessment(db, { skillId: skill.id });
    const submitted = await createSubmittedAttempt(db, published, candidate.id);
    const pending = await createPendingEvaluation(db, submitted, published.rubric.id);

    await expect(
      db.evaluationCriterionScore.create({
        data: {
          evaluationId: pending.id,
          rubricVersionId: published.rubric.id,
          criterionId: other.criteria[0]?.id ?? "",
          score: 50,
        },
      }),
    ).rejects.toThrow();
  });

  it.each([-1, 100.01, 1000])("rejects %s as a score", async (value) => {
    const { candidate, published } = await setup();
    const submitted = await createSubmittedAttempt(db, published, candidate.id);
    const pending = await createPendingEvaluation(db, submitted, published.rubric.id);

    await expect(
      db.evaluationCriterionScore.create({
        data: {
          evaluationId: pending.id,
          rubricVersionId: published.rubric.id,
          criterionId: published.criteria[0]?.id ?? "",
          score: value,
        },
      }),
    ).rejects.toThrow();
    await expect(
      db.evaluation.update({ where: { id: pending.id }, data: { overallScore: value } }),
    ).rejects.toThrow();
  });

  it.each([0, 100, 72.5])("accepts %s as a score", async (value) => {
    const { candidate, skill } = await setup();
    const { evaluation } = await createCompletedEvaluation(db, {
      skillId: skill.id,
      candidateUserId: candidate.id,
      score: value,
    });
    expect(evaluation.overallScore?.toNumber()).toBe(value);
  });

  it("requires criterion scores and a result before completion", async () => {
    const { candidate, published } = await setup();
    const submitted = await createSubmittedAttempt(db, published, candidate.id);
    const pending = await createPendingEvaluation(db, submitted, published.rubric.id);

    await expect(
      db.evaluation.update({
        where: { id: pending.id },
        data: { status: "COMPLETED", overallScore: 80, completedAt: new Date() },
      }),
    ).rejects.toThrow(/criterion scores/);
    await expect(
      db.evaluation.update({ where: { id: pending.id }, data: { status: "COMPLETED" } }),
    ).rejects.toThrow();
  });

  it("requires evaluator details", async () => {
    const { candidate, published } = await setup();
    const { attempt, submission } = await createSubmittedAttempt(db, published, candidate.id);
    const data = {
      attemptId: attempt.id,
      submissionId: submission.id,
      rubricVersionId: published.rubric.id,
    };
    await expect(db.evaluation.create({ data: { ...data, evaluatorType: "AI" } })).rejects.toThrow();
    await expect(
      db.evaluation.create({ data: { ...data, evaluatorType: "HUMAN" } }),
    ).rejects.toThrow();
  });

  it("never overwrites a completed evaluation, and corrects by superseding", async () => {
    const { candidate, skill } = await setup();
    const { evaluation, criterionScore, published, submitted } = await createCompletedEvaluation(
      db,
      { skillId: skill.id, candidateUserId: candidate.id },
    );

    await expect(
      db.evaluation.update({ where: { id: evaluation.id }, data: { overallScore: 99 } }),
    ).rejects.toThrow(/immutable/);
    await expect(
      db.evaluationCriterionScore.update({
        where: { id: criterionScore.id },
        data: { score: 99 },
      }),
    ).rejects.toThrow(/immutable/);
    await expect(db.evaluation.delete({ where: { id: evaluation.id } })).rejects.toThrow(
      /immutable/,
    );

    const correction = await db.evaluation.create({
      data: {
        attemptId: submitted.attempt.id,
        submissionId: submitted.submission.id,
        rubricVersionId: published.rubric.id,
        evaluatorType: "HUMAN",
        evaluatorUserId: candidate.id,
        supersedesEvaluationId: evaluation.id,
      },
    });
    const original = await db.evaluation.findUniqueOrThrow({
      where: { id: evaluation.id },
      include: { supersededBy: true },
    });
    expect(original.overallScore?.toNumber()).toBe(80);
    expect(original.supersededBy?.id).toBe(correction.id);
  });

  it("records human reviews append-only and updates review status", async () => {
    const { candidate, skill } = await setup();
    const reviewer = await createUser(db);
    const { evaluation } = await createCompletedEvaluation(db, {
      skillId: skill.id,
      candidateUserId: candidate.id,
    });

    const review = await db.evaluationReview.create({
      data: { evaluationId: evaluation.id, reviewerId: reviewer.id, decision: "APPROVED" },
    });
    const found = await db.evaluation.findUniqueOrThrow({ where: { id: evaluation.id } });
    expect(found.reviewStatus).toBe("APPROVED");

    await expect(
      db.evaluationReview.update({ where: { id: review.id }, data: { notes: "Edited" } }),
    ).rejects.toThrow(/immutable/);
  });

  it("stores AI job usage, and rejects duplicates and negative values", async () => {
    const data = { type: "SUBMISSION_EVALUATION", provider: "gemini", modelName: "test" } as const;
    const idempotencyKey = crypto.randomUUID();
    const job = await db.aIJob.create({
      data: { ...data, idempotencyKey, inputTokens: 100, outputTokens: 50, estimatedCost: 0.00125 },
    });
    expect(job.estimatedCost?.toNumber()).toBe(0.00125);
    await expect(db.aIJob.create({ data: { ...data, idempotencyKey } })).rejects.toThrow();
    await expect(db.aIJob.create({ data: { ...data, inputTokens: -1 } })).rejects.toThrow();
  });
});
