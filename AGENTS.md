# AGENTS — SkillProve

Ky dokument i tregon agjentit (dhe çdo zhvilluesi të ri) çfarë është SkillProve, çfarë lejohet dhe si duhet punuar. Rregullat teknike të hollësishme janë në [CLAUDE.md](CLAUDE.md) dhe në [docs/](docs/decisions/README.md).

## Ideja
SkillProve i ndihmon kandidatët të **dëshmojnë** aftësitë e tyre, jo vetëm t'i deklarojnë. Një CV tregon çfarë thotë dikush; SkillProve synon të tregojë çfarë është e vërtetë. Fillon në Kosovë, në shqip dhe anglisht. Tri biseda me të rinj (shih [BISEDAT.md](BISEDAT.md)) konfirmuan se CV-ja nuk mjafton, se do të bënin teste praktike të shkurtra dhe të drejta, dhe se duan të vendosin vetë kush e sheh profilin.

## Rrjedha kryesore
`Regjistrimi → Profili im → Skill Passport → Privatësia` (shih [HARTA.md](HARTA.md)).

## Rregullat e produktit
1. **Aftësitë e verifikuara nuk shkruhen kurrë nga aplikacioni.** Ato ndryshojnë vetëm përmes `recordVerifiedSkillScore` (`packages/database/src/repositories/verified-skill-scores.ts`). Asnjë endpoint nuk e arrin dhe asnjë skemë kërkese nuk ka fushë rezultati.
2. **Aftësitë e vetëdeklaruara dhe të verifikuara mbahen të ndara** (`UserSkill` dhe `VerifiedSkillScore`).
3. **Profili është privat si parazgjedhje.** Kushdo që nuk është pronari e sheh profilin vetëm përmes `getCandidateView`, që zbaton cilësimet e privatësisë.
4. **Çdo tekst i dukshëm vjen nga `@skillprove/shared/i18n`**, në shqip dhe anglisht.
5. **Mos ndërto veçori false.** Çka s'është gati shënohet si e papërfunduar.

## Stack-u real
- **Mobile:** Expo Router (`apps/mobile`), për kandidatët.
- **API:** Next.js REST nën `/api/v1` (`apps/api`). Vetëm ai prek bazën e të dhënave.
- **Web:** Next.js (`apps/web`), klient i API-t.
- **Auth:** Clerk.
- **Baza:** PostgreSQL në Neon, me Prisma (`packages/database`).
- **Monorepo:** pnpm + Turborepo; paketat e përbashkëta janë `shared`, `validation`, `api-client`, `permissions`, `ai`, `assessment-engine`.

Nuk përdoret Supabase.

## Si punon agjenti
- **Hapa të vegjël.** Një ndryshim i qartë në një kohë.
- **Një commit për çdo hap.** Mos kombino ndryshime të palidhura.
- **Shpjego çdo ndryshim** para dhe pas tij, me rrugët e skedarëve.
- **Mos bëj commit, push ose deploy pa u kërkuar.** Trego diff-in para commit-it.
- **Asnjëherë mos commit-o sekrete.** `.env` është në `.gitignore`; vetëm `.env.example` futet në git. Mos i ngjit çelësat në bisedë.
- **Mos ekzekuto teste kundër Neon `main` ose prodhimit.** Mos përdor `prisma db push` ose reset në baza të përbashkëta.
- **Mos thuaj që një test kaloi nëse nuk është ekzekutuar.** Testet e anashkaluara (pa bazë të dhënash) nuk llogariten.
- **iOS nuk testohet nga Windows.** Raportoje si të paverifikuar.
- **Dokumentet në shqip** (përveç README.md, që është në anglisht).

## Ku të shikosh
[PROGRES.md](PROGRES.md) — çfarë është bërë dhe hapi tjetër · [EKIPI.md](EKIPI.md) — ekipi dhe statusi · [HARTA.md](HARTA.md) — çfarë është brenda/jashtë · [BISEDAT.md](BISEDAT.md) — biseda me përdorues.
