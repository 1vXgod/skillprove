# SkillProve: real status

The single place that shows what is built, compared with the long-term [vision](VISION.md). Audited against the code on 2026-11-25 (branch `milestone-6-assessment-generation`), and updated the same day with the CI #6 result.

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

**Tests:** CI #6 (the merge run of PR #3, 2026-11-25) passed everything: `@skillprove/database` 123/123 and `@skillprove/api` 105/105 with **0 skipped**, plus `db:migrate:deploy`, the production build and the browser tests (`test:e2e`). Locally, without a test database, the 137 database and route tests are still skipped; they count because CI ran them. Mobile screens have no automated tests. Mobile rows marked ✅ combine the API tests in CI with a full check by hand on an Android phone on 2026-11-25 (sign-in, profile, Skill Passport, privacy and preview). iOS has not been verified.

**Dev database:** on 2026-11-25 the development database (Neon `main`) was found two migrations behind (`20261104120000_candidate_interests_technologies`, `20261105100000_assessment_generation`). That made the Profile tab fail with a 500 on web and mobile. Both were applied with `pnpm db:migrate:deploy`, and `migrate status` now reports the schema up to date.

## The core loop

| Step | Works today? |
|---|---|
| 1. Company creates an assessment | ✅ Built and tested in CI #6 (web wizard, editor, AI generation with a mock provider, publish). There is no way for a company to sign up yet (Milestone 8), so this only works for companies created directly in the database |
| 2. Company invites a candidate | ❌ No assessment invitations. `CompanyInvitation` is for company team members, not candidates |
| 3. Candidate takes the assessment | ❌ Milestone 7. No attempt or submission endpoints, no candidate screens |
| 4. Evaluation | ❌ Pure scoring functions exist and pass their tests (`scoreObjectiveAttempt`, `calculateVerifiedSkillScore`), but nothing calls them yet |
| 5. Verified score appears in the Skill Passport | 🔄 Display, storage and immutability are built and tested (CI #6). Nothing produces a score yet, so the section is empty |
| 6. Company reviews and compares | ❌ No company access to attempts, results or candidates |

**The loop does not work end to end yet.** Step 1 works for existing companies; steps 3–5 are Milestone 7.

## Status by vision section

### §2 Platform architecture

| Feature | Status | Evidence / notes |
|---|---|---|
| One backend, one API, one database for web and mobile | ✅ | Only `apps/api` imports `@skillprove/database`. Both apps use `packages/api-client`. Health tests ran |
| Web: public landing page | 🔄 | `apps/web/src/app/page.tsx` is a connection-status page with sign-in links, language and theme menus. No product or marketing content |
| Web: candidate registration and sign-in | 🔄 | Clerk pages at `/sign-in`, `/sign-up`. Browser tests for the signed-out and missing-key paths passed in CI #6. Real sign-in confirmed by hand on 2026-11-25; there is no automated test with real Clerk keys |
| Web: company registration | ❌ | No endpoint or screen creates a `Company`. Companies exist only in test fixtures (`createCompany` in `packages/database/src/tests/support.ts`) |
| Web: candidate dashboard | ❌ | No dashboard. Signed-in users land on profile, Skill Passport and account pages |
| Web: company dashboard | ❌ | Only the assessment list. The "Candidates" and "Jobs" nav items are shown as not built (`app-shell.tsx`) |
| Web: candidate discovery and search | ❌ | |
| Web: skill assessments | 🔄 | Company authoring only (`apps/web/src/app/(auth)/(app)/assessments/`), tested in CI #6 (route, database and browser tests). Candidates cannot take assessments yet |
| Web: assessment results | ❌ | |
| Web: Skill Passport | ✅ | `skill-passport/page.tsx`. Browser test "keeps verified, in-assessment and self-reported skills apart" and `skill-passport.db.test.ts` passed in CI #6. No real verified scores exist yet |
| Web: profile management | ✅ | `profile/page.tsx`. `candidate-routes.db.test.ts`, `candidate-profile.db.test.ts` and the profile browser tests passed in CI #6. Profile tab confirmed by hand on 2026-11-25 |
| Web: notifications | 🗄️ | `Notification` model only |
| Web: account and security settings | 🔄 | `/account` shows email, status and company memberships. Security settings live on Clerk's hosted pages |
| Web: platform administration | ❌ | See §3 administrators |
| Mobile: candidate registration and sign-in | ✅ | Clerk hosted pages through the browser (`components/account-panel.tsx`). Confirmed by hand on Android on 2026-11-25. No automated test; iOS not verified |
| Mobile: company account access | 🔄 | Read-only assessment list, details and generation status (`app/assessments/`) |
| Mobile: candidate profile and profile editing | ✅ | `app/profile/*`. API tests passed in CI #6. Confirmed by hand on Android on 2026-11-25: a profile saved on the phone appears on the web. No automated screen tests; iOS not verified |
| Mobile: Skill Passport | ✅ | `app/skill-passport.tsx`. API tests passed in CI #6. Confirmed by hand on Android on 2026-11-25, including adding a skill from the catalogue (after the dev database was seeded). No automated screen tests; iOS not verified |
| Mobile: privacy settings and profile preview | ✅ | `app/profile/privacy.tsx`. API tests passed in CI #6. Toggles and preview confirmed by hand on Android on 2026-11-25. No automated screen tests; iOS not verified |
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
| Create an account | ✅ | Clerk plus identity sync (`webhooks/clerk`, `syncFromClerk`, `identity.ts`). `identity-sync.db.test.ts` (13 tests) passed in CI #6 |
| Build a profile: experience, education, certificates, portfolio, languages | ✅ | `/me/profile` and `/me/profile/[section]`. `candidate-profile.db.test.ts`, `candidate-routes.db.test.ts` and the web profile browser tests passed in CI #6. Mobile screens have no automated tests |
| Add skills | ✅ | `/me/skills`, `/skills`. `skills.db.test.ts`, `skill-passport.db.test.ts` and route tests passed in CI #6 |
| Receive assessment invitations | ❌ | |
| Complete assessments | ❌ | Milestone 7 |
| Assessment history | ❌ | Milestone 7 |
| See verified skill scores | 🔄 | `/me/skill-passport` and both screens; display tested with sample data in CI #6. Nothing produces a real score until Milestone 7 |
| Profile visibility and privacy settings | ✅ | `/me/profile/privacy`, `getCandidateView`. Visibility tests in `skill-passport.db.test.ts`, the privacy route test and the privacy browser test passed in CI #6 |
| Share the Skill Passport | ❌ | No share link or public passport |
| Notifications | 🗄️ | |

**Companies**

| Feature | Status | Evidence / notes |
|---|---|---|
| Register a company account | ❌ | No create path at all |
| Company profile and information | 🗄️ | `Company` model. No endpoint |
| Invite team members | 🗄️ | `CompanyInvitation`, `CompanyMember`. No endpoint |
| Search and filter candidates | ❌ | `isDiscoverable` is stored but unused |
| View a candidate's passport within their privacy settings | 🔄 | `GET /candidates/[profileId]` through `getCandidateView`, tested in CI #6. No company screen |
| Create assessments, generate with AI, set difficulty and duration | 🔄 | See §6 |
| Send assessment invitations | ❌ | |
| Track progress, review completed assessments, AI evaluation reports | ❌ | |
| Compare candidates | ❌ | |
| Assessment history | ✅ | Version history and restore (`/assessments/[id]/versions`), tested in `assessment-generation.db.test.ts` and route tests (CI #6) |
| Save candidates | ❌ | |
| Notifications | 🗄️ | |

**Platform administrators**

| Feature | Status | Evidence / notes |
|---|---|---|
| Admin role and backend check | 🔄 | `PlatformAdmin` model, `requirePlatformAdmin`. Revoked roles are ignored (`identity-sync.db.test.ts`, CI #6). No admin route uses it yet |
| Assessment management | 🔄 | Admins can **read** any company's assessments, never edit (route test "lets a platform administrator read but not edit", CI #6). No screen |
| User, company and candidate management | ❌ | |
| Reports, analytics, platform statistics | ❌ | |
| Verification and moderation, reports and complaints | ❌ | `Company.verificationStatus` exists, nothing sets it |
| Platform configuration | ❌ | |
| AI usage monitoring | 🗄️ | Token counts and estimated cost stored per AI job. No admin view |
| System activity logs | 🗄️ | `AuditLog` is written for publishes, profile changes and identity events. No viewer |
| Permissions enforced on the backend | ✅ | Every existing route uses `withAuth` and company role guards. Route role tests and database guard tests passed in CI #6 |

### §4 Candidate profiles

| Feature | Status | Evidence / notes |
|---|---|---|
| Name, headline, biography, location, contact with privacy controls | ✅ | `candidate-profile.db.test.ts`, `candidate-routes.db.test.ts` and the profile browser tests passed in CI #6 |
| Profile photo | ❌ | Shows "photo unavailable". `FileAsset` exists, but no storage (R2) is connected |
| Employment status | 🔄 | Availability (`/me/profile/availability`). Stored and read in database tests (CI #6); the update endpoint has no dedicated test |
| Experience, education, certifications, portfolio, languages | ✅ | "manages education, certificates, portfolio and languages", experience date tests and section route tests passed in CI #6 |
| Technical and soft skills | 🔄 | One skill list grouped by category (for example `communication`). There is no technical/soft split |
| Skill Passport: verified, being assessed and self-reported kept separate | ✅ | `skill-passport.ts`; `skill-passport.db.test.ts` and the passport browser test passed in CI #6 |
| Verified skill details (score, date, difficulty, status, verification) | 🔄 | Display tested with sample data (CI #6); no real scores exist until Milestone 7 |
| Verified scores are immutable | ✅ | Database triggers plus a single write path (`recordVerifiedSkillScore`). "discards direct edits to a verified score", "refuses a calculation without evidence", "never overwrites a completed evaluation" and related tests passed in CI #6 |
| Private by default | ✅ | "creates a profile with the most private defaults" and "hides a private profile from every company" passed in CI #6 |
| Profile preview ("what companies see") | ✅ | `GET /me/profile/preview`, on the privacy screen on web and mobile. "previews the filtered view for the candidate" and the privacy browser test passed in CI #6. Mobile screen confirmed by hand on Android (2026-11-25) |

### §5 Company platform

| Feature | Status | Evidence / notes |
|---|---|---|
| Company dashboard with statistics | ❌ | |
| Candidate discovery with filters | ❌ | |
| Candidate comparison | ❌ | |

### §6 AI-powered assessment system

| Feature | Status | Evidence / notes |
|---|---|---|
| Creation: title, description, skills, difficulty, question count, duration, type | ✅ | Web wizard and editor, API under `/companies/[id]/assessments` and `/assessments/[id]`. Route, database and browser tests (wizard, manual draft, editor) passed in CI #6 |
| Evaluation criteria | ✅ | Rubric editor; "refuses to publish a rubric whose weights do not total 100" passed in CI #6 |
| Passing score | ❌ | Not in the schema. Milestone 7 decided on no threshold (see disagreements) |
| Difficulty levels Beginner, Intermediate, Advanced | ✅ | `ASSESSMENT_DIFFICULTIES` in `packages/shared`, validation tests ran |
| Question types: multiple choice, true/false, short answer, scenario, practical | ✅ | Authoring only. Codec round-trip tests ran (`assessment-engine/src/engine.test.ts`). Multiple select is also supported |
| AI generation | ✅ | `packages/ai`, tests ran against a mock provider. Works for real on the website (2026-11-26) after three fixes: CORS allows `Idempotency-Key` (`4ec4444`), 90 s timeout with low thinking (`599f337`), and fallback models when one is busy (`3807875`). Default model `gemini-3.8-flash`; `gemini-2.5-flash` is closed to new API keys. Free-tier Flash models are often busy (503) |
| Structured, validated AI output | ✅ | Zod schema plus request checks plus repair prompt, `packages/ai/src/ai.test.ts` ran |
| Company reviews AI output before use | 🔄 | AI output is always a draft; a person must publish. There are no invitations to gate |
| Candidates open, read, start, answer, submit, see status and results (web and mobile) | ❌ | Milestone 7 |
| Automatic scoring of objective questions | 🔄 | `scoreObjectiveAttempt` and `calculateVerifiedSkillScore` (`assessment-engine`), tests ran. Not wired to any endpoint |
| AI evaluation against rubrics, with question scores, strengths, weaknesses, feedback, summary | 🗄️ | `Evaluation`, `EvaluationCriterionScore`, `EvaluationEvidence`, `EvaluationReview` tables and triggers. Planned after Milestone 7 |
| Provider-independent abstraction, Gemini first | ✅ | `AiProvider`, `GeminiProvider`, tests ran (adapter against a fake `fetch`) |
| JSON responses, schema validation, retries, timeouts, error handling | ✅ | `packages/ai`, tests ran |
| Usage tracking and cost controls | ✅ | Per-user, per-company and concurrency limits; usage and cost recorded. `assessment-generation.db.test.ts` passed in CI #6 |
| Evaluation versioning | 🗄️ | `promptVersion` on evaluations, `formulaVersion` on score calculations |
| Auditability | ✅ | Publishing writes an audit record in the same transaction. `audit.db.test.ts` and the publish test passed in CI #6 |

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
| Clerk authentication, sessions, webhook sync, roles | ✅ | Identity sync and role tests passed in CI #6; sign-in used by hand on web and Android |
| Social sign-in | ❓ | No code involved: Clerk's hosted pages show whichever providers are enabled in the Clerk dashboard. Check Clerk Dashboard > User & Authentication > Social connections |
| Cloudflare R2 storage | ❌ | `FileAsset` model only |
| Expo push, email | ❌ | |
| Gemini first, OpenAI later | 🔄 | Gemini adapter used for real since 2026-11-26, with fallback models on 503. No OpenAI adapter; the abstraction allows one |

### §10 Design system and user experience

| Feature | Status | Evidence / notes |
|---|---|---|
| Brand colours #222c6e and #2f5be0 | ✅ | `packages/shared/src/design/tokens.ts` (`primary`, and `accent`/`ring`). Contrast tests ran |
| Consistent spacing, typography, accessible contrast | ✅ | Design tokens, `tokens.test.ts` ran |
| Responsive layouts | ✅ | Browser tests "has no horizontal overflow" at several widths, "uses a drawer below the lg breakpoint" and "candidate screens fit a phone" passed in CI #6 |
| Subtle animations | 🔄 | Few; reduced-motion support on mobile (`use-reduced-motion.ts`) |
| Loading, skeleton, empty and error states, confirmation dialogs | ✅ | `components/ui` on both platforms. Web browser tests (loading and disabled states, dialogs, alert dialog, empty and error states on the assessment list) passed in CI #6 |
| Toast notifications | ❌ | No toast component on either platform |
| Light, dark and system appearance | ✅ | Web: browser tests "defaults to Albanian and the system theme", "system follows the device setting" and "switching theme … survives a reload" passed in CI #6. Mobile: `preferences-provider.tsx`, style unit tests ran |
| Central translations, Albanian default, English | ✅ | `packages/shared/src/i18n`, `DEFAULT_LOCALE = "sq"`. Key-parity test ran |
| Kosovo formatting: sq, Europe/Belgrade, EUR, +383 | ✅ | `REGION` in `packages/shared/src/i18n/index.ts`: `formatDate` uses the time zone, `formatCurrency` uses EUR, `formatPhone` formats +383. `i18n.test.ts` ran |
| Ready for more countries and languages | 🔄 | Region settings live in one place, but there is only one region |

### §11 Security and data protection

| Feature | Status | Evidence / notes |
|---|---|---|
| Role-based permissions, ownership checks | ✅ | Route role tests and "never lets one candidate change another's records" passed in CI #6 |
| Company data isolation | ✅ | `companyScope`, composite keys. `isolation.db.test.ts` passed in CI #6 |
| Candidate privacy | ✅ | `getCandidateView`. Visibility tests and "enforces candidate privacy for other signed-in users" passed in CI #6 |
| Server-side validation | ✅ | Every route parses input with `packages/validation`. Validation tests ran |
| Secure authentication | 🔄 | Clerk token verification, `auth.test.ts` ran with mocks. Real sign-in not verified on a device |
| Rate limiting | 🔄 | AI generation only. No general API rate limiting |
| Input sanitization | 🔄 | Zod on input, React escapes output, pattern-based content screen for assessments. No HTML is stored |
| Audit logs | ✅ | Written for key actions, append-only. `audit.db.test.ts` passed in CI #6 |
| Secure file access | ❌ | No file storage yet |
| No unauthorized access to assessments | ✅ | Same 403 for missing, foreign and deleted; candidates never receive answer keys. Route tests passed in CI #6 |
| Submission integrity | 🗄️ | Immutable-submission triggers, tested in `assessments.db.test.ts` (CI #6). No submission endpoints yet |
| No unauthorized score changes | ✅ | Triggers plus a single write path. Score tests in `skills.db.test.ts` passed in CI #6 |

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
| 1–6 | Foundations, database, auth, profiles and Skill Passport, design system and i18n, assessment creation | | Built. Database, route and browser tests passed in CI #6 |
| 7 | Candidates take assessments; **automatic** scoring of objective questions; verified scores | Loop steps 3–5 | In progress (slices 1–16 of 21 done) |
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
- Starting an attempt requires a candidate profile; without one the API refuses with `profile_required` and the app asks the candidate to create a profile first.
- Every attempt counts toward `maxAttempts`, including expired and abandoned ones, so nobody can look at the questions and then retake.
- Submissions get a 30-second grace period after the deadline, on the server only. The phone shows the exact deadline.
- The Take screen asks for confirmation before starting: the timer starts now, and this uses 1 of N attempts.
- No pass threshold in Milestone 7.
- Formula `auto-v1`: difficulty-weighted average; confidence = min(100, 5 × answered questions). A level label (Beginner < 40 ≤ Intermediate < 60 ≤ Advanced < 80 ≤ Expert) is shown only when confidence ≥ 50; below that, "more assessments needed".
- Candidates see overall and per-skill scores after submitting, never the correct answers.
- Candidates pick from published `PUBLIC` assessments. Companies get no access to attempts or results until Milestone 10.

| # | Slice | Status |
|---|---|---|
| 1 | Pure scoring function `scoreObjectiveAttempt` (`assessment-engine`) | ✅ `432aa97`, tests ran |
| 2 | Formula `auto-v1` and level labels (`assessment-engine`, `shared`) | ✅ `eb636e5`, tests ran |
| 3 | Migration: `AUTOMATIC` evaluator type with its CHECK constraint | ✅ `9e812f1`, database tests passed in CI #8 and #9 |
| 4 | `recordVerifiedSkillScore` runs inside an existing transaction | ✅ `b153b9f`, database tests passed in CI #13 |
| 5 | Validation schemas for start, answers and result (no answer fields) | ✅ `be82b0f`, tests ran |
| 6 | Repository: list takeable assessments, start an attempt (profile required), candidate view | ✅ `1de3f5c`, database tests passed in CI #13 |
| 7 | API: list, start, read an attempt | ✅ `fb4f6f2`, route tests passed in CI #13 |
| 8 | Repository and API: submit, with a 30-second server-side grace period | ✅ `b21fdcc`, database and route tests passed in CI #13 |
| 9 | `scoreAttempt`: evaluation, criterion scores, verified score, in one transaction. Adds `evaluation_skill_results` (decided 2026-11-25: per-skill results are stored, not re-scored from old answers). A criterion linked to a skill gets that skill's percentage, any other the overall one; rubric weights do not affect automatic scores | ✅ `d186576`, `09906fc`, PR #8, CI green |
| 10 | Result endpoint, lazy expiry, re-trigger after about a minute. Decided 2026-11-26: a permanent scoring error (such as an unreadable question) is recorded as a `FAILED` evaluation and the result state is `failed`, with no retry; a temporary error records nothing and is retried | ✅ `9bd1564`, CI green |
| 11 | api-client methods | ✅ `e57b872`, PR #10, CI green |
| 12 | **Dev-only demo seed:** a demo company and 2–3 published, fully objective `PUBLIC` assessments (multiple choice, true/false, multiple select; a couple of skills; mixed difficulty) for testing on a phone. Refuses to run unless the database is local or a Neon branch named explicitly by ID that the server confirms is not `main`, and always when `NODE_ENV=production`. Database test: running it twice creates no duplicates, and the guard refuses unsafe targets | ✅ `95c638f`, PR #10, CI green; run on the dev database 2026-11-26 |
| 13 | Mobile: browse assessments | ✅ `7e21dfd`, PR #11; checked on an Android phone with the demo data |
| 14 | Mobile: take an assessment. Confirm before starting ("the timer starts now, this uses 1 of N attempts") | |
| 15 | Mobile: result screen and Skill Passport changes | `5fb469b`. Checked on an Android phone 2026-11-26: JavaScript intermediate 10/10 answered, result shown; Skill Passport shows JavaScript level Intermediate (score 50/100, confidence 50%), TypeScript and React "More assessments needed". Combining checked the same day: JavaScript basics 60% (3/5, weight 1.0) plus the latest JavaScript intermediate retake 60% (6/10, weight 1.2) gave score 60, confidence 75% and 2 evidence items, as `auto-v1` predicts |
| 16 | Navigation, mobile and web: show company authoring only to company members, under a "Company" section; for candidates, "Assessments" means browse and take. Today candidates who open "Assessments" see "You are not a member of a company yet." (found on the phone, 2026-11-26) | ✅ `c9e7960`, PR #16; the Company section was confirmed on a member account after the demo-member seed (`93718d8`) |
| 17 | Web: browse assessments (as slice 13). Also add the "Level" row (or "More assessments needed") to the web Skill Passport, which mobile already has | |
| 18 | Web: take an assessment, with the same confirmation (as slice 14), including "the timer keeps running" | |
| 19 | Web: result screen with the Skill Passport level per skill (as slice 15) | |
| 20 | Authoring notice, web and mobile: when a company publishes (or views) an assessment that contains short-answer, scenario or practical questions, say that candidates cannot take it yet, because automatic scoring covers only multiple choice, true/false and multiple select until AI evaluation with human review (Milestone 12). Today such an assessment publishes without a warning and silently never appears to candidates | |
| 21 | Docs: `assessments.md`, `PROGRES.md`, this file | |

### Loading, offline and timeouts (found on the phone, 2026-11-26)

- **Problem:** in airplane mode, mobile Edit profile showed skeletons forever. TanStack Query learns about connectivity from browser events, which React Native lacks, so it never knew the phone was offline, and the request never finished.
- **Request timeout** (`api-client-timeout`): every API request, including getting the session token, fails after 15 s with `TIMEOUT`, shown as the network error with Try again. Unit tests in `@skillprove/api-client`. **Checked on an Android phone on 2026-11-26** (built from the timeout branch, without the offline message): in airplane mode, Edit profile showed "This could not be loaded / SkillProve could not be reached" with Try again; back online, the profile loaded.
- **Offline state** (`mobile-profile-load-errors`): `expo-network` feeds TanStack's online manager, so offline queries pause and resume by themselves; the mobile profile editing screens show "No connection. Check your internet." with Try again, and the web shows it in the app shell. Failed loads no longer look like "no profile yet". Unit tests for `loadState` and the connectivity mapping; browser test for the web notice. The "No connection" message has **not yet been checked on a phone**; re-test once both branches are on `main`.
- **Still to do:** use the same loading / offline / error states on every mobile screen (profile overview, Skill Passport, Take, attempt, result, company).
