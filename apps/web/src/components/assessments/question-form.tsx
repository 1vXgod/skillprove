"use client";

import { ASSESSMENT_LIMITS, type AssessmentDifficulty, type QuestionKind } from "@skillprove/shared";
import { fieldErrors, questionContentSchema, type AssessmentDetail, type Question, type QuestionContent } from "@skillprove/validation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState, type FormEvent } from "react";
import { useI18n } from "../../lib/i18n";
import { errorMessage, fieldErrorsOf, fieldMessage, useApiClient } from "../../lib/use-api";
import { Alert, Button, Checkbox, Dialog, Input, Radio, RadioGroup, Select, Textarea } from "../ui";
import { joinLines, splitLines, useOptions } from "./shared";

interface Choice {
  id: string;
  text: string;
}

/** Every field any kind can use, as text, so one form serves all six kinds. */
interface Form {
  kind: QuestionKind;
  skillId: string;
  difficulty: AssessmentDifficulty;
  estimatedMinutes: string;
  prompt: string;
  scenario: string;
  task: string;
  description: string;
  choices: Choice[];
  correctIds: string[];
  trueFalse: "true" | "false";
  explanation: string;
  expectedCriteria: string;
  requirements: string;
  deliverables: string;
  evaluationCriteria: string;
}

const LETTERS = "ABCDEFGH";

function emptyForm(detail: AssessmentDetail): Form {
  return {
    kind: "multiple_choice",
    skillId: detail.skills[0]?.skillId ?? "",
    difficulty: (detail.difficulty as AssessmentDifficulty) ?? "INTERMEDIATE",
    estimatedMinutes: "3",
    prompt: "",
    scenario: "",
    task: "",
    description: "",
    choices: [
      { id: "A", text: "" },
      { id: "B", text: "" },
    ],
    correctIds: [],
    trueFalse: "true",
    explanation: "",
    expectedCriteria: "",
    requirements: "",
    deliverables: "",
    evaluationCriteria: "",
  };
}

function formFrom(q: Question, detail: AssessmentDetail): Form {
  const base = { ...emptyForm(detail), kind: q.kind, skillId: q.skillId, difficulty: q.difficulty, estimatedMinutes: String(q.estimatedMinutes) };
  switch (q.kind) {
    case "multiple_choice":
      return { ...base, prompt: q.prompt, choices: q.choices, correctIds: [q.correctChoiceId], explanation: q.explanation };
    case "multiple_select":
      return { ...base, prompt: q.prompt, choices: q.choices, correctIds: q.correctChoiceIds, explanation: q.explanation };
    case "true_false":
      return { ...base, prompt: q.prompt, trueFalse: q.correct ? "true" : "false", explanation: q.explanation };
    case "short_answer":
      return { ...base, prompt: q.prompt, expectedCriteria: joinLines(q.expectedCriteria) };
    case "scenario":
      return { ...base, scenario: q.scenario, task: q.task, expectedCriteria: joinLines(q.expectedCriteria) };
    case "practical_task":
      return {
        ...base,
        description: q.description,
        requirements: joinLines(q.requirements),
        deliverables: joinLines(q.deliverables),
        evaluationCriteria: joinLines(q.evaluationCriteria),
      };
  }
}

function toInput(f: Form): unknown {
  const common = { kind: f.kind, skillId: f.skillId, difficulty: f.difficulty, estimatedMinutes: Number(f.estimatedMinutes) };
  switch (f.kind) {
    case "multiple_choice":
      return { ...common, prompt: f.prompt, choices: f.choices, correctChoiceId: f.correctIds[0] ?? "", explanation: f.explanation };
    case "multiple_select":
      return { ...common, prompt: f.prompt, choices: f.choices, correctChoiceIds: f.correctIds, explanation: f.explanation };
    case "true_false":
      return { ...common, prompt: f.prompt, correct: f.trueFalse === "true", explanation: f.explanation };
    case "short_answer":
      return { ...common, prompt: f.prompt, expectedCriteria: splitLines(f.expectedCriteria) };
    case "scenario":
      return { ...common, scenario: f.scenario, task: f.task, expectedCriteria: splitLines(f.expectedCriteria) };
    case "practical_task":
      return {
        ...common,
        description: f.description,
        requirements: splitLines(f.requirements),
        deliverables: splitLines(f.deliverables),
        evaluationCriteria: splitLines(f.evaluationCriteria),
      };
  }
}

