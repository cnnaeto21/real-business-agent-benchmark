---
phase: 05-dashboard
plan: 01
subsystem: ui
tags: [nextjs, react, tailwind, recharts, typescript, dashboard]

# Dependency graph
requires:
  - phase: 04-reference-runs
    provides: results/index.json with 9 entries and results/<run-id>/meta.json with temperature field
provides:
  - Next.js 16 dashboard in web/ with passing build and lint
  - web/lib/types.ts — RunResult, DimensionScore interfaces and modelLabel/harnessLabel helpers
  - web/lib/data.ts — loadResults() merging index.json with meta.json temperature at build time
  - web/components/ScoresTable.tsx — Server Component, 9-row model comparison table
  - web/components/DimensionChart.tsx — Client Component, recharts bar chart per harness
  - web/components/DimensionChartWrapper.tsx — Client Component wrapper owning dynamic+ssr:false
  - web/components/RunItYourself.tsx — Server Component with CLI command and docs link
  - web/components/CopyButton.tsx — Client Component with clipboard copy
  - web/app/page.tsx — async Server Component reading results at build time
  - scripts/verify-dashboard-data.ts — data integrity checker (9 entries, 9 meta.json with temperature)
affects: [05-dashboard-02]

# Tech tracking
tech-stack:
  added: [next@16.2.0, react@19, recharts, tailwindcss@v4, typescript, eslint-config-next]
  patterns:
    - Server Components for data fetching and static rendering
    - Client Components isolated to interactive UI (chart, copy button)
    - DimensionChartWrapper pattern: Client Component owns dynamic+ssr:false for browser-only libs
    - lib/types.ts separation: pure interfaces importable by Client Components without pulling in Node builtins

key-files:
  created:
    - scripts/verify-dashboard-data.ts
    - web/lib/types.ts
    - web/lib/data.ts
    - web/components/ScoresTable.tsx
    - web/components/DimensionChart.tsx
    - web/components/DimensionChartWrapper.tsx
    - web/components/RunItYourself.tsx
    - web/components/CopyButton.tsx
    - web/app/page.tsx
    - web/app/layout.tsx
    - web/next.config.ts
  modified: []

key-decisions:
  - "Split lib/types.ts from lib/data.ts so Client Components can import interfaces without bundling fs/promises"
  - "DimensionChartWrapper is a Client Component that owns dynamic+ssr:false — ssr:false is not allowed in Server Components in Next.js 16+"
  - "web/ scaffolded with create-next-app@16 (Next.js 16.2.0, Turbopack, Tailwind v4, App Router)"

patterns-established:
  - "types-data split: pure interfaces in lib/types.ts, server-only loading in lib/data.ts"
  - "Client Component wrapper pattern for browser-only third-party libs requiring dynamic+ssr:false"

requirements-completed: [DASH-02, DASH-03, DASH-04, DASH-05]

# Metrics
duration: 9min
completed: 2026-03-20
---

# Phase 5 Plan 01: Dashboard Scaffold Summary

**Next.js 16 dashboard with recharts dimension charts, 9-row scores table, and Run It Yourself section — build and lint pass against real results data**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-20T01:14:13Z
- **Completed:** 2026-03-20T01:23:28Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Scaffolded web/ Next.js 16 app (Turbopack, Tailwind v4, App Router) with recharts installed
- Built all dashboard components: ScoresTable (9 runs), DimensionChart (recharts bar chart per harness), RunItYourself (CLI command + copy), CopyButton
- Created scripts/verify-dashboard-data.ts confirming 9 index.json entries and 9 meta.json files with temperature — passes exit 0
- Full `npm run build` and `npm run lint` pass with no errors

## Task Commits

Each task was committed atomically:

1. **Task 0: Scaffold web/ app and create verify-dashboard-data.ts** - `ab3b98b` (feat)
2. **Task 1: Build data loader, all components, and page.tsx** - `3d8f835` (feat)

