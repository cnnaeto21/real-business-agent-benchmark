---
phase: 03-eval-engine
plan: "03"
subsystem: cli
tags: [commander, eval, scoring, typescript]

# Dependency graph
requires:
  - phase: 03-02
    provides: runEval function in src/eval.ts (judge call, writeScored, upsertIndex, inline score printing)
  - phase: 02-cli-runner
    provides: src/cli.ts runBenchmark, src/bin.ts Commander setup, src/types.ts BenchmarkOptions, src/cost.ts calculateCost
provides:
  - --skip-eval CLI flag that bypasses scoring while still writing raw output and meta.json
  - BenchmarkOptions.noEval optional boolean field for programmatic skip
  - runEval called automatically from cli.ts after writeResults on every standard benchmark run
  - End-to-end eval pipeline: benchmark run -> validation -> judge -> inline score output -> scored/ file -> index.json
affects: [04-reference-runs, 05-dashboard, 06-docs]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "skipEval (Commander camelCase) -> noEval (BenchmarkOptions) naming convention avoids Commander --no-* footgun"
    - "calculateCost called in cli.ts to pass cost_usd into runEval meta — same computation as output.ts, avoids coupling to internal meta object"

key-files:
  created: []
  modified:
    - src/types.ts
    - src/bin.ts
    - src/cli.ts

key-decisions:
  - "--skip-eval flag name (not --no-eval) — Commander v14 treats --no-* as boolean negation of an existing --* flag; no --eval flag exists so --no-eval silently misbehaves"
  - "calculateCost imported directly in cli.ts and recomputed for runEval meta rather than threading it from output.ts — keeps interfaces clean"

patterns-established:
  - "Pattern: CLI flag -> BenchmarkOptions field naming: skip-eval (kebab) -> skipEval (Commander) -> noEval (opts) — consistent cross-boundary naming"

requirements-completed: [EVAL-01, EVAL-03, EVAL-04, EVAL-05, EVAL-06, EVAL-07]

# Metrics
duration: 1min
completed: 2026-03-17
---

# Phase 03 Plan 03: Eval Engine CLI Wiring Summary

**--skip-eval flag, noEval BenchmarkOptions field, and runEval call wired into cli.ts so every benchmark run automatically scores output via the judge pipeline**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-17T00:55:49Z
- **Completed:** 2026-03-17T00:57:03Z
- **Tasks:** 1 of 2 (Task 2 is a human-verify checkpoint — awaiting user verification)
- **Files modified:** 3

## Accomplishments
- Added `noEval?: boolean` to `BenchmarkOptions` in `src/types.ts`
- Added `--skip-eval` Commander option to `src/bin.ts` (passes as `noEval: !!options.skipEval`)
- Wired `runEval` call in `src/cli.ts` after `writeResults` — imports `runEval` from `./eval.ts` and `calculateCost` from `./cost.ts`
- Full test suite (18 tests) passes with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add noEval to types.ts, --skip-eval to bin.ts, wire runEval in cli.ts** - `b0b8b4b` (feat)

## Files Created/Modified
- `src/types.ts` — Added `noEval?: boolean` field to `BenchmarkOptions`
- `src/bin.ts` — Added `--skip-eval` option; passes `noEval: !!options.skipEval` to `runBenchmark`
- `src/cli.ts` — Imports `runEval` and `calculateCost`; calls `runEval` after `writeResults` when `opts.noEval` is not set

## Decisions Made
- Used `--skip-eval` flag (not `--no-eval`) — Commander v14 reserves `--no-*` as boolean negation for an existing `--*` flag; `--no-eval` would silently misbehave since no `--eval` flag exists
- `calculateCost` is recomputed in `cli.ts` rather than threading from `output.ts` to keep interface boundaries clean

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required for code changes.

## Next Phase Readiness
- Task 1 complete: all three source files modified and committed
- Task 2 is a blocking `checkpoint:human-verify` — requires live benchmark run to confirm inline scores print, `scored/` file is created, `index.json` is updated, and `--skip-eval` produces no `scored/` directory
- ANTHROPIC_API_KEY must be set in environment before running live verification

---
*Phase: 03-eval-engine*
*Completed: 2026-03-17*
