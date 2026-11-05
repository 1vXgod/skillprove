"use client";

import { fieldErrors } from "@skillprove/validation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import type { z } from "zod";
import { useI18n } from "../../lib/i18n";
import { errorMessage, fieldErrorsOf, fieldMessage, queryKeys } from "../../lib/use-api";
import { Alert, Button, Dialog } from "../ui";

export interface FormState<T> {
  values: T;
  set: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Translated error for a field, from local validation or the API. */
  error: (field: string) => string | undefined;
}

interface FormDialogProps<T, S extends z.ZodType> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initial: T;
  /** The same schema the API uses, so most mistakes are caught before sending. */
  schema: S;
  toInput: (values: T) => unknown;
  submit: (input: z.output<S>) => Promise<unknown>;
  children: (form: FormState<T>) => ReactNode;
}

/**
 * A dialog holding one form. Validates with the shared schema, sends, refreshes the profile,
 * and closes. Errors from the API appear on their fields, or above the form.
 */
export function FormDialog<T, S extends z.ZodType>({ open, onOpenChange, title, initial, schema, toInput, submit, children }: FormDialogProps<T, S>) {
  const { t } = useI18n();
  const formId = useId();
  const queryClient = useQueryClient();
  const [values, setValues] = useState(initial);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: (input: z.output<S>) => submit(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.ownProfile });
      await queryClient.invalidateQueries({ queryKey: ["skill-passport"] });
      onOpenChange(false);
    },
  });

  const serverErrors = fieldErrorsOf(mutation.error);
  const form: FormState<T> = {
    values,
    set: (key, value) => setValues((previous) => ({ ...previous, [key]: value })),
    error: (field) => fieldMessage(t, localErrors[field] ?? serverErrors[field]),
  };

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse(toInput(values));
    if (!parsed.success) {
      setLocalErrors(fieldErrors(parsed.error));
      return;
    }
    setLocalErrors({});
    mutation.mutate(parsed.data);
  }

  const showFormError = mutation.isError && Object.keys(serverErrors).length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form={formId} loading={mutation.isPending}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {showFormError && <Alert tone="error">{errorMessage(t, mutation.error)}</Alert>}
        {children(form)}
      </form>
    </Dialog>
  );
}

/** Renders a dialog only while open, so each opening starts from fresh values. */
export function useDialog<T>() {
  const [target, setTarget] = useState<T | null>(null);
  return {
    target,
    isOpen: target !== null,
    open: (value: T) => setTarget(value),
    close: () => setTarget(null),
    onOpenChange: (open: boolean) => !open && setTarget(null),
  };
}
