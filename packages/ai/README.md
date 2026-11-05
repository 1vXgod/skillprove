# @skillprove/ai

Provider-independent AI integration for assessment generation.

- `AiProvider` is the only interface the workflow depends on. `GeminiProvider` is the first implementation; adding another means implementing `generateJson` and choosing it where the API builds its provider.
- `generateAssessment` and `regenerateQuestion` call a provider, validate the answer with the Zod schemas in `@skillprove/validation`, ask for one repair when it is rejected (sending only problem codes, never the rejected content) and stop after `maxAttempts` calls in total.
- Errors carry stable codes only. Provider messages, prompts and generated content are never put in errors.
- `@skillprove/ai/testing` has a deterministic `MockAiProvider`. Automated tests never call Gemini.
- Candidate evaluation is not implemented here. It belongs to a later milestone.
