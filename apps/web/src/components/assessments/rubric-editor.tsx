"use client";

import { ASSESSMENT_LIMITS } from "@skillprove/shared";
import { rubricInputSchema, weightsTotal100, type AssessmentDetail } from "@skillprove/validation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useI18n } from "../../lib/i18n";
import { errorMessage, fieldErrorsOf, fieldMessage, queryKeys, useApiClient } from "../../lib/use-api";
import { Alert, Button, Card, CardContent, EmptyState, Input, Select, Textarea } from "../ui";

interface Row {
  key: string;
  title: string;
  description: string;
  maxScore: string;
  weight: string;
  scoringGuidance: string;
  skillId: string;
}

const toRow = (c: NonNullable<AssessmentDetail["rubric"]>["criteria"][number]): Row => ({
  key: c.key,
  title: c.title,
  description: c.description,
  maxScore: String(c.maxScore),
  weight: String(c.weight),
  scoringGuidance: c.scoringGuidance,
  skillId: c.skillId ?? "",
});

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30);

/** Edits the rubric of an open draft. Weights are checked as the user types, and the API checks again. */
export function RubricEditor({ detail, editable }: { detail: AssessmentDetail; editable: boolean }) {
  const { t, locale } = useI18n();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[]>(() => (detail.rubric?.criteria ?? []).map(toRow));
  const [localError, setLocalError] = useState<string | null>(null);

  const total = Math.round(rows.reduce((sum, r) => sum + (Number(r.weight) || 0) * 100, 0)) / 100;
  const set = (index: number, patch: Partial<Row>) => setRows((all) => all.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const save = useMutation({
    mutationFn: () => {
      const parsed = rubricInputSchema.safeParse({
        criteria: rows.map((r) => ({
          key: r.key,
          title: r.title,
          description: r.description,
          maxScore: Number(r.maxScore),
          weight: Number(r.weight),
          scoringGuidance: r.scoringGuidance,
          skillId: r.skillId || null,
        })),
      });
      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message;
        setLocalError(message ?? "invalidChoice");
        throw new Error("invalid");
      }
      setLocalError(null);
      return client.updateRubric(detail.id, parsed.data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.assessment(detail.id, locale) });
    },
  });

  const balance = () => {
    if (rows.length === 0) return;
    const share = Math.floor(10_000 / rows.length);
    setRows((all) => all.map((r, i) => ({ ...r, weight: String((i === all.length - 1 ? 10_000 - share * (all.length - 1) : share) / 100) })));
  };
  const addRow = () =>
    setRows((all) => [...all, { key: `criterion_${all.length + 1}`, title: "", description: "", maxScore: "10", weight: "0", scoringGuidance: "", skillId: "" }]);

  const valid = weightsTotal100(rows.map((r) => ({ weight: Number(r.weight) || 0 })));
  const serverKey = Object.values(fieldErrorsOf(save.error))[0];
  const messageKey = localError ?? serverKey;
  const skillOptions = [{ value: "", label: t("assessments.rubric.noSkill") }, ...detail.skills.map((s) => ({ value: s.skillId, label: s.name }))];

  return (
    <div className="flex flex-col gap-4" data-testid="rubric-editor">
      <p className="type-body-small text-muted-foreground">{t("assessments.rubric.help")}</p>
      {detail.rubric?.published && <Alert tone="info">{t("assessments.rubric.published")}</Alert>}
      {rows.length === 0 && <EmptyState title={t("assessments.rubric.empty")} />}
      {rows.map((row, index) => (
        <Card key={index}>
          <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
            <Input label={t("assessments.rubric.name")} value={row.title} disabled={!editable} onChange={(e) => set(index, { title: e.target.value, key: row.key.startsWith("criterion_") ? slug(e.target.value) || row.key : row.key })} />
            <Input label={t("assessments.rubric.key")} value={row.key} disabled={!editable} onChange={(e) => set(index, { key: e.target.value })} />
            <div className="sm:col-span-2">
              <Textarea label={t("assessments.rubric.criterionDescription")} rows={2} value={row.description} disabled={!editable} onChange={(e) => set(index, { description: e.target.value })} maxLength={ASSESSMENT_LIMITS.promptMax} />
            </div>
            <div className="sm:col-span-2">
              <Textarea label={t("assessments.rubric.guidance")} rows={3} value={row.scoringGuidance} disabled={!editable} onChange={(e) => set(index, { scoringGuidance: e.target.value })} maxLength={ASSESSMENT_LIMITS.promptMax} />
            </div>
            <Input label={t("assessments.rubric.weight")} type="number" inputMode="decimal" step="0.01" min={0} max={100} value={row.weight} disabled={!editable} onChange={(e) => set(index, { weight: e.target.value })} />
            <Input label={t("assessments.rubric.maxScore")} type="number" inputMode="numeric" min={1} max={100} value={row.maxScore} disabled={!editable} onChange={(e) => set(index, { maxScore: e.target.value })} />
            <Select label={t("assessments.rubric.skill")} value={row.skillId} disabled={!editable} onChange={(e) => set(index, { skillId: e.target.value })} options={skillOptions} />
            {editable && (
              <div className="flex items-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setRows((all) => all.filter((_, i) => i !== index))}>
                  {t("assessments.rubric.remove")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      <p role="status" className={valid ? "type-label text-success" : "type-label text-destructive"} data-testid="rubric-total">
        {t("assessments.rubric.total", { total })}
      </p>
      {messageKey && <Alert tone="error">{fieldMessage(t, messageKey) ?? t("errors.generic")}</Alert>}
      {save.isError && !serverKey && !localError && <Alert tone="error">{errorMessage(t, save.error)}</Alert>}
      {save.isSuccess && <Alert tone="success">{t("assessments.rubric.saved")}</Alert>}
      {editable && (
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={addRow} disabled={rows.length >= ASSESSMENT_LIMITS.maxRubricCriteria}>
            {t("assessments.rubric.add")}
          </Button>
          <Button type="button" variant="outline" onClick={balance} disabled={rows.length === 0}>
            {t("assessments.rubric.balance")}
          </Button>
          <Button type="button" loading={save.isPending} onClick={() => save.mutate()}>
            {t("assessments.rubric.save")}
          </Button>
        </div>
      )}
    </div>
  );
}
