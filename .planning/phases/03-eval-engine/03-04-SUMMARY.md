---
phase: 03-eval-engine
plan: "04"
subsystem: eval
tags: [typescript, tsx, eval-engine, re-eval, scoring, rubric]

# Dependency graph
requires:
  - phase: 03-eval-engine
    provides: runEval function in src/eval.ts; loadHarness in src/harness.ts
  - phase: 02-cli-runner
    provides: results directory structure (meta.json, raw/<model-slug>.json)
provides:
  - standalone re-eval script that re-scores existing run directories from disk
  - developer-facing rubric change re-application workflow via scripts/re-eval.ts
affects: [04-benchmark-runs, 05-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Re-eval pattern: recover run context from meta.json, derive modelSlug, delegate to runEval"
    - "scripts/ utilities read from disk and delegate all logic to src/ modules — no duplicated scoring"

key-files:
  created:
    - scripts/re-eval.ts
  modified: []

key-decisions:
  - "Re-eval accepts only --run-id; all other metadata (harness, model, cost, latency) recovered from meta.json — single source of truth"
  - "loadHarness called fresh at re-eval time (not stored spec) — enables rubric changes to be applied to old runs"
  - "No Commander dependency in re-eval.ts — single --run-id flag handled with manual argv parsing"

patterns-established:
  - "scripts/ entry points: parse args manually for single-flag utilities, delegate all domain logic to src/"
  - "Error exit pattern: console.error with descriptive message, process.exit(1) for user-facing errors"

requirements-completed: [EVAL-01, EVAL-03, EVAL-04, EVAL-05, EVAL-06, EVAL-07]

# Metrics
duration: 2min
completed: 2026-03-17
---

# Phase 3 Plan 04: Re-eval Script Summary

**Standalone `scripts/re-eval.ts` that re-scores any existing run from disk by reading meta.json + raw output, loading the current harness spec, and delegating to `runEval` — enabling rubric changes to be re-applied to all historical runs without re-invoking the LLM.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-17T12:55:29Z
- **Completed:** 2026-03-17T12:57:57Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created `scripts/re-eval.ts` — runnable via `tsx scripts/re-eval.ts --run-id <uuid>`
- Recovers all run metadata from `results/<run-id>/meta.json` (harness, model, cost_usd, latency_ms, run_date)
- Reads raw LLM output from `results/<run-id>/raw/<model-slug>.json`
- Loads current harness spec via `loadHarness()` (not frozen spec from original run)
- Delegates all scoring to `runEval` — no duplicated eval logic
- Exits 1 with clear error messages for missing run-id or missing run directory/raw file

## Task Commits

Each task was committed atomically:

1. **Task 1: Create scripts/re-eval.ts standalone re-score entry point** - `26e218c` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified
- `scripts/re-eval.ts` - Standalone re-eval entry point: parses --run-id, reads meta.json and raw output from disk, loads current harness spec, calls runEval

## Decisions Made
- Re-eval accepts only `--run-id`; all other metadata recovered from meta.json to maintain single source of truth
- Calls `loadHarness()` at re-eval time rather than storing the spec at run time — this is the core capability: fresh spec means rubric changes are applied to old runs
- No Commander dependency — single flag handled with `process.argv.indexOf` to keep the script minimal

## Deviations from Plan

None - plan executed exactly as written.

Note: `npx tsc --noEmit` shows TS5097 errors (`.ts` extension in import paths) for `scripts/re-eval.ts`, but this is a pre-existing project-wide condition affecting `scripts/test-eval.ts`, `scripts/test-output.ts`, `src/output.ts`, and others. The pattern is intentional for `tsx` runtime compatibility and does not affect execution.

## Issues Encountered
None — the pre-existing tsconfig pattern of `.ts` imports is expected; `tsx` handles it correctly at runtime.

## Next Phase Readiness
- Phase 03 eval engine is complete: runEval (Plan 02/03) + re-eval (Plan 04) deliver the full eval capability
- Ready for Phase 04 benchmark runs: `scripts/re-eval.ts` provides the rubric-change workflow needed for iterative benchmark development
- Any future rubric improvements can be re-applied to historical runs via: `tsx scripts/re-eval.ts --run-id <id>`

---
*Phase: 03-eval-engine*
*Completed: 2026-03-17*
