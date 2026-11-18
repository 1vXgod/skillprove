# PROGRES — SkillProve

Gjendja sipas kodit, e verifikuar më 2026-11-18. `pnpm lint` dhe `pnpm typecheck` kalojnë; `pnpm test` kalon me 71 teste API dhe 20 teste databaze, ndërsa **34 teste API dhe 103 teste databaze u anashkaluan** (mungon baza testuese) dhe nuk llogariten si të kaluara.

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
- **Privatësia:** ka dukshmëri dhe kalime për detajet; **nuk ka listë kompanish** që zgjedh kush e sheh profilin (as tabelë, as endpoint).
- **Zgjedhja e gjuhës:** në mobile ka buton SQ/EN në krye të aplikacionit (`apps/mobile/src/components/shell/screen.tsx`), para dhe pas hyrjes, dhe te Cilësimet. Hyrja vetë është ekrani i Clerk-ut pa zgjedhës të veçantë. Web nuk u kontrollua.
- **Aftësitë e verifikuara:** shfaqja dhe ruajtja ekzistojnë, por asgjë nuk i prodhon ende, kështu që seksioni është bosh.
- **Hyrja në mobile** kërkon `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`; pa të shfaqet mesazh "nuk është konfiguruar".

## Nuk është nisur
- Marrja e vlerësimeve nga kandidati, dorëzimet, vlerësimi dhe rezultati i verifikuar (Milestone 7).
- Lista e kompanive në privatësi.
- Kërkimi i kandidatëve nga kompanitë, mjetet e punësimit, pagesat.

## Probleme të njohura
- Testet e rrugëve dhe të bazës janë anashkaluar këtu; rregullat e privatësisë dhe të "verifikuarat nuk ndryshohen" nuk janë provuar kundër një baze reale.
- Asnjë test në pajisje reale; iOS i paverifikuar.

## Hapi tjetër
1. Ngrit një bazë PostgreSQL provë (jo Neon `main`), ekzekuto `pnpm test` dhe bëji të kalojnë 137 testet e anashkaluara.
2. Ekipi rishikon kodin kryesor (auth, profili, Skill Passport, privatësia, assessments) që secili ta shpjegojë pjesën e vet.
3. Vendos nëse lista e kompanive në privatësi ndërtohet apo hiqet nga HARTA.
4. Fillo Milestone 7 me hapa të vegjël (nisja e tentativës, dorëzimi, vlerësimi, rezultati i verifikuar).

## Milestones (emërtimet 1–5 dhe 7–12 janë të Claude-it, jo të projektit)
Në dokumente emërtohen vetëm Milestone 6 dhe 7. Pjesa tjetër është rindërtuar nga migrimet, commit-et dhe dokumentet.

| # | Milestone | Statusi |
|---|---|---|
| 1 | Themelet: monorepo, konfigurimi, CI, health, CORS | ✅ Gati |
| 2 | Baza e të dhënave: përdorues, kompani, aftësi, vlerësime, rezultate, audit, triggera | ✅ Gati |
| 3 | Autentikimi: Clerk, webhook, `withAuth`, lejet | ✅ Gati |
| 4 | Profili i kandidatit, Skill Passport, privatësia | ✅ Gati |
| 5 | Design system dhe i18n (shqip/anglisht) | ✅ Gati |
| 6 | Krijimi i vlerësimeve (me dorë ose me AI) | ✅ Gati |
| 7 | Marrja dhe vlerësimi i testeve, rezultatet e verifikuara | ⏭️ Tjetri |
| 8 | Privatësia: lista e kompanive (ose heqja nga HARTA) | ⏳ Jo e nisur |
| 9 | Pjesa e kompanisë: kërkimi i kandidatëve, dashboard, anëtarët | ⏳ Jo e nisur |
| 10 | Mjetet e punësimit: aplikime, intervista, njoftime | ⏳ Jo e nisur |
| 11 | Gatishmëria për prodhim: Sentry, ruajtja e skedarëve, radhë punësh, rate limiting, baza e prodhimit, përditësimi i Next.js | ⏳ Jo e nisur |
| 12 | Pagesat/abonimet dhe tregjet jashtë Kosovës | ❌ Jashtë tani |
