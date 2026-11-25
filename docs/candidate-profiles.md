# Candidate profiles and Skill Passport

Candidates manage their own profile and Skill Passport through `/api/v1`. Web and mobile both use the typed client in `packages/api-client`. Request and response schemas are the Zod schemas in [packages/validation/src/candidate.ts](../packages/validation/src/candidate.ts); the tables below name them.

## Rules

- **Ownership.** Every `/me/...` endpoint works only on the signed-in user's own records. IDs in a path are looked up inside the caller's profile, so another candidate's ID gives the same 404 as a missing one.
- **Concurrent updates.** Every update sends `expectedUpdatedAt`, the `updatedAt` the client last read. If the record has changed since, the API returns `409 CONFLICT` and nothing is written.
- **Self-reported and verified skills stay separate.** `UserSkill` holds what the candidate claims. `VerifiedSkillScore` holds verified results and is written only by `recordVerifiedSkillScore`, which no endpoint reaches. No request schema has a score or verification field.
- **Privacy is applied by the API**, not just hidden by the UI. See [Privacy](#privacy).
- **Validation.** All input is parsed with the shared schemas. A `400 BAD_REQUEST` includes `error.fields`, mapping each field to a message key under `validation.` in the translations.
- **Audit.** Profile creation, profile deletion and privacy changes are recorded in `audit_logs`, with IDs, the new visibility and the names of the fields changed. Names, emails and other personal values are never written there.

## Endpoints

All require a session token. Responses use `{ success, data }` or `{ success: false, error: { code, message, fields? } }`.

| Method and path | Body | Response | Notes |
|---|---|---|---|
| `GET /me/profile` | | `ownProfileSchema` | 404 if the user has no profile yet |
| `POST /me/profile` | `profileInputSchema` | `ownProfileSchema`, 201 | One per user; a second gives 409. Availability and privacy start at the most private defaults |
| `PUT /me/profile` | `profileUpdateSchema` | `ownProfileSchema` | Replaces the basic details |
| `DELETE /me/profile` | | `{ deleted: true }` | Removes the profile and its sections; skills and verified results are kept |
| `PUT /me/profile/availability` | `availabilityInputSchema` | `ownProfileSchema` | |
| `PUT /me/profile/privacy` | `privacyInputSchema` | `ownProfileSchema` | The whole privacy choice at once; audited |
| `GET /me/profile/preview` | | `profilePreviewSchema` | The profile filtered as an allowed company would see it |
| `POST /me/profile/{section}` | `sectionCreateSchemas[section]` | the item, 201 | `section` is `experiences`, `education`, `certificates`, `portfolio` or `languages` |
| `PUT /me/profile/{section}/{id}` | `sectionUpdateSchemas[section]` | the item | Languages can change only their level |
| `DELETE /me/profile/{section}/{id}` | | `{ deleted: true }` | |
| `GET /skills?q=&cursor=&limit=` | | `skillSearchResultSchema` | Active skills; `limit` 1 to 50; `nextCursor` pages forward |
| `POST /me/skills` | `selfReportedSkillInputSchema` | `selfReportedSkillSchema`, 201 | Self-reported only |
| `PUT /me/skills/{skillId}` | `selfReportedSkillUpdateSchema` | `selfReportedSkillSchema` | Level and years only |
| `DELETE /me/skills/{skillId}` | | `{ deleted: true }` | |
| `GET /me/skill-passport` | | `skillPassportSchema` | `verified`, `inAssessment` and `selfReported`, as separate lists |
| `GET /candidates/{profileId}` | | `candidateViewSchema` | Another user's profile, filtered by privacy. 404 when not allowed |

Endpoints that return skill names accept `?locale=sq|en`. Without it they use the user's saved language.

Limits per profile: 50 experiences, 30 education entries, 50 certificates, 50 portfolio items, 20 languages, 100 self-reported skills, and 15 interests or technologies. The database enforces the list sizes too.

## Skill Passport

| List | Source | Contents |
|---|---|---|
| `verified` | `VerifiedSkillScore` and its calculation | Score, confidence, assessment count, highest difficulty and last verified date exactly as recorded. Evidence: each evaluation's assessment title, completion date and review status |
| `inAssessment` | `AssessmentAttempt` | Skills measured by an attempt that is in progress and not past its expiry, or submitted with no completed evaluation |
| `selfReported` | `UserSkill` | The candidate's own level and years |

`evidenceStatus` is `OUTDATED` when an evaluation behind the current calculation was later superseded or rejected in review, and `CURRENT` otherwise. The data model has no time-based expiry, so evidence is never marked outdated by age.

## Privacy

`CandidatePrivacySettings.visibility` decides who can open a profile through `GET /candidates/{profileId}`:

| Visibility | Who can see it |
|---|---|
| `PRIVATE` (default) | Nobody else |
| `VERIFIED_COMPANIES` | Active members of a company whose `verificationStatus` is `VERIFIED` |
| `ALL_COMPANIES` | Active members of any company that is not deleted |
| `PUBLIC` | Any signed-in user |

Memberships are read from the database for each request. Being signed in is never enough on its own. A profile whose owner is suspended or deleted is hidden from everyone else.

When a profile is visible, the response always includes the name, headline, biography, interests, availability, languages and self-reported skills. Everything else depends on a setting, and hidden sections are `null`:

| Setting | Shows |
|---|---|
| `showContactEmail` | Contact email, LinkedIn, GitHub and website |
| `showPhoneNumber` | Phone number |
| `showLocation` | City and country |
| `showExperience` | Experience |
| `showEducation` | Education and certificates |
| `showVerifiedSkills` | Verified skills: score, confidence, count, difficulty, date and evidence status. Never the evidence itself, which could name assessments the viewer's company does not own |
| `isVisible` on a portfolio item | That item |

Privacy is a visibility level plus these detail toggles. There is no per-company sharing list: it was dropped for now and may return as a possible future feature (milestone 8).

`isDiscoverable` is stored but has no effect yet; it is for company search, a later milestone. There is no listing or search endpoint.

## Not implemented

- **Uploads.** No file storage is connected, so there is no profile photo, certificate document or portfolio file upload. Initials are shown instead of a photo. Responses say only whether a document exists (`hasDocument`) and never include a file URL.
- **Date pickers on mobile.** Dates are typed as YYYY-MM-DD.
- **Company-facing screens.** Viewing candidates is available only through the API.
