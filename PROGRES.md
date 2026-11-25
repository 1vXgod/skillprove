# PROGRES — SkillProve

> Gjendja e plotë veçori për veçori, krahasuar me [vizionin](docs/VISION.md), dhe roadmap-i nga milestone 8 e tutje janë te [docs/STATUS.md](docs/STATUS.md). Ky skedar mban shënimet e punës dhe hapin tjetër.

Gjendja sipas kodit, përditësuar më 2026-11-25. **CI #6** (bashkimi i PR #3) kaloi gjithçka: `@skillprove/database` 123/123 dhe `@skillprove/api` 105/105, **0 të anashkaluara**, si dhe `db:migrate:deploy`, build-i dhe testet në shfletues (`test:e2e`). Lokalisht, pa bazë testuese, 137 testet e bazës dhe të rrugëve ende anashkalohen; ato llogariten sepse i ekzekutoi CI.

## Çfarë funksionon
| Veçoria | Skedarët |
|---|---|
| Hyrja dhe regjistrimi (Clerk) | `apps/mobile/src/app/_layout.tsx`, `apps/mobile/src/components/account-panel.tsx`, `apps/web/src/app/(auth)/sign-in`, `apps/api/src/lib/auth/`, `apps/api/src/app/api/v1/webhooks/clerk/route.ts` |
| Profili im (përvoja, edukimi, certifikatat, portfolio, gjuhët, disponueshmëria) | `apps/mobile/src/app/profile/*.tsx`, `apps/api/src/app/api/v1/me/profile/` |
| Skill Passport (të vetëdeklaruara, të ndara nga të verifikuarat) | `apps/mobile/src/app/skill-passport.tsx`, `apps/mobile/src/app/profile/skill.tsx`, `apps/api/src/app/api/v1/me/skills/`, `.../me/skill-passport/route.ts` |
| Privatësia (private si parazgjedhje, kalime për detajet) | `apps/mobile/src/app/profile/privacy.tsx`, `apps/api/src/app/api/v1/me/profile/privacy/route.ts`, `.../candidates/[profileId]/route.ts` |
| Shqip dhe anglisht | `packages/shared/src/i18n/messages/sq.ts`, `en.ts`, `apps/mobile/src/app/settings.tsx` |
| Mbrojtja e të dhënave | Triggera në `packages/database/prisma/migrations/`, `test-database-guard.ts`, `.github/workflows/ci.yml` |

## Çfarë u ndërtua përtej HARTA-s origjinale
Milestone 6 (commit `df1d6f7`, një commit i vetëm me 98 skedarë) shtoi **krijimin e vlerësimeve**, me dorë ose me AI. I gjithë kodi (milestones 1–6) është gjeneruar nga Claude Code. Ekipi e ka drejtuar agjentin, ka shkruar dokumentet dhe ka bërë bisedat me përdorues.
- API: `apps/api/src/app/api/v1/assessments/`, `.../ai/jobs/`, `.../companies/[companyId]/assessments/`
- Paketat: `packages/ai` (Gemini, prompts), `packages/assessment-engine`
- Web: `apps/web/src/app/(auth)/(app)/assessments/`
- Mobile: `apps/mobile/src/app/assessments/`
- Modelet e kompanisë dhe roleve: `Company`, `CompanyMember`, `packages/permissions`

Pjesa e kandidatit që *merr* vlerësime nuk ekziston ende.

## Pjesërisht gati
- **Zgjedhja e gjuhës:** në mobile ka buton SQ/EN në krye të aplikacionit (`apps/mobile/src/components/shell/screen.tsx`), para dhe pas hyrjes, dhe te Cilësimet. Hyrja vetë është ekrani i Clerk-ut pa zgjedhës të veçantë. Web nuk u kontrollua.
- **Aftësitë e verifikuara:** shfaqja dhe ruajtja ekzistojnë, por asgjë nuk i prodhon ende, kështu që seksioni është bosh.
- **Hyrja në mobile** kërkon `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`; pa të shfaqet mesazh "nuk është konfiguruar".

## Nuk është nisur
- Marrja e vlerësimeve nga kandidati, dorëzimet, vlerësimi dhe rezultati i verifikuar (Milestone 7).
- Ndarja e profilit sipas kompanisë: vendim më 2026-11-18 ta heqim për tani. Privatësia = dukshmëri + kalime për detajet. Mund të vijë më vonë (tani milestone 17 te STATUS.md).
- Kërkimi i kandidatëve nga kompanitë, mjetet e punësimit, pagesat.

## Probleme të njohura
- Ekranet mobile nuk kanë teste automatike. Në Android u kontrollua me dorë hyrja dhe skeda Profili (2026-11-25); pjesa tjetër e rrjedhës në telefon nuk është konfirmuar ende. iOS i paverifikuar.
- Baza e zhvillimit (Neon `main`) ishte 2 migrime prapa (`20261104120000_candidate_interests_technologies`, `20261105100000_assessment_generation`), prandaj skeda Profili jepte gabim 500 në web dhe mobile. U aplikuan me `pnpm db:migrate:deploy` më 2026-11-25; `migrate status` tani thotë që skema është e përditësuar. Do të shtohet një kontroll në `/health/ready` për migrimet e paaplikuara.

## Hapi tjetër
1. ~~Bëj që 137 testet e bazës të ekzekutohen~~: u krye në CI #6.
2. Ekipi rishikon kodin kryesor (auth, profili, Skill Passport, privatësia, assessments) që secili ta shpjegojë pjesën e vet.
3. Vazhdo Milestone 7 me hapa të vegjël (hapat 1–2 gati; hapi 3 është migrimi për vlerësuesin `AUTOMATIC`). Lista e plotë e hapave është te [docs/STATUS.md](docs/STATUS.md#milestone-7-plan).
   Vendim më 2026-11-25: vlerësimi në Milestone 7 është **vetëm automatik**, për pyetjet objektive. Vlerësimi me AI me rishikim nga njeriu vjen më vonë.

## Milestones (emërtimet 1–5 janë të Claude-it, jo të projektit)
Në dokumente emërtohen vetëm Milestone 6 dhe 7. Pjesa tjetër është rindërtuar nga migrimet, commit-et dhe dokumentet.

| # | Milestone | Statusi |
|---|---|---|
| 1 | Themelet: monorepo, konfigurimi, CI, health, CORS | ✅ Gati |
| 2 | Baza e të dhënave: përdorues, kompani, aftësi, vlerësime, rezultate, audit, triggera | ✅ Gati |
| 3 | Autentikimi: Clerk, webhook, `withAuth`, lejet | ✅ Gati |
| 4 | Profili i kandidatit, Skill Passport, privatësia | ✅ Gati |
| 5 | Design system dhe i18n (shqip/anglisht) | ✅ Gati |
| 6 | Krijimi i vlerësimeve (me dorë ose me AI) | ✅ Gati |
| 7 | Marrja dhe vlerësimi i testeve, rezultatet e verifikuara | 🔄 Në punë (hapat 1–2 nga 16) |

Roadmap-i nga milestone 8 e tutje (vendosur më 2026-11-25: M8 regjistrimi i kompanive → M9 ftesat → M10 rezultatet për kompanitë → M11 kërkimi → M12 vlerësimi me AI me rishikim nga njeriu → …) është te [docs/STATUS.md](docs/STATUS.md#roadmap).
