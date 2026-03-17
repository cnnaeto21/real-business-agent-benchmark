---
phase: 03-eval-engine
plan: "02"
subsystem: eval
tags: [anthropic-sdk, zod, json-schema, scoring, eval-engine, llm-as-judge]

requires:
  - phase: 03-eval-engine-01
    provides: scripts/test-eval.ts — Wave 0 test scaffold defining behavioral contract for eval engine
  - phase: 02-cli-runner
    provides: src/types.ts HarnessSpec interface, src/output.ts write pattern, src/cli.ts integration point

provides:
  - "src/eval.ts — complete eval engine with JudgeResponse schema, computeComposite, writeScored, upsertIndex, runEval"
  - "results/<run-id>/scored/<model-slug>.json — per-run scored result files"
  - "results/index.json — flat deduplicated index of all scored runs"

affects:
  - 03-eval-engine-03
  - 04-reference-runs

tech-stack:
  added: []
  patterns:
    - "Plain text judge call: messages.create with no tools/tool_choice field — distinct from provider adapters that use tool use"
    - "Retry-once pattern for malformed judge JSON before throwing"
    - "safeParse gate: schema validation failure produces zero-score result, does NOT call judge"
    - "Judge failure path: catch and log to stderr, return without scored write — preserves raw output from expensive model run"
    - "upsertIndex: read-modify-write with run_id filter-then-push deduplication"

key-files:
  created:
    - src/eval.ts
  modified: []

key-decisions:
  - "Judge model called in plain text mode (no tool use) — judge prompt instructs JSON-only output, no schema enforcement needed from SDK"
  - "callJudge retries once on malformed JSON; both attempts fail → throw (caller catches and logs stderr)"
  - "Schema validation failure → zero-score ScoredResult written to scored/ and index; judge never called"
  - "Judge API failure → raw output preserved, scored/ not written, index not updated (run partially complete)"
  - "modelSlug uses -- separator (anthropic--claude-sonnet-4-6); model string in ScoredResult restores / separator via replace"

patterns-established:
  - "TDD Green: all 18 test-eval.ts assertions pass (computeComposite, JudgeResponse schema, writeScored, upsertIndex, schema failure path)"
  - "Two-gate pipeline: safeParse gate → judge gate, each with independent failure handling"

requirements-completed: [EVAL-01, EVAL-03, EVAL-04, EVAL-05, EVAL-06, EVAL-07]

duration: 3min
completed: 2026-03-17
---

# Phase 3 Plan 2: Eval Engine Summary

**Two-gate eval pipeline (Zod schema validation + Anthropic plain-text judge) with composite score computation, scored file writes, and deduplicated index.json upserts**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-17T00:50:20Z
- **Completed:** 2026-03-17T00:53:05Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Implemented full eval engine in `src/eval.ts` with all five required exports
- TDD GREEN: all 18 `scripts/test-eval.ts` assertions pass (computeComposite, JudgeResponse Zod schema, writeScored, upsertIndex, schema validation failure path)
- Full regression suite passes with no regressions (test-meta, test-output, test-render, test-routing)
- Two-gate pipeline: safeParse gate blocks judge call on invalid output; judge failure path preserves raw output without crashing run

## Task Commits

1. **Task 1: Implement src/eval.ts** - `c8bbe1f` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/eval.ts` — Complete eval engine: JudgeResponse Zod schema, computeComposite, callJudge (internal), writeScored, upsertIndex, runEval

## Decisions Made

- Judge called with plain text `messages.create` (no `tools`, no `tool_choice`) — judge prompt instructs JSON-only response; Zod validation applied on the parsed text response
- `callJudge` retries once on malformed JSON; if second attempt also fails, throws `Error("Judge returned malformed JSON after retry")` — caller catches and logs to stderr
- Schema validation failure writes zero-score `ScoredResult` (`schema_valid: false`, `composite_score: 0`, `validation_error` set) to `scored/` and upserts `index.json`; judge is never called
- Judge API failure path: catch error, `console.error("Judge scoring failed:", msg)`, return without writing `scored/` or updating `index.json` — raw output from the expensive model run is preserved
- `modelSlug` (filesystem-safe `--` separator) is reversed to `/` separator when writing `model` field in `ScoredResult` and `IndexEntry`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] scripts/test-eval.ts already existed from plan 03-01**
- **Found during:** Execution start
- **Issue:** Plan 03-01 (create test scaffold) had been committed to repo but no 03-01-SUMMARY.md existed — test file was present on disk
- **Fix:** Read the existing test file and proceeded directly to GREEN implementation phase
- **Verification:** `npx tsx scripts/test-eval.ts` exits 0 with 18/18 passing
- **Committed in:** c8bbe1f (Task 1 commit)

---

**Total deviations:** 1 (blocking — prerequisite already satisfied)
**Impact on plan:** No scope change, no additional work needed.

## Issues Encountered

None — plan executed successfully on first attempt.

## User Setup Required

None - no external service configuration required at this stage. The `runEval` function requires `ANTHROPIC_API_KEY` at runtime (when live judge calls are made), but this is already documented for Phase 4 reference runs.

## Next Phase Readiness

- `src/eval.ts` ready to be integrated into `src/cli.ts` in Plan 03-03
- All five exports available: `JudgeResponse`, `computeComposite`, `writeScored`, `upsertIndex`, `runEval`
- `runEval` signature accepts `{ runDir, runId, harnessName, rawOutput, modelSlug, spec, meta }` — matches the cli.ts integration point documented in 03-02-PLAN.md
- No blockers for Phase 03-03 (CLI integration) or Phase 04 (reference runs)

## Self-Check: PASSED

- `src/eval.ts` — FOUND
- `.planning/phases/03-eval-engine/03-02-SUMMARY.md` — FOUND
- Commit `c8bbe1f` — FOUND

---
*Phase: 03-eval-engine*
*Completed: 2026-03-17*
