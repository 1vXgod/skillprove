# Authentication and authorization

Clerk is the source of truth for who someone is. PostgreSQL is the source of truth for what they may do in SkillProve.

## Status

All three apps use one Clerk application, `app_3LZBXVJ9ZWv8j3okBi2662Vqohy`, with development keys only.

| Flow | Code | Tested against real Clerk |
|---|---|---|
| Token verification, webhooks, sync, authorization | Done | Partly. The API rejects missing and forged tokens with the real keys. Valid tokens and webhooks are tested only with locally signed ones |
| Web sign-in, sign-up, verification, recovery, sign-out | Done, through Clerk's components | Partly. The real forms render and `/account` redirects to `/sign-in`. No account has signed in yet |
| Mobile sign-in, sign-up, verification, recovery, sign-out | Done, through Clerk's hosted pages | No |
| Google and Apple | Enabled in Clerk's dashboard, with no app code | No |

## How it fits together

- **Web** uses `<SignIn />`, `<SignUp />` and `<UserButton />` from `@clerk/nextjs`. `/account` is protected.
- **Mobile** uses `useHostedAuth()` from `@clerk/expo`, which opens Clerk's Account Portal in a browser session and returns to the app. It works in Expo Go. `tokenCache` keeps the session in `expo-secure-store`.
- Prebuilt and hosted flows were chosen over custom forms because they already handle verification, recovery, bot protection, multi-factor steps and enumeration protection.
- **Both clients** send `Authorization: Bearer <session token>` through `packages/api-client`, fetching a current token for each request.
- **The API** verifies every token itself with `@clerk/backend`.

Without keys, each app still runs. Auth screens say sign-in is not configured, and the API's private routes return 503. Nothing pretends to work.

## Clerk dashboard setup

1. Create one Clerk application, used by web and mobile. Keep development and production instances separate.
2. **Native applications:** enable the Native API. Before a production build, register the iOS bundle ID and Android package, both currently `com.skillprove.app`.
3. **User & authentication:** enable email address, password and email verification. Enable Google and Apple if you want them.
4. **Bot protection and enumeration:** review Clerk's attack protection settings, which are controlled there.
5. **API keys:** copy the publishable and secret keys into the files below.
6. **Webhooks:** add an endpoint at `https://<api host>/api/v1/webhooks/clerk`, subscribed to `user.created`, `user.updated` and `user.deleted`. Copy its signing secret.

### Webhooks in local development

Clerk needs a public URL, so run a tunnel to port 4000, such as `ngrok http 4000`. Without webhooks, a user is still created on their first authenticated request, but changes and deletions are not noticed.

### Google and Apple

Clerk's development instance provides shared Google credentials. Production needs your own:

- **Google:** create an OAuth client in Google Cloud and enter it in Clerk, using the redirect URI Clerk shows.
- **Apple:** needs an Apple Developer membership, with the Services ID, key and team ID entered in Clerk.

## Environment variables