**Plan metadata:** (to be added after state update)

## Files Created/Modified
- `scripts/verify-dashboard-data.ts` - Data integrity checker for 9 index.json entries + 9 meta.json files
- `web/lib/types.ts` - RunResult, DimensionScore interfaces; modelLabel/harnessLabel helpers (no Node imports)
- `web/lib/data.ts` - loadResults() — reads index.json + merges temperature from each meta.json
- `web/components/ScoresTable.tsx` - Server Component table: model, harness, score, cost, latency, run date, version, temp
- `web/components/DimensionChart.tsx` - Client Component recharts BarChart grouped by harness
- `web/components/DimensionChartWrapper.tsx` - Client Component owning dynamic+ssr:false import of DimensionChart
- `web/components/RunItYourself.tsx` - Server Component with CLI command block + docs/running.md link
- `web/components/CopyButton.tsx` - Client Component with clipboard.writeText and copied state
- `web/app/page.tsx` - Async Server Component loading results via loadResults() at build time
- `web/app/layout.tsx` - Minimal layout with RBAB Dashboard title
- `web/next.config.ts` - No output: export (Vercel handles static generation natively)

## Decisions Made
- Split types into `lib/types.ts` separate from `lib/data.ts` so Client Components can import interfaces without bundling Node.js `fs/promises` (which is not available in browser bundles)
- Used `DimensionChartWrapper` Client Component pattern to own `dynamic(() => import(...), { ssr: false })` — Next.js 16 does not allow `ssr: false` in Server Components
- Kept `web/` as a standalone app under the repo root (not a monorepo workspace) to match existing project structure

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ssr:false not allowed in Server Components in Next.js 16**
- **Found during:** Task 1 (build data loader and page.tsx)
- **Issue:** Plan specified using `dynamic(() => import(...), { ssr: false })` directly in `page.tsx` (Server Component). Next.js 16 explicitly disallows `ssr: false` in Server Components — build fails with error.
- **Fix:** Created `DimensionChartWrapper.tsx` as a `use client` Client Component that owns the `dynamic+ssr:false` call. `page.tsx` imports this wrapper instead.
- **Files modified:** web/components/DimensionChartWrapper.tsx (new), web/app/page.tsx (imports wrapper)
- **Verification:** `npm run build` exits 0 with no errors
- **Committed in:** 3d8f835 (Task 1 commit)

**2. [Rule 1 - Bug] Client Components cannot import lib/data.ts (contains fs/promises)**
- **Found during:** Task 1 (first build attempt)
- **Issue:** DimensionChart.tsx (Client Component) imported types from `lib/data.ts` which has `import { readFile } from 'fs/promises'` at the top level. Turbopack bundled the entire module for the client, failing with "Module not found: Can't resolve fs/promises".
- **Fix:** Extracted pure interfaces and helper functions into `lib/types.ts` (no Node imports). `lib/data.ts` re-exports from types. Client Components import from `lib/types.ts`.
- **Files modified:** web/lib/types.ts (new), web/lib/data.ts (refactored), web/components/DimensionChart.tsx, web/components/ScoresTable.tsx, web/components/DimensionChartWrapper.tsx
- **Verification:** `npm run build` exits 0
- **Committed in:** 3d8f835 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs — Next.js 16 breaking changes from plan assumptions)
**Impact on plan:** Both fixes necessary for build to pass. No scope creep. Plan intent preserved — DimensionChart is still rendered client-side without SSR.

## Issues Encountered
- Next.js 16 (Turbopack) shows a warning about multiple lockfiles (root vs web/) but build succeeds. This is informational — the project has both a root package.json and web/package.json. Out of scope to fix.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- web/ dashboard is ready for Vercel deployment (Plan 05-02)
- All 6 required files pass the plan's key_links and export checks
- `npm run build` and `npm run lint` both exit 0

---
*Phase: 05-dashboard*
*Completed: 2026-03-20*
