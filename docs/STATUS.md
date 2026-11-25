# SkillProve: real status

The single place that shows what is built, compared with the long-term [vision](VISION.md). Audited against the code on 2026-11-25, branch `milestone-6-assessment-generation` at `831efb1`.

## What SkillProve is

SkillProve helps people prove their skills instead of only claiming them. A candidate builds a professional profile and a Skill Passport that keeps self-reported skills apart from skills verified by assessments. Companies create skill assessments, by hand or with AI help, and candidates take them on their phone or on the web. Results are scored against fixed criteria and stored as verified scores that nobody can edit by hand, not even the candidate. Companies can then compare candidates on what they have shown they can do, and profiles stay private unless the candidate chooses otherwise. It starts in Kosovo, in Albanian and English.

## How to read this

| Mark | Meaning |
|---|---|
| ✅ | Done: built, and covered by tests that ran and passed |
| 🔄 | Partial: some of it exists, or it is built but its tests have not run yet ("unverified") |
| 🗄️ | Data only: tables exist, but no endpoint or screen uses them |
| ❌ | Not built |
| ❓ | Could not verify from the code |

**Tests today:** `pnpm test` passes 252 tests: unit tests plus the database tests that need no database. **137 database and API route tests are skipped** locally because there is no test database. CI starts its own PostgreSQL and should run them, but no result has been confirmed yet. Browser tests (`apps/web/e2e`, Playwright) exist and have not run in this audit. None of these count until they run.

## The core loop

| Step | Works today? |
|---|---|
| 1. Company creates an assessment | 🔄 Built (web wizard, editor, AI generation, publish). Route tests not yet run. There is no way for a company to sign up (see §3), so this only works for companies created directly in the database |
| 2. Company invites a candidate | ❌ No assessment invitations. `CompanyInvitation` is for company team members, not candidates |
| 3. Candidate takes the assessment | ❌ Milestone 7. No attempt or submission endpoints, no candidate screens |
| 4. Evaluation | ❌ Pure scoring functions exist and pass their tests (`scoreObjectiveAttempt`, `calculateVerifiedSkillScore`), but nothing calls them yet |
| 5. Verified score appears in the Skill Passport | 🔄 Display, storage and immutability triggers exist. Nothing produces a score, so the section is empty |
| 6. Company reviews and compares | ❌ No company access to attempts, results or candidates |

**None of the six steps works end to end yet.** Step 1 works in isolation.

## Status by vision section

### §2 Platform architecture

| Feature | Status | Evidence / notes |
|---|---|---|
| One backend, one API, one database for web and mobile | ✅ | Only `apps/api` imports `@skillprove/database`. Both apps use `packages/api-client`. Health tests ran |
| Web: public landing page | 🔄 | `apps/web/src/app/page.tsx` is a connection-status page with sign-in links, language and theme menus. No product or marketing content |
| Web: candidate registration and sign-in | 🔄 | Clerk pages at `/sign-in`, `/sign-up`. Browser tests in `e2e/api-connection.spec.ts` not run here |
| Web: company registration | ❌ | No endpoint or screen creates a `Company`. Companies exist only in test fixtures (`createCompany` in `packages/database/src/tests/support.ts`) |
| Web: candidate dashboard | ❌ | No dashboard. Signed-in users land on profile, Skill Passport and account pages |
| Web: company dashboard | ❌ | Only the assessment list. The "Candidates" and "Jobs" nav items are shown as not built (`app-shell.tsx`) |
| Web: candidate discovery and search | ❌ | |
| Web: skill assessments | 🔄 | Company authoring only: `apps/web/src/app/(auth)/(app)/assessments/` |
| Web: assessment results | ❌ | |
| Web: Skill Passport | 🔄 | `skill-passport/page.tsx`. Verified section has nothing to show yet |
| Web: profile management | 🔄 | `profile/page.tsx`. Database and route tests skipped |
| Web: notifications | 🗄️ | `Notification` model only |
| Web: account and security settings | 🔄 | `/account` shows email, status and company memberships. Security settings live on Clerk's hosted pages |
| Web: platform administration | ❌ | See §3 administrators |
| Mobile: candidate registration and sign-in | 🔄 | Clerk hosted pages through the browser (`components/account-panel.tsx`). Android only partly tried by hand; iOS not verified |
| Mobile: company account access | 🔄 | Read-only assessment list, details and generation status (`app/assessments/`) |
| Mobile: candidate profile and profile editing | 🔄 | `app/profile/*`. Database and route tests skipped |
| Mobile: Skill Passport | 🔄 | `app/skill-passport.tsx`, same limits as web |
| Mobile: assessment invitations | ❌ | |
| Mobile: assessment completion | ❌ | Milestone 7 |
| Mobile: assessment results | ❌ | Milestone 7 |
| Mobile: push notifications | 🗄️ | `UserDevice` model. `expo-notifications` is not installed |
| Mobile: account settings | 🔄 | `app/settings.tsx`: language and appearance |
| Mobile: dashboard and activity overview | ❌ | The home screen (`app/index.tsx`) is an API and database connection check |
| Web and mobile stay in sync | 🔄 | True by design (one API and database). No cross-platform test |