| App | File | Variables |
|---|---|---|
| API | `apps/api/.env.local` | `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, optional `CLERK_JWT_KEY` |
| Web | `apps/web/.env.local` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` |
| Mobile | `apps/mobile/.env` | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` |

To refill the publishable and secret keys, run `npx clerk@latest env pull --app app_3LZBXVJ9ZWv8j3okBi2662Vqohy --instance dev --print` and copy the two values into the variables above. Do not run `clerk env pull` without `--print` or `clerk init` here: they write their own files, and `apps/api/.env.local` also holds the database settings. The webhook secret comes only from the dashboard.

The webhook variable uses Clerk's official name, `CLERK_WEBHOOK_SIGNING_SECRET`. Variables with a `NEXT_PUBLIC_` or `EXPO_PUBLIC_` prefix are public, so a secret must never have one.

## Phone testing with Expo Go

Manual checks so far were done on an iPhone (iOS) with Expo Go; Android has not been verified. After a code change, reload the app (press `r` in the Metro terminal) before testing, or the phone keeps the old bundle.

1. Add keys to `apps/mobile/.env` and `apps/api/.env.local`.
2. Run the API and mobile apps as in the README. Restart Expo after changing `.env`.
3. Scan the QR code and tap **Sign in** or **Create account**.
4. After returning to the app, it should show "Signed in as ...". That line comes from the API, so it proves the whole path.

If the browser does not return to the app, check the redirect URL Clerk reports for Expo Go. A development build is needed for native Google or Apple sign-in, and for Clerk's native components, but not for the hosted flow.

## Account synchronization

| Trigger | What happens |
|---|---|
| `user.created` or `user.updated` webhook | Reads the user from Clerk's API and applies that state |
| `user.deleted` webhook | The same read. A 404 anonymizes the local user |
| First request, before any webhook | The same read, creating the local user |

**Reading current state, rather than trusting each event's payload,** is what makes the following safe, with no event tracking table:

- **Duplicates:** the second run finds no change and writes nothing.
- **Out of order:** an old `updated` for a deleted user gets a 404, so it cannot revive them. A stale `deleted` for a live user finds them alive and does nothing.
- **Concurrent deliveries:** a unique key conflict is retried.

**Identity rules:**

- Users match on Clerk's user ID (`User.authSubject`) only. Accounts are never merged by email.
- Only a verified primary email is stored.
- A verified email held by another local user is not stored. The new user keeps a null email, and `identity.email_conflict` is logged.
- New users get no roles.
- Audit records (`identity.user_created`, `identity.email_changed`, `identity.email_conflict`, `identity.user_anonymized`) hold IDs only, with no emails.

**Deletion** follows the policy in [database.md](database.md): the profile, claimed skills, notifications and devices are deleted, submitted content and evidence excerpts are erased, memberships and platform roles end, and the user is anonymized. Scores and audit records remain.

## API protection

1. **Deny by default:** `apps/api/src/proxy.ts` returns 401 for any `/api/v1` path with no bearer token, unless listed in `lib/public-routes.ts`. Only the health and webhook paths are listed.
2. **Verification:** `withAuth` verifies the token with Clerk's SDK and loads the local user. Every private route must use it. The proxy only checks that a token is present.
3. **Status:** non-active users get 403.

Errors are always `{ success: false, error: { code, message } }`, with 401 for unauthenticated, 403 for no permission and 503 for missing configuration.

**Choices worth knowing:**

- **Cookies are ignored.** The API accepts bearer tokens only, so CSRF does not apply to it.
- **`azp` is checked separately,** not through Clerk's `authorizedParties` option, which rejects tokens with no `azp`. Native apps may produce those. A token with a web origin must match `CORS_ALLOWED_ORIGINS`. A token with no web origin is allowed. Check this assumption during the first real device test.
- **Identity headers and role claims are never read.**

## Authorization

Guards are in `apps/api/src/lib/auth/guards.ts`, and pure rules are in `packages/permissions`.

| Guard | Passes when |
|---|---|
| `requireAuthenticatedUser` | Token is valid and the local user is active |
| `requirePlatformAdmin` | Active `PlatformAdmin` row with an admin-level role |
| `requireCompanyMembership` | Active membership of that company, which is not deleted. Returns `companyScope` |
| `requireCompanyRole` | As above, with an allowed role |
| `requireCandidateAccess` | The user is that candidate |

Company data access starts from `requireCompanyMembership`, so `companyScope` is only reached after the check. Unknown, malformed and other companies' IDs all return the same 403.

### Role names

The schema's role names were kept, so that no migration was needed:

| Term in requirements | In the database |
|---|---|
| `PLATFORM_ADMIN` | `PlatformAdmin` with role `SUPER_ADMIN` or `ADMIN` |
| `EVALUATOR` | `CompanyRole.REVIEWER` |

`VIEWER`, `SUPPORT` and `CONTENT_REVIEWER` also exist. Support and content reviewers do not pass `requirePlatformAdmin`.

No endpoint can assign roles yet, so nobody can grant themselves one. The first platform admin must be added directly in the database by an operator.

### Row-level security

Not used. See [decision 8b](decisions/README.md).

## Known limitations

- Nothing has been tested against a real Clerk instance, real email, Google or Apple.
- **No API rate limiting.** Clerk rate-limits its own sign-in endpoints, and the API's only public write is the signed webhook. In-memory limits do not work across serverless instances, so shared limiting should arrive with Redis or the hosting platform.
- **File objects are not deleted** on anonymization, since R2 is not connected. Rows are marked `DELETED`.
- **Sole owners:** deleting a company's only owner leaves it with none. There is no recovery flow yet.
- **Email conflicts** have no resolution flow. The user keeps a null email until handled.
- **Mobile account management** is not in the app. It is available on the web `/account` page.
- **A suspended user's** Clerk session stays valid, but the API returns 403.
- Open redirect protection on web relies on Clerk's redirect validation. It was not tested here.
