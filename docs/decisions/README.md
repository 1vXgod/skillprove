# Architecture decisions

Each decision records why the code is the way it is. Add a new section when a decision changes; mark the old one as replaced rather than deleting it.

## 1. Internal packages ship TypeScript source

Packages export `src/index.ts` directly, with no build step. Next.js compiles them through `transpilePackages`, and Metro and Vitest compile them natively.

**Why:** one source of truth, fast type feedback and no stale `dist` folders.

## 2. Pinned versions differ from npm's `latest` on purpose

- **Prisma stays on 7.10.1.** npm's `latest` tag points at `8.0.0-rc.29`, a release candidate. Ignore the CLI's update notice until 8.0 is stable.
- **TypeScript stays on 6.0.** `typescript-eslint` supports below 6.1, and Expo SDK 58's template uses 6.0.
- **ESLint stays on 9.** The plugins inside `eslint-config-next` do not support ESLint 10 yet.
- **React is exactly 19.3.0 everywhere,** because Expo SDK 58 requires it.
- **Next.js, TanStack Query and Vitest were each held one release back.** Their newest releases were published on the day of setup, and pnpm's release-age check rejects packages that new. Keep this protection on: do not add `minimumReleaseAgeExclude` entries to get around it.

## 3. Only Prisma may run install scripts

`allowBuilds` in `pnpm-workspace.yaml` lists the only packages allowed to run install scripts. Add to it only after checking why a package needs one.

## 4. Two Next.js apps, one API

`apps/api` holds all backend logic and all database access. `apps/web` is only a client of it, exactly like mobile, including `NEXT_PUBLIC_API_URL`. Web never imports `@skillprove/database`.

**Why:** the mobile app needs a public API regardless, and one path for both clients keeps rules in one place.

**Cost:** the browser calls another origin, which requires CORS (decision 5).

## 5. CORS applies to browsers only

CORS lives in `apps/api/src/proxy.ts` and `apps/api/src/lib/cors.ts`.

- `CORS_ALLOWED_ORIGINS` is a list of exact origins. Wildcards are rejected.
- Requests with no `Origin` header, which is what native apps send, get no CORS headers and need no allowlist entry.
- Credentials mode is off. Clients will authenticate with bearer tokens rather than cookies.
- **CORS is not security for the API.** It only controls which websites can read responses in a browser. A disallowed origin's simple request still reaches the route, and any non-browser client can send any `Origin`. Every protected endpoint must enforce authentication and permissions itself.

## 6. Liveness and readiness are separate

`GET /api/v1/health` proves the process is up and never touches the database. `GET /api/v1/health/ready` checks the database and returns 503 when it is unavailable. Neither includes connection details.

Hosting checks should use liveness for restarts, so a database outage does not restart healthy API processes.

## 7. Database connections and migrations

- Runtime uses `@prisma/adapter-pg` with a 5-second connection timeout. `pg` otherwise waits indefinitely.
- `DATABASE_URL` is Neon's pooled connection. `DIRECT_URL` is the direct one, and migrations use it because pooled connections can break Prisma's locks.
- The Neon serverless driver is not used, since the API runs on Node. Reconsider this only if the API moves to an edge runtime.
- There is deliberately no `db push` script. See [docs/database.md](../database.md).

## 7a. Database tests refuse unknown databases

Tests never run against the development or production database. The check is an allowlist rather than a list of forbidden hosts, because production does not exist yet and a blocklist could not name it. The rules are in [docs/database.md](../database.md).

## 8. The first table is `audit_logs`

Prisma needs a model for a first migration, and audit logging is a stated security requirement that needs no product decisions. Nothing writes to it yet. The authentication milestone adds the first writers and can refine its columns through a new migration.

`actor_id` has no foreign key so that records outlive deleted users.

## 8a. Data integrity rules live in the database

History-critical rules, such as immutable evaluations and evidence-backed verified scores, are enforced by constraints and triggers rather than only in application code.

**Why:** these records must stay trustworthy even if an API bug or a one-off script writes to them.

**Cost:** some rules live in SQL that Prisma cannot see, and `migrate diff` cannot detect changes to them. Tests cover their behavior.

## 8b. Tenant isolation uses a scoped repository, not row-level security