/** Maps API field names to the form's inputs, for errors on nested or renamed fields. */
const FIELD_ALIASES: Record<string, string> = { correctChoiceId: "choices", correctChoiceIds: "choices", correct: "trueFalse" };

export function QuestionDialog({ detail, question, onClose }: { detail: AssessmentDetail; question: Question | null; onClose: () => void }) {
  const { t } = useI18n();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const options = useOptions();
  const formId = useId();
  const [form, setForm] = useState<Form>(() => (question ? formFrom(question, detail) : emptyForm(detail)));
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = useMutation({
    mutationFn: async (content: QuestionContent) =>
      question ? client.updateQuestion(detail.id, question.id, content) : client.addQuestion(detail.id, content),
    onSuccess: async (updated) => {
      queryClient.setQueriesData({ queryKey: ["assessment", detail.id] }, updated);
      await queryClient.invalidateQueries({ queryKey: ["assessments"] });
      onClose();
    },
  });
  const errors = { ...fieldErrorsOf(save.error), ...localErrors };
  const err = (name: string) => {
    const key = Object.entries(errors).find(([field]) => field === name || FIELD_ALIASES[field] === name)?.[1];
    return fieldMessage(t, key);
  };

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = questionContentSchema.safeParse(toInput(form));
    if (!parsed.success) {
      setLocalErrors(fieldErrors(parsed.error));
      return;
    }
    setLocalErrors({});
    save.mutate(parsed.data);
  }

  const isChoice = form.kind === "multiple_choice" || form.kind === "multiple_select";
  const objective = isChoice || form.kind === "true_false";
  const skillOptions = detail.skills.map((s) => ({ value: s.skillId, label: s.name || s.skillId.slice(0, 8) }));

  function toggleCorrect(id: string) {
    if (form.kind === "multiple_choice") set("correctIds", [id]);
    else set("correctIds", form.correctIds.includes(id) ? form.correctIds.filter((x) => x !== id) : [...form.correctIds, id]);
  }
  function setChoiceText(index: number, text: string) {
    set("choices", form.choices.map((c, i) => (i === index ? { ...c, text } : c)));
  }
  function removeChoice(index: number) {
    const removed = form.choices[index];
    set("choices", form.choices.filter((_, i) => i !== index));
    if (removed) set("correctIds", form.correctIds.filter((id) => id !== removed.id));
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={question ? t("assessments.question.edit") : t("assessments.question.add")}
      className="max-w-2xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("assessments.question.cancel")}
          </Button>
          <Button type="submit" form={formId} loading={save.isPending}>
            {t("assessments.question.save")}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4" data-testid="question-form">
        {save.isError && Object.keys(fieldErrorsOf(save.error)).length === 0 && <Alert tone="error">{errorMessage(t, save.error)}</Alert>}
        <Select label={t("assessments.question.kind")} value={form.kind} onChange={(e) => set("kind", e.target.value as QuestionKind)} options={options.kind} disabled={question !== null} helperText={objective ? t("assessments.question.objective") : t("assessments.question.subjective")} />

        {(form.kind === "multiple_choice" || form.kind === "multiple_select" || form.kind === "true_false" || form.kind === "short_answer") && (
          <Textarea label={t("assessments.question.prompt")} value={form.prompt} onChange={(e) => set("prompt", e.target.value)} maxLength={ASSESSMENT_LIMITS.promptMax} error={err("prompt")} />
        )}
        {form.kind === "scenario" && (
          <>
            <Textarea label={t("assessments.question.scenario")} value={form.scenario} onChange={(e) => set("scenario", e.target.value)} maxLength={ASSESSMENT_LIMITS.scenarioMax} error={err("scenario")} />
            <Textarea label={t("assessments.question.task")} value={form.task} onChange={(e) => set("task", e.target.value)} maxLength={ASSESSMENT_LIMITS.promptMax} error={err("task")} />
          </>
        )}
        {form.kind === "practical_task" && (
          <>
            <Alert tone="info">{t("assessments.question.noExecution")}</Alert>
            <Textarea label={t("assessments.question.description")} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={ASSESSMENT_LIMITS.scenarioMax} error={err("description")} />
            <Textarea label={t("assessments.question.requirements")} value={form.requirements} onChange={(e) => set("requirements", e.target.value)} error={err("requirements")} />
            <Textarea label={t("assessments.question.deliverables")} value={form.deliverables} onChange={(e) => set("deliverables", e.target.value)} error={err("deliverables")} />
            <Textarea label={t("assessments.question.evaluationCriteria")} value={form.evaluationCriteria} onChange={(e) => set("evaluationCriteria", e.target.value)} error={err("evaluationCriteria")} />
          </>
        )}

        {isChoice && (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 type-label text-foreground">{t("assessments.question.choices")}</legend>
            {err("choices") && <Alert tone="error">{err("choices")}</Alert>}
            {form.choices.map((choice, index) => (
              <div key={choice.id} className="flex items-end gap-2">
                <div className="flex-1">
                  <Input label={t("assessments.question.choice", { id: choice.id })} value={choice.text} onChange={(e) => setChoiceText(index, e.target.value)} maxLength={ASSESSMENT_LIMITS.choiceTextMax} />
                </div>
                <div className="flex h-10 items-center">
                  {form.kind === "multiple_choice" ? (
                    <Radio name="correct" label={t("assessments.question.correct")} checked={form.correctIds.includes(choice.id)} onChange={() => toggleCorrect(choice.id)} />
                  ) : (
                    <Checkbox label={t("assessments.question.correct")} checked={form.correctIds.includes(choice.id)} onChange={() => toggleCorrect(choice.id)} />
                  )}
                </div>
                {form.choices.length > ASSESSMENT_LIMITS.minChoices && (
                  <Button type="button" variant="ghost" size="sm" aria-label={t("assessments.question.removeChoice", { id: choice.id })} onClick={() => removeChoice(index)}>
                    ×
                  </Button>
                )}
              </div>
            ))}
            {form.choices.length < ASSESSMENT_LIMITS.maxChoices && (
              <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => set("choices", [...form.choices, { id: LETTERS[form.choices.length] ?? String(form.choices.length + 1), text: "" }])}>
                {t("assessments.question.addChoice")}
              </Button>
            )}
          </fieldset>
        )}

        {form.kind === "true_false" && (
          <RadioGroup legend={t("assessments.question.correctAnswer")}>
            <Radio name="tf" label={t("assessments.question.true")} checked={form.trueFalse === "true"} onChange={() => set("trueFalse", "true")} />
            <Radio name="tf" label={t("assessments.question.false")} checked={form.trueFalse === "false"} onChange={() => set("trueFalse", "false")} />
          </RadioGroup>
        )}

        {objective && <Textarea label={t("assessments.question.explanation")} value={form.explanation} onChange={(e) => set("explanation", e.target.value)} maxLength={ASSESSMENT_LIMITS.explanationMax} error={err("explanation")} />}
        {(form.kind === "short_answer" || form.kind === "scenario") && (
          <Textarea label={t("assessments.question.expectedCriteria")} value={form.expectedCriteria} onChange={(e) => set("expectedCriteria", e.target.value)} error={err("expectedCriteria")} />
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Select label={t("assessments.question.skill")} value={form.skillId} onChange={(e) => set("skillId", e.target.value)} options={skillOptions} error={err("skillId")} />
          <Select label={t("assessments.question.difficulty")} value={form.difficulty} onChange={(e) => set("difficulty", e.target.value as AssessmentDifficulty)} options={options.difficulty} />
          <Input label={t("assessments.question.minutes")} type="number" inputMode="numeric" min={1} max={120} value={form.estimatedMinutes} onChange={(e) => set("estimatedMinutes", e.target.value)} error={err("estimatedMinutes")} />
        </div>
      </form>
    </Dialog>
  );
}