### §3 User types and permissions

**Candidates**

| Feature | Status | Evidence / notes |
|---|---|---|
| Create an account | 🔄 | Clerk plus webhook sync (`webhooks/clerk`, `identity.ts`). `identity-sync.db.test.ts` skipped |
| Build a profile: experience, education, certificates, portfolio, languages | 🔄 | `/me/profile` and `/me/profile/[section]`, web and mobile. `candidate-profile.db.test.ts` and `candidate-routes.db.test.ts` skipped. Validation unit tests ran |
| Add skills | 🔄 | `/me/skills`, `/skills`. `skills.db.test.ts` skipped |
| Receive assessment invitations | ❌ | |
| Complete assessments | ❌ | Milestone 7 |
| Assessment history | ❌ | |
| See verified skill scores | 🔄 | `/me/skill-passport` and both screens. Nothing produces scores yet |
| Profile visibility and privacy settings | 🔄 | `/me/profile/privacy`, web and mobile. `getCandidateView` applies them. Tests skipped |
| Share the Skill Passport | ❌ | No share link or public passport |
| Notifications | 🗄️ | |

**Companies**

| Feature | Status | Evidence / notes |
|---|---|---|
| Register a company account | ❌ | No create path at all |
| Company profile and information | 🗄️ | `Company` model. No endpoint |
| Invite team members | 🗄️ | `CompanyInvitation`, `CompanyMember`. No endpoint |
| Search and filter candidates | ❌ | `isDiscoverable` is stored but unused |
| View a candidate's passport within their privacy settings | 🔄 | `GET /candidates/[profileId]` through `getCandidateView`. No company screen. Tests skipped |
| Create assessments, generate with AI, set difficulty and duration | 🔄 | See §6 |
| Send assessment invitations | ❌ | |
| Track progress, review completed assessments, AI evaluation reports | ❌ | |
| Compare candidates | ❌ | |
| Assessment history | 🔄 | Version history and restore (`/assessments/[id]/versions`) |
| Save candidates | ❌ | |
| Notifications | 🗄️ | |

**Platform administrators**

| Feature | Status | Evidence / notes |
|---|---|---|
| Admin role and backend check | 🔄 | `PlatformAdmin` model, `requirePlatformAdmin` (`apps/api/src/lib/auth/guards.ts`). No route uses it yet |
| Assessment management | 🔄 | Admins can **read** any company's assessments (`lib/assessments/access.ts`), never edit. No screen |
| User, company and candidate management | ❌ | |
| Reports, analytics, platform statistics | ❌ | |
| Verification and moderation, reports and complaints | ❌ | `Company.verificationStatus` exists, nothing sets it |
| Platform configuration | ❌ | |
| AI usage monitoring | 🗄️ | Token counts and estimated cost stored per AI job. No admin view |
| System activity logs | 🗄️ | `AuditLog` is written for publishes, profile changes and identity events. No viewer |
| Permissions enforced on the backend | 🔄 | Yes for every existing route (`withAuth`, company role guards). `packages/permissions` unit tests ran; guard tests are database tests and skipped |

### §4 Candidate profiles

