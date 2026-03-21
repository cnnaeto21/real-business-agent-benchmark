---
phase: 05-dashboard
plan: 02
subsystem: infra
tags: [vercel, nextjs, deployment, ci, docs]

# Dependency graph
requires:
  - phase: 05-dashboard-01
    provides: Next.js 16 dashboard in web/ with passing build and lint
  - phase: 04-reference-runs
    provides: results/ directory with 9 benchmark runs committed to repo
provides:
  - Live Vercel deployment at https://real-business-agent-benchmark.vercel.app/
  - web/vercel.json — framework declaration enabling Root Directory=web Vercel config
  - docs/running.md — step-by-step local benchmark instructions linked from dashboard
affects: []

# Tech tracking
tech-stack:
  added: [vercel]
  patterns:
    - Vercel Root Directory=web with Include files outside root=Enabled to access results/ at build time
    - results/ directory committed to git (not gitignored) — required for static generation at build time

key-files:
  created:
    - web/vercel.json
    - docs/running.md
  modified: []

key-decisions:
  - "web/vercel.json uses {framework: nextjs} only — Root Directory and Include files outside root set in Vercel project settings UI"
  - "results/ directory committed to git (not gitignored) — Vercel's static build reads these files at build time, so they must be in the repo"
  - "Include files outside root=Enabled in Vercel settings — allows web/ build to access results/ at the repo root"

patterns-established:
  - "For Vercel monorepo subdirectory deployments: set Root Directory in UI, enable Include files outside root for cross-directory file access"

requirements-completed: [DASH-01, DASH-05]

# Metrics
duration: ~30min (including deployment iteration)
completed: 2026-03-20
---

# Phase 5 Plan 02: Vercel Deployment Summary

**Next.js dashboard deployed to Vercel at https://real-business-agent-benchmark.vercel.app/ — HTTP 200 confirmed, model comparison table and dimension charts visible on first load**

## Performance

- **Duration:** ~30 min (including deployment debugging iteration)
- **Started:** 2026-03-20T01:25:39Z
- **Completed:** 2026-03-20
- **Tasks:** 3 (Task 1 automated, Task 2 human-action checkpoint, Task 3 automated verification)
- **Files modified:** 2

## Accomplishments
- Created web/vercel.json declaring Next.js framework for Vercel subdirectory deployment
- Created docs/running.md with full local benchmark instructions (clone, env vars, run, view results, re-score)
- Deployed dashboard to Vercel with Root Directory=web and Include files outside root=Enabled
- Committed results/ directory to git (was missing — root cause of ENOENT build errors on Vercel)
- Verified live URL returns HTTP 200 with full dashboard HTML: scores table, dimension charts, Run It Yourself section, and correct docs/running.md link

## Task Commits

Each task was committed atomically:

1. **Task 1: Create web/vercel.json and docs/running.md** - `c6b3cf6` (feat)
2. **Task 2: Human checkpoint — deploy to Vercel** - human action (no code commit)
3. **Task 3: Verify public URL is accessible** - verification only, no code changes needed

**Fix commits (post-checkpoint deployment debugging):**
- `eeb088e` — restore web/vercel.json (reverted move to repo root, rely on Include files outside root)
- `d3fc1af` — commit results/ directory (missing from repo, root cause of ENOENT build failures)

**Plan metadata:** (created in this session)

## Files Created/Modified
- `web/vercel.json` - `{"framework": "nextjs"}` — Vercel framework declaration for web/ subdirectory
- `docs/running.md` - Step-by-step local benchmark instructions: clone, env vars, run command, results structure, re-score, troubleshooting

## Decisions Made
- `results/` directory is committed to git rather than gitignored — the Next.js build calls `loadResults()` at static generation time (not runtime), so Vercel's build container must have the files available. Without this, build fails with ENOENT on results/index.json.
- `Include files outside root` must be Enabled in Vercel project settings when Root Directory is set to a subdirectory — otherwise Vercel's build sandbox cannot access sibling directories like results/.
- web/vercel.json stayed at `web/vercel.json` (not moved to repo root) — moving it broke the Root Directory=web config and caused the wrong build path.

## Deviations from Plan

### Auto-fixed Issues

The deployment iteration (fix commits eeb088e and d3fc1af) were made between Task 2 (human checkpoint) and Task 3 (verification), not during automated task execution. They are documented here as deployment issues resolved during the human action phase.

**1. [Rule 3 - Blocking] results/ directory was not committed to git**
- **Found during:** Vercel deployment (between Task 2 and Task 3)
- **Issue:** results/ was not committed to the git repository. Vercel's static build calls loadResults() which reads results/index.json — ENOENT caused build failure.
- **Fix:** Committed results/ directory containing all 9 benchmark run directories and results/index.json.
- **Files modified:** results/ (entire directory added to git)
- **Commit:** d3fc1af

**2. [Rule 3 - Blocking] Moved vercel.json to repo root broke Root Directory=web config**
- **Found during:** Vercel deployment iteration (between Task 2 and Task 3)
- **Issue:** An attempt to move vercel.json to repo root (so results/ would be in scope) caused Vercel to use the repo root as the build directory, breaking the Next.js app path resolution.
- **Fix:** Restored web/vercel.json and instead enabled "Include files outside root" in Vercel project settings.
- **Files modified:** web/vercel.json (restored)
- **Commit:** eeb088e

---

**Total deviations:** 2 auto-fixed (both Rule 3 blocking — deployment path/scope issues)
**Impact on plan:** Both fixes essential for deployment to succeed. No scope creep. Plan intent preserved.

## Issues Encountered
- Vercel build failed with ENOENT on results/index.json — resolved by committing results/ to git
- Moving vercel.json to repo root as a workaround broke the build path — reverted and used "Include files outside root" setting instead
- After fixes, build succeeded and live URL returns HTTP 200 with full dashboard content

## User Setup Required
None - deployment is live. No additional configuration required.

## Next Phase Readiness
- Phase 05-dashboard is complete. All 5 DASH requirements satisfied:
  - DASH-01: Public Vercel URL live and returning HTTP 200
  - DASH-02: Model comparison table visible (9 runs)
  - DASH-03: Per-dimension bar charts rendered (recharts)
  - DASH-04: Metadata shown (model, harness, date, version, temperature)
  - DASH-05: Run It Yourself section with CLI command and docs/running.md link
- No blockers for Phase 06 (docs/polish)

---
*Phase: 05-dashboard*
*Completed: 2026-03-20*
