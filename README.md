# SkillProve

People should demonstrate their skills rather than simply claim them.

SkillProve is a skills verification and recruitment platform. **Current state:** candidates can sign in (Clerk), build a profile, keep a Skill Passport that separates self-reported from verified skills, and control profile privacy (private by default), in Albanian and English on mobile and web. Companies can create assessments by hand or with AI generation. **Not built yet:** candidates taking assessments, scoring, and verified results; per-company profile sharing; candidate search and hiring tools. Authentication needs Clerk keys. See [docs/authentication.md](docs/authentication.md) and [PROGRES.md](PROGRES.md) (in Albanian).

## Setup

Requires Node 24 and Corepack, which ships with Node.

```sh
corepack enable pnpm   # needs an administrator terminal on Windows
pnpm install
pnpm db:generate
```

Copy each `.env.example` to the file it names: `apps/api/.env.local`, `apps/web/.env.local`, `apps/mobile/.env` and `packages/database/.env`. See [docs/database.md](docs/database.md) to connect a database. The API runs without one, and readiness reports 503.

## Run

| App | Command | Address |
|---|---|---|
| API | `pnpm --filter @skillprove/api dev` | http://localhost:4000/api/v1/health |
| Web | `pnpm --filter @skillprove/web dev` | http://localhost:3000 |
| Mobile | `pnpm --filter @skillprove/mobile dev` | Scan the QR code with Expo Go |

To try mobile on an Android phone: run the API and mobile commands, connect the phone to the same Wi-Fi as the computer, then scan the QR code with an up-to-date Expo Go. The status screen should show API as Connected.

If the QR code uses the wrong network address, set `REACT_NATIVE_PACKAGER_HOSTNAME` to the computer's Wi-Fi IP before starting Expo.

## Check

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build      # for browser tests, build with NEXT_PUBLIC_API_URL=http://localhost:4100
pnpm test:e2e   # uses the installed Chrome
```

Tests that need a database are skipped without one; skipped tests do not count as passed.

Architecture decisions are in [docs/decisions](docs/decisions/README.md).