| Feature | Status | Evidence / notes |
|---|---|---|
| Name, headline, biography, location, contact with privacy controls | 🔄 | Both platforms. Tests skipped |
| Profile photo | ❌ | Shows "photo unavailable". `FileAsset` exists, but no storage (R2) is connected |
| Employment status | 🔄 | Availability: `/me/profile/availability` |
| Experience, education, certifications, portfolio, languages | 🔄 | Both platforms. Tests skipped |
| Technical and soft skills | 🔄 | One skill list grouped by category (for example `communication`). There is no technical/soft split |
| Skill Passport: verified, being assessed and self-reported kept separate | 🔄 | `skill-passport.ts` returns three separate lists. `skill-passport.db.test.ts` skipped |
| Verified skill details (score, date, difficulty, status, verification) | 🔄 | Shown when present; none exist yet |
| Verified scores are immutable | 🔄 | Enforced by database triggers (`sync_verified_score`, evaluation and score-input guards) and by `recordVerifiedSkillScore` being the only write path. The tests proving it are database tests, all skipped |
| Private by default | 🔄 | Default `PRIVATE`. Tests skipped |
| Profile preview ("what companies see") | 🔄 | `GET /me/profile/preview`, shown on the privacy screen on web (`privacy-settings.tsx`) and mobile (`profile/privacy.tsx`). Tests skipped |

### §5 Company platform

| Feature | Status | Evidence / notes |
|---|---|---|
| Company dashboard with statistics | ❌ | |
| Candidate discovery with filters | ❌ | |
| Candidate comparison | ❌ | |

### §6 AI-powered assessment system

| Feature | Status | Evidence / notes |
|---|---|---|
| Creation: title, description, skills, difficulty, question count, duration, type | 🔄 | Web wizard and editor, API under `/companies/[id]/assessments` and `/assessments/[id]`. Validation unit tests ran; `assessment-routes.db.test.ts` and `assessments.db.test.ts` skipped; browser tests not run |
| Evaluation criteria | 🔄 | Rubric editor, weights must total 100 |
| Passing score | ❌ | Not in the schema. Milestone 7 decided on no threshold (see disagreements) |
| Difficulty levels Beginner, Intermediate, Advanced | ✅ | `ASSESSMENT_DIFFICULTIES` in `packages/shared`, validation tests ran |
| Question types: multiple choice, true/false, short answer, scenario, practical | ✅ | Authoring only. Codec round-trip tests ran (`assessment-engine/src/engine.test.ts`). Multiple select is also supported |
| AI generation | 🔄 | `packages/ai`, tests ran against a mock provider. **Real Gemini output has never been exercised** |
| Structured, validated AI output | ✅ | Zod schema plus request checks plus repair prompt, `packages/ai/src/ai.test.ts` ran |
| Company reviews AI output before use | 🔄 | AI output is always a draft; a person must publish. There are no invitations to gate |
| Candidates open, read, start, answer, submit, see status and results (web and mobile) | ❌ | Milestone 7 |
| Automatic scoring of objective questions | 🔄 | `scoreObjectiveAttempt` and `calculateVerifiedSkillScore` (`assessment-engine`), tests ran. Not wired to any endpoint |
| AI evaluation against rubrics, with question scores, strengths, weaknesses, feedback, summary | 🗄️ | `Evaluation`, `EvaluationCriterionScore`, `EvaluationEvidence`, `EvaluationReview` tables and triggers. Planned after Milestone 7 |
| Provider-independent abstraction, Gemini first | ✅ | `AiProvider`, `GeminiProvider`, tests ran (adapter against a fake `fetch`) |
| JSON responses, schema validation, retries, timeouts, error handling | ✅ | `packages/ai`, tests ran |
| Usage tracking and cost controls | 🔄 | Token counts and cost per job, rate limits per user and company. The limit tests are database tests, skipped |
| Evaluation versioning | 🗄️ | `promptVersion` on evaluations, `formulaVersion` on score calculations |
| Auditability | 🔄 | Publishing writes an audit record. `audit.db.test.ts` skipped |

### §7 Invitations and notifications

| Feature | Status | Evidence / notes |
|---|---|---|
| Assessment invitations | ❌ | No table. Needs a new model |
| Candidate and company notification events | 🗄️ | `Notification` model only |
| In-app notifications | 🗄️ | |
| Mobile push (Expo) | 🗄️ | `UserDevice` model only |
| Email notifications | ❌ | No email provider |

### §8 Business model

