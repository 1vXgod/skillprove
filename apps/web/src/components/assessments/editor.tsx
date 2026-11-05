"use client";

import { ASSESSMENT_LIMITS, type AssessmentDifficulty, type AssessmentLanguage, type AssessmentTypeName } from "@skillprove/shared";
import { assessmentUpdateSchema, fieldErrors, type AssessmentDetail, type Question } from "@skillprove/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useI18n } from "../../lib/i18n";
import { errorMessage, fieldErrorsOf, fieldMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { Alert, AlertDialog, Badge, Button, buttonClasses, Card, CardContent, EmptyState, Input, Select, Skeleton, Tabs, Textarea } from "../ui";
import { LoadError } from "./assessment-list";
import { CandidatePreview, VersionHistory } from "./preview-and-versions";
import { QuestionDialog } from "./question-form";
import { RubricEditor } from "./rubric-editor";
import { failureReasonKey, statusTone, useCompany, useOptions } from "./shared";
import { SkillPicker } from "./skill-picker";

/** The assessment editor: details, questions, rubric, candidate preview and version history. */
export function AssessmentEditor({ assessmentId }: { assessmentId: string }) {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const company = useCompany();
  const [confirm, setConfirm] = useState<"publish" | "delete" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const query = useQuery({ queryKey: queryKeys.assessment(assessmentId, locale), queryFn: () => client.getAssessment(assessmentId), retry: false });
  const put = (data: AssessmentDetail) => queryClient.setQueryData(queryKeys.assessment(assessmentId, locale), data);

  const newDraft = useMutation({ mutationFn: () => client.createDraft(assessmentId), onSuccess: put });
  const publish = useMutation({
    mutationFn: () => client.publishAssessment(assessmentId),
    onSuccess: async () => {
      setNotice(t("assessments.editor.published"));
      await queryClient.invalidateQueries({ queryKey: ["assessment", assessmentId] });
      await queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
  const remove = useMutation({
    mutationFn: () => client.deleteAssessment(assessmentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["assessments"] });
      router.push("/assessments");
    },
  });

  if (query.isPending) {
    return (
      <div aria-busy="true" aria-label={t("assessments.editor.loading")} className="flex flex-col gap-4">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (query.isError) return <LoadError message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} />;

  const detail = query.data;
  const isDraft = detail.version.status === "DRAFT";
  const editable = isDraft && company.canAuthor;
  const actionError = publish.error ?? newDraft.error ?? remove.error;

  return (
    <div className="flex flex-col gap-5" data-testid="assessment-editor" data-status={detail.version.status}>
      <Link href="/assessments" className="type-label text-muted-foreground hover:underline">
        ← {t("assessments.editor.back")}
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="type-h2 text-foreground">{detail.title}</h2>
          <div className="flex flex-wrap gap-2">
            <Badge tone={statusTone[detail.version.status]}>{t(`assessments.status.${detail.version.status}`)}</Badge>
            <Badge>{t("assessments.list.version", { version: detail.version.version })}</Badge>
            <Badge>{t(`assessments.source.${detail.creationSource}`)}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {company.canAuthor && !isDraft && (
            <Button variant="outline" loading={newDraft.isPending} onClick={() => newDraft.mutate()}>
              {t("assessments.editor.editNewDraft")}
            </Button>
          )}
          {editable && (
            <Button disabled={detail.publishIssues.length > 0} onClick={() => setConfirm("publish")}>
              {t("assessments.editor.publish")}
            </Button>
          )}
          {company.canDelete && (
            <Button variant="outline" onClick={() => setConfirm("delete")}>
              {t("assessments.editor.delete")}
            </Button>
          )}
        </div>
      </div>

      {notice && <Alert tone="success">{notice}</Alert>}
      {actionError && <Alert tone="error">{errorMessage(t, actionError)}</Alert>}
      {!isDraft && <Alert tone="info">{t("assessments.editor.readOnly")}</Alert>}
      {isDraft && (
        <Alert tone={detail.publishIssues.length ? "warning" : "info"} title={detail.publishIssues.length ? t("assessments.editor.cannotPublish") : undefined}>
          {detail.publishIssues.length > 0 ? (
            <ul className="list-disc pl-5" data-testid="publish-issues">
              {detail.publishIssues.map((issue) => (
                <li key={issue}>{t(`assessments.issues.${issue as "titleRequired"}`)}</li>
              ))}
            </ul>
          ) : (
            t("assessments.editor.reviewRequired")
          )}
        </Alert>
      )}

      <Tabs
        label={t("assessments.editor.title")}
        defaultValue="details"
        items={[
          { value: "details", label: t("assessments.editor.details"), content: <DetailsForm key={detail.version.updatedAt} detail={detail} editable={editable} /> },
          { value: "questions", label: `${t("assessments.editor.questions")} (${detail.questions.length})`, content: <QuestionList detail={detail} editable={editable} /> },
          { value: "rubric", label: t("assessments.editor.rubric"), content: <RubricEditor key={detail.version.updatedAt} detail={detail} editable={editable} /> },
          { value: "preview", label: t("assessments.editor.preview"), content: <CandidatePreview detail={detail} /> },
          { value: "versions", label: t("assessments.editor.versions"), content: <VersionHistory detail={detail} canAuthor={company.canAuthor} /> },
        ]}
      />

      <AlertDialog
        open={confirm === "publish"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t("assessments.editor.publish")}
        description={t("assessments.editor.publishConfirm", { version: detail.version.version })}
        confirmLabel={t("assessments.editor.publish")}
        onConfirm={() => {
          setConfirm(null);
          publish.mutate();
        }}
      />
      <AlertDialog
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t("assessments.editor.delete")}
        description={t("assessments.editor.deleteConfirm")}
        confirmLabel={t("assessments.editor.delete")}
        destructive
        onConfirm={() => {
          setConfirm(null);
          remove.mutate();
        }}
      />
    </div>
  );
}

function DetailsForm({ detail, editable }: { detail: AssessmentDetail; editable: boolean }) {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const options = useOptions();
  const [values, setValues] = useState({
    title: detail.title,
    description: detail.description ?? "",
    instructions: detail.instructions ?? "",
    language: detail.language as AssessmentLanguage,
    difficulty: detail.difficulty as AssessmentDifficulty,
    assessmentType: (detail.assessmentType ?? "KNOWLEDGE") as AssessmentTypeName,
    durationMinutes: String(detail.durationMinutes ?? 30),
    skills: detail.skills.map((s) => ({ id: s.skillId, name: s.name })),
  });
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => setValues((v) => ({ ...v, [key]: value }));

  const save = useMutation({
    mutationFn: () => {
      const parsed = assessmentUpdateSchema.safeParse({
        title: values.title,
        description: values.description,
        instructions: values.instructions,
        language: values.language,
        difficulty: values.difficulty,
        assessmentType: values.assessmentType,
        durationMinutes: Number(values.durationMinutes),
        skillIds: values.skills.map((s) => s.id),
        expectedUpdatedAt: detail.version.updatedAt,
      });
      if (!parsed.success) {
        setLocalErrors(fieldErrors(parsed.error));
        throw new Error("invalid");
      }
      setLocalErrors({});
      return client.updateAssessment(detail.id, parsed.data);
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData(queryKeys.assessment(detail.id, locale), updated);
      await queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
  const errors = { ...fieldErrorsOf(save.error), ...localErrors };
  const err = (name: string) => fieldMessage(t, errors[name]);

  return (
    <form
      noValidate
      className="flex max-w-3xl flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <Input label={t("assessments.wizard.assessmentTitle")} value={values.title} disabled={!editable} onChange={(e) => set("title", e.target.value)} maxLength={ASSESSMENT_LIMITS.titleMax} error={err("title")} />
      <Textarea label={t("assessments.wizard.assessmentDescription")} value={values.description} disabled={!editable} onChange={(e) => set("description", e.target.value)} maxLength={ASSESSMENT_LIMITS.descriptionMax} error={err("description")} />
      <Textarea label={t("assessments.editor.instructions")} rows={6} value={values.instructions} disabled={!editable} onChange={(e) => set("instructions", e.target.value)} maxLength={ASSESSMENT_LIMITS.instructionsMax} error={err("instructions")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label={t("assessments.wizard.language")} value={values.language} disabled={!editable} onChange={(e) => set("language", e.target.value as AssessmentLanguage)} options={options.language} />
        <Select label={t("assessments.wizard.difficulty")} value={values.difficulty} disabled={!editable} onChange={(e) => set("difficulty", e.target.value as AssessmentDifficulty)} options={options.difficulty} />
        <Select label={t("assessments.wizard.type")} value={values.assessmentType} disabled={!editable} onChange={(e) => set("assessmentType", e.target.value as AssessmentTypeName)} options={options.type} />
        <Input label={t("assessments.wizard.duration")} type="number" inputMode="numeric" value={values.durationMinutes} disabled={!editable} onChange={(e) => set("durationMinutes", e.target.value)} error={err("durationMinutes")} />
      </div>
      {editable ? (
        <SkillPicker value={values.skills} onChange={(skills) => set("skills", skills)} error={err("skillIds")} />
      ) : (
        <div className="flex flex-wrap gap-2">
          {values.skills.map((s) => (
            <Badge key={s.id} tone="info">
              {s.name}
            </Badge>
          ))}
        </div>
      )}
      {save.isError && Object.keys(errors).length === 0 && <Alert tone="error">{errorMessage(t, save.error)}</Alert>}
      {save.isSuccess && <Alert tone="success">{t("assessments.editor.saved")}</Alert>}
      {editable && (
        <Button type="submit" className="self-start" loading={save.isPending}>
          {t("assessments.editor.saveDraft")}
        </Button>
      )}
    </form>
  );
}

function QuestionList({ detail, editable }: { detail: AssessmentDetail; editable: boolean }) {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<{ question: Question | null } | null>(null);
  const [removing, setRemoving] = useState<Question | null>(null);

  const apply = (updated: AssessmentDetail) => queryClient.setQueryData(queryKeys.assessment(detail.id, locale), updated);
  const reorder = useMutation({ mutationFn: (ids: string[]) => client.reorderQuestions(detail.id, ids), onSuccess: apply });
  const removeQuestion = useMutation({ mutationFn: (id: string) => client.removeQuestion(detail.id, id), onSuccess: apply });

  const move = (index: number, delta: -1 | 1) => {
    const ids = detail.questions.map((q) => q.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target] as string, ids[index] as string];
    reorder.mutate(ids);
  };
  const skillName = (id: string) => detail.skills.find((s) => s.skillId === id)?.name ?? "";

  return (
    <div className="flex flex-col gap-4" data-testid="question-list">
      {(reorder.isError || removeQuestion.isError) && <Alert tone="error">{errorMessage(t, reorder.error ?? removeQuestion.error)}</Alert>}
      {editable && (
        <Button className="self-start" onClick={() => setDialog({ question: null })} disabled={detail.questions.length >= ASSESSMENT_LIMITS.maxQuestions}>
          {t("assessments.question.add")}
        </Button>
      )}
      {detail.questions.length === 0 ? (
        <EmptyState title={t("assessments.question.empty")} />
      ) : (
        <ol className="flex flex-col gap-3">
          {detail.questions.map((q, index) => (
            <li key={q.id}>
              <Card>
                <CardContent className="flex flex-col gap-2 pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="type-label">{t("assessments.question.number", { position: q.position })}</span>
                    <Badge>{t(`assessments.kind.${q.kind}`)}</Badge>
                    <Badge tone="info">{skillName(q.skillId)}</Badge>
                    <Badge>{t(`assessments.difficulty.${q.difficulty}`)}</Badge>
                  </div>
                  <p className="line-clamp-3 whitespace-pre-line text-foreground">{"prompt" in q ? q.prompt : "task" in q ? q.task : q.description}</p>
                  {editable && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setDialog({ question: q })}>
                        {t("assessments.question.edit")}
                      </Button>
                      <Button size="sm" variant="outline" aria-label={t("assessments.question.moveUp", { position: q.position })} disabled={index === 0 || reorder.isPending} onClick={() => move(index, -1)}>
                        ↑
                      </Button>
                      <Button size="sm" variant="outline" aria-label={t("assessments.question.moveDown", { position: q.position })} disabled={index === detail.questions.length - 1 || reorder.isPending} onClick={() => move(index, 1)}>
                        ↓
                      </Button>
                      <RegenerateButton assessmentId={detail.id} questionId={q.id} />
                      <Button size="sm" variant="outline" onClick={() => setRemoving(q)}>
                        {t("assessments.question.remove")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
      {dialog && <QuestionDialog detail={detail} question={dialog.question} onClose={() => setDialog(null)} />}
      <AlertDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t("assessments.question.remove")}
        description={t("assessments.question.removeConfirm")}
        confirmLabel={t("assessments.question.remove")}
        destructive
        onConfirm={() => {
          if (removing) removeQuestion.mutate(removing.id);
          setRemoving(null);
        }}
      />
    </div>
  );
}

class JobFailed extends Error {
  constructor(readonly code: string | null) {
    super("job failed");
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Starts a regeneration job for one question and follows it by polling until it finishes. */
function RegenerateButton({ assessmentId, questionId }: { assessmentId: string; questionId: string }) {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const key = useRef(crypto.randomUUID());

  const regenerate = useMutation({
    mutationFn: async () => {
      const { job } = await client.regenerateQuestion(assessmentId, questionId, null, key.current);
      let current = job;
      while (current.status === "QUEUED" || current.status === "RUNNING") {
        await sleep(2000);
        current = await client.getJob(job.id);
      }
      if (current.status !== "SUCCEEDED") throw new JobFailed(current.errorCode);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.assessment(assessmentId, locale) });
    },
    // A new attempt after a finished job needs a fresh key; a lost response can still reuse the old one.
    onSettled: () => {
      key.current = crypto.randomUUID();
    },
  });

  return (
    <>
      <Button size="sm" variant="outline" loading={regenerate.isPending} onClick={() => regenerate.mutate()}>
        {regenerate.isPending ? t("assessments.question.regenerating") : t("assessments.question.regenerate")}
      </Button>
      {regenerate.isError && (
        <span role="alert" className="self-center type-caption text-destructive">
          {regenerate.error instanceof JobFailed ? t(failureReasonKey(regenerate.error.code)) : errorMessage(t, regenerate.error)}
        </span>
      )}
    </>
  );
}

export { buttonClasses };
