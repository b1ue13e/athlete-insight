# Athlete Insight

[中文说明](README.zh-CN.md) · [Running Scoring Development](docs/running-scoring-development.md) · [Route Checklist](docs/redirects-checklist.md)

Athlete Insight is a Next.js training and match analysis workbench. It turns structured volleyball, running and gym inputs into rule-based reports with scores, deviations, confidence, evidence and suggested corrections, then connects reports to history, athlete profiles, sharing, telemetry and offline draft recovery. The UI is Chinese-first and mobile-oriented; this English README and its Chinese companion describe the same source tree.

The canonical new-diagnosis entry is `/analysis/new`. Historical `/analysis/new/v2` and `/analysis/new/mobile` addresses are permanently redirected there by `vercel.json`; the old mobile route is no longer the product entry.

## What is in the repository

- **Unified diagnosis**: `/analysis/new` hosts `DiagnosisFlowWorkspace`, with quick and professional form components. `POST /api/analyze` validates a request, dispatches `sport_type` to the volleyball, running or gym analyzer, and returns a report plus a canonical report; `GET /api/analyze` reports configured features. A Kimi enhancement is attempted only for volleyball when requested and configured.
- **Deterministic scoring**: `lib/analysis/pipeline.ts` is the shared dispatch layer. `lib/scoring/running/` covers single-session scores, confidence, templates, weekly analysis, file parsing and report adaptation; `lib/scoring/gym/` covers session scores, weekly blocks, mesocycles and optional advanced insights; `lib/mock-analysis.ts` and `lib/report-engine.ts` cover the volleyball path.
- **Workbench pages**: `/` is the athlete home dashboard, `/history` shows previous diagnoses, `/athletes` manages profiles, `/settings` contains environment settings, `/analysis/detail` displays a report and `/analysis/[id]` and its `/v2` subpage contain report views. Dedicated `/running`, `/gym`, `/analysis/running/weekly`, `/analysis/new/running/import` and `/telemetry/running` pages expose sport-specific analysis.
- **Sharing and offline support**: `/share/player-card` and `components/share-cards/` generate player cards; `lib/offline-storage.ts` uses IndexedDB for drafts, pending reports, a sync queue and settings; `/offline` is the offline page. `public/manifest.json`, `public/sw.js` and `components/pwa/` provide PWA installation and draft recovery surfaces.
- **Validation and demos**: `/validation`, `/validation/ai-eval` and `/validation/coach-form` provide evaluation views; `/demo`, `/demo/running`, `/plg-demo` and `/api/mock` provide mock/demo data. `tests/` contains running, gym and volleyball regression fixtures.

Supabase is optional. `lib/supabase-client.ts` and `lib/supabase-storage.ts` fall back to a descriptive mock client when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing, so a build can complete without credentials; authentication and cloud storage require real values. `KIMI_API_KEY` and `KIMI_API_BASE_URL` enable the optional volleyball report enhancement. Keep real keys out of Git.

## Quick start

Requires Node.js and npm. From the repository root:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000> and use `/analysis/new` for a new diagnosis. The app uses Next.js 14, React 18, TypeScript, Tailwind CSS, Radix/shadcn-style components, Recharts, Zod and optional Supabase. `capacitor.config.ts` adds an Android target.

`next.config.js` sets `output: "export"`, `distDir: "dist"` and `trailingSlash: true` for Capacitor/static hosting; `npm run build` therefore produces a static export. `npm run dev` is the interactive development entry. `vercel.json` separately declares a Next.js framework build with `outputDirectory: ".next"` and the legacy route redirects; review the intended host configuration before deploying, since these two config files describe different build outputs.

## Typical flow

1. Open `/analysis/new`, choose a sport and athlete context, and enter either match statistics or a running/gym session.
2. The form or analysis pipeline calls the scoring engine. Reports show a headline score, score breakdown, detected deviations, confidence and next-session suggestions; advanced physiological insights remain explanatory and do not decide the main score.
3. Inspect the report from `/analysis/detail` or a report subpage, revisit it through `/history`, and use the weekly or telemetry pages for longer-term review. Drafts use browser-local recovery when the network is interrupted.

`POST /api/analyze` expects `{ "sport_type": "volleyball" | "running" | "gym", "data": { ... } }`, with optional `enhance_with_ai`. Invalid input returns HTTP 400 with validation details. `GET /api/mock` returns mock sessions and `POST /api/mock` creates one for local testing; that route is explicitly marked as a development helper.

## Architecture

```text
app/(dashboard)/, app/analysis/, app/athletes/  pages and layouts
app/api/analyze/, app/api/mock/                API route handlers
components/dashboard/, report/, running/       UI, reports and loading states
contexts/auth-context.tsx                     optional Supabase auth provider
lib/analysis/                                 request contracts, pipeline, stores
lib/scoring/running/, gym/, registry.ts       deterministic scoring modules
lib/offline-storage.ts, components/offline/   IndexedDB and draft recovery
lib/supabase-client.ts, supabase-storage.ts   optional cloud auth/storage
tests/, scripts/run-tests.cjs                 lightweight TypeScript test runner
public/manifest.json, public/sw.js            PWA assets
```

`scripts/run-tests.cjs` transpiles TypeScript test files in `tests/` with the installed TypeScript compiler, resolves `@/` imports to the repository root and runs the collected cases. Running and gym rules are deterministic; optional AI enhancement is outside the main score. See [Running Scoring Development](docs/running-scoring-development.md), [GYM-SCORE-V1-README.md](GYM-SCORE-V1-README.md) and [RUNNING-SCORE-V1-README.md](RUNNING-SCORE-V1-README.md) for module contracts and fixture expectations.

## Checks and route governance

```bash
npm run typecheck
npm test
npm run test:running
npm run test:gym
npm run build
```

`docs/redirects-checklist.md` records the code, deployment and documentation checks for keeping `/analysis/new` as the sole formal entry. [OFFLINE-DATA-SAFETY.md](OFFLINE-DATA-SAFETY.md) describes local draft behavior, [AUTH-INTEGRATION.md](AUTH-INTEGRATION.md) covers optional authentication, [PWA-SETUP.md](PWA-SETUP.md) covers installation assets, and [DEPLOYMENT.md](DEPLOYMENT.md) is a deployment checklist with unverified items left unchecked. The many `P0-*`, `P1-*`, `RUNNING-*`, `VALIDATION.md` and `TELEMETRY.md` notes are implementation-stage records; consult the code and current tests before treating any proposed feature as deployed.

This README documents the repository state at the checked-out default branch. It does not claim that a hosted service, cloud sync, mobile binary or third-party model integration is live.