| Feature | Status | Evidence / notes |
|---|---|---|
| Free for companies, no payment barriers | ✅ | There is no payment or limit-by-plan code. The only limits are AI cost limits |
| Extensible subscriptions and entitlements | ❌ | Nothing yet |

### §9 Technology stack

| Feature | Status | Evidence / notes |
|---|---|---|
| Web: Next.js, React, TypeScript, Tailwind, shared design system, responsive | ✅ | `apps/web`. Builds in CI |
| Mobile: React Native, Expo, TypeScript, Expo Router, shared tokens and API contracts | ✅ | `apps/mobile` (Expo SDK 58). iOS not verified |
| Backend: Next.js REST API, shared logic, Zod, server-side authorization | ✅ | `apps/api`, `packages/validation`, `packages/permissions` |
| Database: PostgreSQL on Neon with Prisma | ✅ | `packages/database` |
| Clerk authentication, sessions, webhook sync, roles | 🔄 | In use. Webhook and role tests are database tests, skipped |
| Social sign-in | ❓ | No code involved: Clerk's hosted pages show whichever providers are enabled in the Clerk dashboard. Check Clerk Dashboard > User & Authentication > Social connections |
| Cloudflare R2 storage | ❌ | `FileAsset` model only |
| Expo push, email | ❌ | |
| Gemini first, OpenAI later | 🔄 | Gemini adapter built but never called for real. No OpenAI adapter; the abstraction allows one |

### §10 Design system and user experience

| Feature | Status | Evidence / notes |
|---|---|---|
| Brand colours #222c6e and #2f5be0 | ✅ | `packages/shared/src/design/tokens.ts` (`primary`, and `accent`/`ring`). Contrast tests ran |
| Consistent spacing, typography, accessible contrast | ✅ | Design tokens, `tokens.test.ts` ran |
| Responsive layouts | 🔄 | Built. Browser tests not run |
| Subtle animations | 🔄 | Few; reduced-motion support on mobile (`use-reduced-motion.ts`) |
| Loading, skeleton, empty and error states, confirmation dialogs | 🔄 | Components exist on both platforms (`components/ui`) and are used on the built screens. Browser tests not run |
| Toast notifications | ❌ | No toast component on either platform |
| Light, dark and system appearance | 🔄 | Web: `lib/theme.tsx` and theme menu (cookie plus `prefers-color-scheme`). Mobile: `preferences-provider.tsx` follows `useColorScheme`. Mobile style tests ran; web browser tests not run |
| Central translations, Albanian default, English | ✅ | `packages/shared/src/i18n`, `DEFAULT_LOCALE = "sq"`. Key-parity test ran |
| Kosovo formatting: sq, Europe/Belgrade, EUR, +383 | ✅ | `REGION` in `packages/shared/src/i18n/index.ts`: `formatDate` uses the time zone, `formatCurrency` uses EUR, `formatPhone` formats +383. `i18n.test.ts` ran |
| Ready for more countries and languages | 🔄 | Region settings live in one place, but there is only one region |

### §11 Security and data protection

| Feature | Status | Evidence / notes |
|---|---|---|
| Role-based permissions, ownership checks | 🔄 | Every route uses `withAuth` and company role guards. Unit tests ran; database guard tests skipped |
| Company data isolation | 🔄 | `companyScope`, composite keys. `isolation.db.test.ts` skipped |
| Candidate privacy | 🔄 | `getCandidateView`. Tests skipped |
| Server-side validation | ✅ | Every route parses input with `packages/validation`. Validation tests ran |
| Secure authentication | 🔄 | Clerk token verification, `auth.test.ts` ran with mocks. Real sign-in not verified on a device |
| Rate limiting | 🔄 | AI generation only. No general API rate limiting |
| Input sanitization | 🔄 | Zod on input, React escapes output, pattern-based content screen for assessments. No HTML is stored |
| Audit logs | 🔄 | Written for key actions. Tests skipped |
| Secure file access | ❌ | No file storage yet |
| No unauthorized access to assessments | 🔄 | Same 403 for missing, foreign and deleted. Candidates never receive answer keys (`toCandidateQuestion`). Route tests skipped |
| Submission integrity | 🗄️ | Immutable-submission triggers. No submission endpoints |
| No unauthorized score changes | 🔄 | Triggers plus a single write path. Tests skipped |

