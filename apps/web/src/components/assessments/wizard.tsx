"use client";

import { ASSESSMENT_LIMITS, type AssessmentDifficulty, type AssessmentLanguage, type AssessmentTypeName } from "@skillprove/shared";
import { fieldErrors, generationRequestSchema, manualAssessmentInputSchema } from "@skillprove/validation";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useI18n } from "../../lib/i18n";
import { errorMessage, fieldErrorsOf, fieldMessage, useApiClient } from "../../lib/use-api";
import { Alert, Badge, Button, Card, CardContent, CardHeader, Input, Progress, Radio, RadioGroup, Select, Textarea } from "../ui";
import { LoadError } from "./assessment-list";
import { useCompany, useOptions } from "./shared";
import { SkillPicker, type PickedSkill } from "./skill-picker";

type Method = "ai" | "manual";
const STEP_KEYS = ["basic", "skills", "level", "size", "method", "review", "publish"] as const;
/** Steps 1-5 happen here. Steps 6 and 7 (review and edit, save or publish) continue in the editor. */
const WIZARD_STEPS = 5;

interface Draft {
  title: string;
  description: string;
  language: AssessmentLanguage;
  skills: PickedSkill[];
  levels: Record<string, AssessmentDifficulty>;
  difficulty: AssessmentDifficulty;
  assessmentType: AssessmentTypeName;
  durationMinutes: string;
  questionCount: string;
  additional: string;
  method: Method;
}

