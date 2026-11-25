# SkillProve

AI-powered skills verification and recruitment. Candidates use a React Native app, companies use a Next.js dashboard, and both call one versioned REST API. The first market is Kosovo, in Albanian and English.

Decisions and their reasons: [docs/decisions/README.md](docs/decisions/README.md). Database workflow: [docs/database.md](docs/database.md). UI: [docs/design-system.md](docs/design-system.md). Candidate API: [docs/candidate-profiles.md](docs/candidate-profiles.md). Assessments and AI generation: [docs/assessments.md](docs/assessments.md).

## Layout

| Path | Purpose |
|---|---|
| `apps/api` | Next.js REST API under `/api/v1`. The only app that touches the database |
| `apps/web` | Company dashboard. A client of the API |
| `apps/mobile` | Candidate app, built with Expo Router. A client of the API |
| `packages/database` | Prisma schema, migrations and client |
| `packages/shared` | Constants and types with no dependencies, design tokens (`/design`) and translations (`/i18n`) |
| `packages/validation` | Zod schemas for requests and responses |
| `packages/api-client` | Typed API client used by web and mobile |
| `packages/config` | Shared TypeScript and ESLint config |
| `packages/permissions` | Pure role rules. The API's guards apply them |
| `packages/ai` | Provider-independent AI generation: `AiProvider`, the Gemini adapter, prompts, the validate-and-repair runner, and a mock in `/testing` |
| `packages/assessment-engine` | Pure assessment logic: question codec, weights, publish readiness, content-safety screen, automatic scoring of objective questions |

## Commands

pnpm comes from Corepack, pinned in `package.json`.

| Task | Command |
|---|---|
| Lint, types, unit tests | `pnpm lint`, `pnpm typecheck`, `pnpm test` |
| Production builds | `pnpm build` |
| Browser tests (after a build with `NEXT_PUBLIC_API_URL` set to `http://localhost:4100`) | `pnpm test:e2e` |
| Design system showcase | `/design-system` on the web dev server |
| Run one app | `pnpm --filter @skillprove/api dev` (or `web`, `mobile`) |
| Migrations | `pnpm db:migrate:dev`, `db:migrate:deploy`, `db:migrate:status` |
| Reference data | `pnpm db:seed` |

## Rules

- Do not commit, push, deploy or change production data unless explicitly told to.
- Business logic, validation and permissions go in shared packages, never in UI components.
- All API input is validated on the server with schemas from `packages/validation`.
- API responses use `{ success: true, data }` or `{ success: false, error: { code, message } }`. Use `ok`, `fail` and `withErrorHandling` from `apps/api/src/lib/http.ts`.
- Add new error codes to `packages/shared`.
- CORS is not access control. Every protected endpoint enforces authentication and permissions itself, and PostgreSQL is the source of truth for roles.
- Only `apps/api` may import `@skillprove/database`.
- Never use `prisma db push` or reset commands against shared databases.
- Every private route uses `withAuth`, and new public paths must be added to `public-routes.ts` deliberately. Never trust user IDs, roles or company IDs from a request. See `docs/authentication.md`.
- Get `companyScope` through `requireCompanyMembership` or `requireCompanyRole`.
- Candidate profiles shown to anyone but their owner go through `getCandidateView`, which applies the privacy settings. Candidate updates carry `expectedUpdatedAt`.
- Company-facing reads go through `companyScope`. Verified scores change only through `recordVerifiedSkillScore`, never from a candidate-facing endpoint.
- Migrations contain hand-written triggers and constraints that `migrate diff` cannot see. Read `docs/database.md` before changing evaluation, score or audit tables.
- Neon `main` is the development database. Never run automated tests against it or production, and do not weaken `test-database-guard.ts`.
- Do not build fake features. Mark anything unfinished as unfinished.
- UI uses design tokens from `@skillprove/shared/design`, never raw colours or sizes, and components from `components/ui` in each app. Every visible string comes from `@skillprove/shared/i18n`, in Albanian and English.
- Do not claim a test passed unless it ran. Tests skipped for lack of a database do not count.

## Gotchas

- Next.js 16 uses `proxy.ts` where older versions used `middleware.ts`.
- Do not follow Prisma's upgrade notice to 8.x. npm's `latest` tag currently points at a release candidate.
- Install Expo packages with `pnpm exec expo install <package>` from `apps/mobile`, so versions match the SDK.
- Ports 3000 and 4000 may already be in use by dev servers. Browser tests use 3100 and 4100 for this reason.
- `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` values are public and fixed at build time. Never put secrets in them.
- iOS cannot be tested from Windows. Report it as unverified rather than assuming it works.