### §12 Principles and §13 development instructions

These are rules, not features. Current gaps against them: principle 3 (the candidate cannot take an assessment yet) and principle 5 (no human review flow yet). §13 is followed through `AGENTS.md` and `CLAUDE.md`.

## Web vs mobile

| Feature | Web | Mobile |
|---|---|---|
| Sign in / sign up (Clerk) | ✅ hosted pages | ✅ hosted pages in the browser |
| Language switch, light/dark/system | ✅ | ✅ |
| Profile: view and edit every section | ✅ | ✅ |
| Availability | ✅ | ✅ |
| Self-reported skills | ✅ | ✅ |
| Skill Passport | ✅ | ✅ |
| Privacy settings and profile preview | ✅ | ✅ |
| Account page | ✅ email, status, memberships | Settings only (language, appearance) |
| Company: list and read assessments | ✅ | ✅ read-only |
| Company: create, edit, AI-generate, publish assessments | ✅ | ❌ by design (web only) |
| Take assessments, see results | ❌ | ❌ |
| Dashboard | ❌ | ❌ (home is a connection check) |
| Notifications | ❌ | ❌ |

✅ in this table means the screen exists. It does not mean it has been verified (see the status tables).

## Where the current plan disagrees with the vision

**Decided 2026-11-25: all ten recommendations accepted as written.** The roadmap below reflects them.

| # | Vision says | Code / plan does | Recommendation |
|---|---|---|---|
| 1 | Candidates get assessments through **company invitations** (§3, §6, §7) | Milestone 7 decision 12: candidates pick from a **public catalogue** of `PUBLIC` assessments | Keep the public catalogue for Milestone 7 (no invitation model needed yet, so the loop can be tested end to end sooner). Add invitations right after as the main way in, with public assessments as a secondary path. The `Assessment.visibility` enum (`PUBLIC`, `INVITE_ONLY`) already supports both |
| 2 | Companies set a **passing score** (§6) | Milestone 7 decision 8: **no threshold**; store 0–100 only | Keep scores as 0–100. Add an optional, company-only passing score with the invitations milestone. Never show pass/fail to the candidate as a verified result, and never act on it automatically (principle 5) |
| 3 | **Three** difficulty levels (§6) | Authoring uses three (`ASSESSMENT_DIFFICULTIES`). The database enum, the `auto-v1` weights and the level labels also have **Expert** | Keep three levels for assessments, as now. Keep Expert only as a score label (80+), since that describes a result, not an assessment. Remove the unused Expert weight in a later formula version, or leave it, since no assessment can have it |
| 4 | Companies **review and compare** results (§5, §6) | Milestone 7 decision 12: companies see **no results** yet | Agree for Milestone 7. Make "company sees results, filtered by candidate privacy" the next milestone after invitations, because it completes the core loop |
| 5 | Full platform (§2–§11) | `HARTA.md` describes a narrow 4-screen course scope | Keep `HARTA.md` as the course MVP and point it to the vision (done in this change). Treat `VISION.md` as the long-term target |
| 6 | Companies **register** themselves (§3) | No way to create a company exists. Planned nowhere before the old "M9" | Add company onboarding (create company, owner membership, invite team) as the first milestone after M7. Without it, steps 1 and 2 of the loop can't happen outside the database |
| 7 | **AI** evaluates answers (§1, §6) | Milestone 7 scores objective questions automatically; AI evaluation comes later | Agree: matches principle 5. Record it in the roadmap (below) |
| 8 | Mobile is a full app for both candidates and companies (§2) | Company features on mobile are read-only; authoring is web only | Keep authoring on the web. Add company read views (results, invitations) to mobile when those features exist |
| 9 | Landing page and dashboards (§2, §5) | Both apps open on an API connection-check screen | Replace with a real landing page and candidate home once the loop works; low priority until then |
| 10 | Old `PROGRES.md` milestones 8–12 (per-company sharing, then company side, then hiring tools) | Order doesn't follow the vision's core loop | Use the roadmap below |

## Roadmap

M1–M7 stay as they are. M8 onward is reordered by dependency, core loop first. Names and order are proposals until the team agrees.