Company-facing reads go through `companyScope`. Composite foreign keys stop records crossing assessments.

**Why not row-level security yet:** it needs a per-request database setting, which is awkward through a connection pooler, and a non-owner database role. Worth revisiting if the API grows many query paths.

## 8c. Prices and scores use `Decimal`; IDs are UUIDs

Money, scores and weights never use floating point. IDs are generated by Prisma. Soft deletion exists only where history requires it (`Company`, `Assessment`, `FileAsset`), and users are anonymized rather than deleted.

## 8d. Clerk integration choices

Details are in [authentication.md](../authentication.md).

- **Hosted and prebuilt flows** rather than custom forms, because they cover verification, recovery and enumeration protection, and work in Expo Go.
- **Sync reads Clerk's current state** on each event, rather than ordering events, so no schema change or event table is needed.
- **The API accepts bearer tokens only.** Cookies are dropped before verification.
- **`azp` is checked by our code,** because Clerk's option rejects tokens that have none.
- **Existing role names were kept,** avoiding a migration. Renaming `REVIEWER` to `EVALUATOR` remains possible later.
- **Row-level security stays out,** as in decision 8b. All access still passes through one API.

## 9. Feature-related stack items are deferred

These are still the plan, but they were left out of Milestone 1 because nothing uses them yet:

| Item | Add when |
|---|---|
| NativeWind and shadcn/ui | Not adopted. See decision 11 |
| Zustand | Mobile has client state that needs it. Theme and language did not: React context is enough |
| Maestro | Android device or emulator testing is available |
| Sentry, R2, Gemini, BullMQ, rate limiting | Their own milestones |

## 10. Mobile uses Expo Go for now

Nothing in the app needs custom native code. A development build becomes necessary when a dependency includes native code that Expo Go does not bundle. Native Apple and Google sign-in are likely to be the first case, in Milestone 2.

In development, the app finds the API on the same host that served its bundle, port 4000, because a phone cannot reach the computer through `localhost`. Production builds must set `EXPO_PUBLIC_API_URL`, and the app never guesses a production address.

## 11. One token source, platform-native components

Details are in [design-system.md](../design-system.md).

- **Tokens live in `packages/shared`** as typed TypeScript. Web generates its CSS variables from them at request time; mobile reads them directly. No value is written twice.
- **No NativeWind.** It would add a second styling system and a Babel and Metro setup to verify on SDK 58, to express what `StyleSheet` and the shared tokens already do.
- **No shadcn/ui or Radix.** The native `<dialog>`, `<select>` and form controls cover focus trapping, Escape, inert backgrounds and mobile pickers. Menus, tabs and tooltips follow the WAI-ARIA patterns in a few files each.
- **Our own translator, not i18next.** Two languages and typed keys need about 60 lines, and TypeScript rejects a missing Albanian key at build time.
- **Preferences in cookies on web**, so the server renders the right theme and language first time, and "system" is resolved by a CSS media query with no script. On mobile they are kept with `expo-secure-store`, which was already installed.
- **`@expo/vector-icons` on mobile** (with its required `expo-font`), because both are part of the Expo SDK. Web uses a small inline SVG set instead of an icon package.

## 9. Assessment generation runs after the response, behind a job

`POST .../assessments/generate` creates an `AIJob` and answers 202 at once. The provider call runs after the response (`after()`), and clients poll the job. There is no queue or worker yet.

**Why:** the AI call can take a minute, and no browser or phone request should wait on it. Jobs give idempotency, limits, cancellation and a place to record tokens and failures.

**Cost:** a process that stops mid-job leaves it `RUNNING` until it is failed as stale on the next read. Move to a worker if volume grows. See [docs/assessments.md](../assessments.md).

## 9a. New question kinds reuse the existing `QuestionType`

Six author-facing kinds share four stored types, told apart by a Zod-validated `kind` inside `options` and `answerKey`. **Why:** an enum migration adds nothing a discriminator does not, and `CODE` stays unused so nothing is ever executed. The migration was additive and left every trigger unchanged.

## 9b. Assessment authoring is web-only; mobile is read-only

Candidates use mobile and companies use web. Mobile shows company members assessment lists, details, versions and job status, and never edits.
