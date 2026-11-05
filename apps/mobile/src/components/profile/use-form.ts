import { fieldErrors } from "@skillprove/validation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import type { z } from "zod";
import { errorMessage, fieldErrorsOf, fieldMessage, queryKeys } from "../../lib/use-api";
import { useI18n } from "../../theme/preferences-provider";

/**
 * Form state for one screen: validates with the shared schema before sending, shows the
 * API's field errors on their fields, refreshes cached profile data, then goes back.
 */
export function useForm<T, S extends z.ZodType>(options: {
  initial: T;
  schema: S;
  toInput: (values: T) => unknown;
  submit: (input: z.output<S>) => Promise<unknown>;
  /** Defaults to returning to the previous screen. */
  onDone?: () => void;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [values, setValues] = useState(options.initial);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: (input: z.output<S>) => options.submit(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.ownProfile });
      await queryClient.invalidateQueries({ queryKey: ["skill-passport"] });
      await queryClient.invalidateQueries({ queryKey: ["profile-preview"] });
      (options.onDone ?? (() => router.back()))();
    },
  });

  const serverErrors = fieldErrorsOf(mutation.error);
  return {
    values,
    set: <K extends keyof T>(key: K, value: T[K]) => setValues((previous) => ({ ...previous, [key]: value })),
    error: (field: string) => fieldMessage(t, localErrors[field] ?? serverErrors[field]),
    formError: mutation.isError && Object.keys(serverErrors).length === 0 ? errorMessage(t, mutation.error) : undefined,
    saving: mutation.isPending,
    save: () => {
      const parsed = options.schema.safeParse(options.toInput(values));
      if (!parsed.success) {
        setLocalErrors(fieldErrors(parsed.error));
        return;
      }
      setLocalErrors({});
      mutation.mutate(parsed.data);
    },
  };
}