| # | Milestone | Unblocks | Status |
|---|---|---|---|
| 1–6 | Foundations, database, auth, profiles and Skill Passport, design system and i18n, assessment creation | | Built. Database tests not yet confirmed in CI |
| 7 | Candidates take assessments; **automatic** scoring of objective questions; verified scores | Loop steps 3–5 | In progress (slices 1–2 of 16 done) |
| 8 | Company onboarding: create a company, profile, owner membership, team invitations | Loop step 1 for real companies | Not started |
| 9 | Assessment invitations: invite a candidate, accept/decline, deadlines, optional company passing score, in-app notifications | Loop step 2 | Not started |
| 10 | Company results: attempts and results through candidate privacy, evaluation reports, comparison | Loop step 6 | Not started |
| 11 | Candidate discovery: search and filters, saved candidates, company dashboard | Vision §5 | Not started |
| 12 | AI-assisted evaluation with human review, for short-answer, scenario and practical questions | Vision §6 AI evaluation | Not started |
| 13 | Notifications: Expo push and email | Vision §7 | Not started |
| 14 | Files and media (Cloudflare R2): profile photos, file submissions | Vision §4 photo, §11 file access | Not started |
| 15 | Platform administration: users, companies, moderation, AI usage, audit log viewer | Vision §3 administrators | Not started |
| 16 | Production readiness: monitoring, general rate limiting, job queue, production database, landing page, toasts | Launch | Not started |
| 17 | Shareable Skill Passport, per-company sharing (old M8) | Vision §3 sharing | Postponed |
| 18 | Entitlements, pricing, more countries | Vision §8, §10 | Out of scope for now |

## Milestone 7 plan

Decisions (2026-11-25):
- **Scoring is automatic only**, for multiple choice, true/false and multiple select. Only assessments that are fully objective can be taken. Multiple select is all or nothing. AI-assisted scoring with human review is Milestone 12.
- Scoring runs server-side after submit, from stored answers only. The result endpoint re-triggers it if a submitted attempt still has no evaluation after about a minute; idempotency prevents duplicates.
- Time limit from `durationMinutes`, otherwise `attemptTtlHours`, otherwise 24 hours, judged by the server. Retakes up to `maxAttempts`; the most recent completed attempt per assessment counts.
- No pass threshold in Milestone 7.
- Formula `auto-v1`: difficulty-weighted average; confidence = min(100, 5 × answered questions). A level label (Beginner < 40 ≤ Intermediate < 60 ≤ Advanced < 80 ≤ Expert) is shown only when confidence ≥ 50; below that, "more assessments needed".
- Candidates see overall and per-skill scores after submitting, never the correct answers.
- Candidates pick from published `PUBLIC` assessments. Companies get no access to attempts or results until Milestone 10.

| # | Slice | Status |
|---|---|---|
| 1 | Pure scoring function `scoreObjectiveAttempt` (`assessment-engine`) | ✅ `432aa97`, tests ran |
| 2 | Formula `auto-v1` and level labels (`assessment-engine`, `shared`) | ✅ `eb636e5`, tests ran |
| 3 | Migration: `AUTOMATIC` evaluator type with its CHECK constraint | Waiting for CI and phone gates |
| 4 | `recordVerifiedSkillScore` runs inside an existing transaction | |
| 5 | Validation schemas for start, answers and result (no answer fields) | |
| 6 | Repository: list takeable assessments, start an attempt, candidate view | |
| 7 | API: list, start, read an attempt | |
| 8 | Repository and API: submit | |
| 9 | `scoreAttempt`: evaluation, criterion scores, verified score, in one transaction | |
| 10 | Result endpoint, lazy expiry, re-trigger after about a minute | |
| 11 | api-client methods | |
| 12 | **Dev-only demo seed:** a demo company and 2–3 published, fully objective `PUBLIC` assessments (multiple choice, true/false, multiple select; a couple of skills; mixed difficulty) for testing on a phone. Refuses to run unless the database is local or a Neon branch named explicitly by ID that the server confirms is not `main`, and always when `NODE_ENV=production`. Database test: running it twice creates no duplicates, and the guard refuses unsafe targets | |
| 13 | Mobile: browse assessments | |
| 14 | Mobile: take an assessment | |
| 15 | Mobile: result screen and Skill Passport changes | |
| 16 | Docs: `assessments.md`, `PROGRES.md`, this file | |