export function AssessmentWizard() {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const router = useRouter();
  const company = useCompany();
  const options = useOptions();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    title: "",
    description: "",
    language: locale,
    skills: [],
    levels: {},
    difficulty: "INTERMEDIATE",
    assessmentType: "KNOWLEDGE",
    durationMinutes: "30",
    questionCount: "8",
    additional: "",
    method: "ai",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  // One key per wizard, so a double click or a retry after a lost response reuses the same job.
  const idempotencyKey = useRef(crypto.randomUUID());
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const generationInput = () => ({
    title: draft.title,
    description: draft.description,
    skills: draft.skills.map((s) => ({ skillId: s.id, expectedLevel: draft.levels[s.id] ?? draft.difficulty })),
    difficulty: draft.difficulty,
    assessmentType: draft.assessmentType,
    questionCount: Number(draft.questionCount),
    durationMinutes: Number(draft.durationMinutes),
    language: draft.language,
    additionalInstructions: draft.additional,
  });
  const manualInput = () => ({
    title: draft.title,
    description: draft.description,
    instructions: "",
    skillIds: draft.skills.map((s) => s.id),
    difficulty: draft.difficulty,
    assessmentType: draft.assessmentType,
    durationMinutes: Number(draft.durationMinutes),
    language: draft.language,
  });

  const start = useMutation({
    mutationFn: async () => {
      if (!company.companyId) throw new Error("no company");
      if (draft.method === "ai") {
        const input = generationRequestSchema.parse(generationInput());
        const { job } = await client.startGeneration(company.companyId, input, idempotencyKey.current);
        return `/assessments/generation/${job.id}`;
      }
      const input = manualAssessmentInputSchema.parse(manualInput());
      const created = await client.createAssessment(company.companyId, input);
      return `/assessments/${created.id}`;
    },
    onSuccess: (path) => router.push(path),
  });

  /** Checks the current step with the same schemas the API uses. Returns true when it can continue. */
  function validate(current: number): boolean {
    const found: Record<string, string> = {};
    const request = draft.method === "ai" ? generationRequestSchema.safeParse(generationInput()) : manualAssessmentInputSchema.safeParse(manualInput());
    if (!request.success) Object.assign(found, fieldErrors(request.error));
    const forStep: Record<number, string[]> = {
      0: draft.method === "manual" ? ["title"] : [],
      1: ["skills", "skillIds"],
      2: ["difficulty", "assessmentType"],
      3: ["durationMinutes", "questionCount"],
      4: [],
      5: Object.keys(found),
    };
    const relevant = Object.fromEntries(Object.entries(found).filter(([field]) => forStep[current]?.includes(field)));
    setErrors(relevant);
    return Object.keys(relevant).length === 0;
  }
  const serverErrors = fieldErrorsOf(start.error);
  const fieldError = (name: string) => fieldMessage(t, errors[name] ?? serverErrors[name]);

  if (company.query.isError) return <LoadError message={errorMessage(t, company.query.error)} onRetry={() => void company.query.refetch()} />;
  if (company.query.isSuccess && !company.companyId) return <Alert tone="warning">{t("assessments.noCompany")}</Alert>;
  if (company.query.isSuccess && !company.canAuthor) return <Alert tone="warning">{t("assessments.noPermission")}</Alert>;

  const last = step === WIZARD_STEPS;
  const next = () => {
    if (validate(step)) setStep(step + 1);
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6" data-testid="assessment-wizard">
      <nav aria-label={t("assessments.wizard.title")}>
        <p className="type-label text-muted-foreground" aria-live="polite">
          {t("assessments.wizard.step", { current: Math.min(step + 1, STEP_KEYS.length), total: STEP_KEYS.length })}
        </p>
        <Progress value={((step + 1) / STEP_KEYS.length) * 100} label={t("assessments.wizard.title")} className="mt-2" />
        <ol className="mt-3 flex flex-wrap gap-2">
          {STEP_KEYS.map((key, index) => (
            <li key={key}>
              <Badge tone={index === step ? "info" : index < step ? "success" : "neutral"} className={index === step ? "" : "opacity-80"}>
                <span aria-current={index === step ? "step" : undefined}>
                  {index + 1}. {t(`assessments.wizard.steps.${key}`)}
                </span>
              </Badge>
            </li>
          ))}
        </ol>
      </nav>

      <Card>
        <CardHeader title={t(`assessments.wizard.steps.${STEP_KEYS[step] ?? "review"}`)} />
        <CardContent className="flex flex-col gap-4 pt-4">
          {step === 0 && (
            <>
              <Input
                label={t("assessments.wizard.assessmentTitle")}
                helperText={draft.method === "ai" ? t("assessments.wizard.assessmentTitleHint") : undefined}
                value={draft.title}
                onChange={(e) => set("title", e.target.value)}
                maxLength={ASSESSMENT_LIMITS.titleMax}
                error={fieldError("title")}
              />
              <Textarea label={t("assessments.wizard.assessmentDescription")} value={draft.description} onChange={(e) => set("description", e.target.value)} maxLength={ASSESSMENT_LIMITS.descriptionMax} />
              <Select label={t("assessments.wizard.language")} value={draft.language} onChange={(e) => set("language", e.target.value as AssessmentLanguage)} options={options.language} />
            </>
          )}

          {step === 1 && (
            <>
              <SkillPicker value={draft.skills} onChange={(skills) => set("skills", skills)} error={fieldError("skills") ?? fieldError("skillIds")} />
              {draft.method === "ai" &&
                draft.skills.map((skill) => (
                  <Select
                    key={skill.id}
                    label={t("assessments.wizard.expectedLevel", { name: skill.name })}
                    value={draft.levels[skill.id] ?? draft.difficulty}
                    onChange={(e) => set("levels", { ...draft.levels, [skill.id]: e.target.value as AssessmentDifficulty })}
                    options={options.difficulty}
                  />
                ))}
            </>
          )}

          {step === 2 && (
            <>
              <Select label={t("assessments.wizard.difficulty")} value={draft.difficulty} onChange={(e) => set("difficulty", e.target.value as AssessmentDifficulty)} options={options.difficulty} error={fieldError("difficulty")} />
              <Select label={t("assessments.wizard.type")} value={draft.assessmentType} onChange={(e) => set("assessmentType", e.target.value as AssessmentTypeName)} options={options.type} helperText={t(`assessments.typeHelp.${draft.assessmentType}`)} error={fieldError("assessmentType")} />
            </>
          )}

          {step === 3 && (
            <>
              <Input label={t("assessments.wizard.duration")} type="number" inputMode="numeric" min={ASSESSMENT_LIMITS.minDurationMinutes} max={ASSESSMENT_LIMITS.maxDurationMinutes} value={draft.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} error={fieldError("durationMinutes")} />
              <Input label={t("assessments.wizard.questionCount")} type="number" inputMode="numeric" min={ASSESSMENT_LIMITS.minQuestions} max={ASSESSMENT_LIMITS.maxQuestions} value={draft.questionCount} onChange={(e) => set("questionCount", e.target.value)} error={fieldError("questionCount")} disabled={draft.method === "manual"} />
            </>
          )}

          {step === 4 && (
            <>
              <RadioGroup legend={t("assessments.wizard.steps.method")}>
                <Radio name="method" label={t("assessments.wizard.methodAi")} description={t("assessments.wizard.methodAiHelp")} checked={draft.method === "ai"} onChange={() => set("method", "ai")} />
                <Radio name="method" label={t("assessments.wizard.methodManual")} description={t("assessments.wizard.methodManualHelp")} checked={draft.method === "manual"} onChange={() => set("method", "manual")} />
              </RadioGroup>
              {draft.method === "ai" && (
                <Textarea
                  label={t("assessments.wizard.additional")}
                  helperText={t("assessments.wizard.additionalHint")}
                  value={draft.additional}
                  onChange={(e) => set("additional", e.target.value)}
                  maxLength={ASSESSMENT_LIMITS.additionalInstructionsMax}
                  error={fieldError("additionalInstructions")}
                />
              )}
            </>
          )}

          {step === 5 && (
            <>
              <p className="type-body-small text-muted-foreground">{t("assessments.wizard.reviewHelp")}</p>
              <dl className="grid gap-2 sm:grid-cols-2" data-testid="wizard-summary">
                <Summary label={t("assessments.wizard.assessmentTitle")} value={draft.title || "—"} />
                <Summary label={t("assessments.wizard.language")} value={t(`assessments.language.${draft.language}`)} />
                <Summary label={t("assessments.wizard.steps.skills")} value={draft.skills.map((s) => s.name).join(", ")} />
                <Summary label={t("assessments.wizard.difficulty")} value={t(`assessments.difficulty.${draft.difficulty}`)} />
                <Summary label={t("assessments.wizard.type")} value={t(`assessments.type.${draft.assessmentType}`)} />
                <Summary label={t("assessments.wizard.duration")} value={draft.durationMinutes} />
                <Summary label={t("assessments.wizard.questionCount")} value={draft.method === "ai" ? draft.questionCount : "—"} />
                <Summary label={t("assessments.wizard.steps.method")} value={draft.method === "ai" ? t("assessments.wizard.methodAi") : t("assessments.wizard.methodManual")} />
              </dl>
              {draft.method === "ai" && <Alert tone="info">{t("assessments.wizard.aiNotice")}</Alert>}
            </>
          )}

          {start.isError && !Object.keys(serverErrors).length && <Alert tone="error">{errorMessage(t, start.error)}</Alert>}

          <div className="flex justify-between gap-3 pt-2">
            <Button type="button" variant="outline" disabled={step === 0 || start.isPending} onClick={() => setStep(step - 1)}>
              {t("assessments.wizard.back")}
            </Button>
            {last ? (
              <Button
                type="button"
                loading={start.isPending}
                onClick={() => {
                  if (validate(WIZARD_STEPS)) start.mutate();
                }}
              >
                {t("assessments.wizard.start")}
              </Button>
            ) : (
              <Button type="button" onClick={next}>
                {t("assessments.wizard.next")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md bg-muted/50 p-3">
      <dt className="type-caption text-muted-foreground">{label}</dt>
      <dd className="type-body-small text-foreground">{value}</dd>
    </div>
  );
}
