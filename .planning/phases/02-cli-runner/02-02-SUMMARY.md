---
phase: 02-cli-runner
plan: "02"
subsystem: cli
tags: [js-yaml, typescript, fs, yaml, csv-injection, cost-table]

# Dependency graph
requires:
  - phase: 02-cli-runner-01
    provides: src/types.ts with HarnessSpec, RunResult, BenchmarkOptions interfaces
  - phase: 01-harness-definitions
    provides: harnesses/inventory-optimization/harness.yaml, prompt.md, data CSVs
provides:
  - src/harness.ts — loadHarness (YAML loader + CSV injector + placeholder validator) and splitPrompt
  - src/cost.ts — calculateCost with hardcoded price table for 3 known models
  - src/output.ts — writeResults creating results/<runId>/raw/<modelSlug>.json and meta.json
affects:
  - 02-cli-runner-03 (providers need splitPrompt from harness.ts)
  - 02-cli-runner-04 (cli.ts orchestration imports all three modules)

# Tech tracking
tech-stack:
  added: [js-yaml (yaml.load for harness.yaml parsing)]
  patterns:
    - "readFileSync for synchronous harness loading — CLI is sequential, sync is simpler and correct"
    - "Raw CSV injection via string replacement (no CSV parsing) — prompt expects raw rows"
    - "Sentinel -1 for unknown model cost — callers check explicitly"
    - "mkdir({ recursive: true }) for idempotent directory creation"
    - "splitPrompt returns ['', template] when separator absent — graceful degradation"

key-files:
  created:
    - src/harness.ts
    - src/cost.ts
    - src/output.ts
    - scripts/test-output.ts
  modified: []

key-decisions:
  - "loadHarness throws immediately if separator missing in prompt template — fail-fast over silent malformed prompts"
  - "Placeholder assertion (no remaining {{ }}) in loadHarness catches harness authoring errors at load time not run time"
  - "calculateCost returns -1 sentinel (not throw) for unknown models — allows benchmark to complete and log cost as unknown"

patterns-established:
  - "Prompt separator '# User Message Template' is the canonical split point for system/user parts across all providers"
  - "Model slug for filenames: replace '/' with '--' (e.g. anthropic--claude-sonnet-4-6) to avoid path separator issues"
  - "meta.json always includes exactly 12 fields: run_id, harness, harness_version, model, provider_api_version, temperature, max_tokens, input_tokens, output_tokens, cost_usd, latency_ms, run_date"

requirements-completed: [RUN-02, RUN-05, RUN-06]

# Metrics
duration: 5min
completed: 2026-03-16
---

# Phase 2 Plan 02: Pure Logic Modules Summary

**Harness YAML loader with CSV injection and placeholder validation, hardcoded price table for 3 providers, and async results writer creating structured results/<runId>/ directory output**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-16T12:32:00Z
- **Completed:** 2026-03-16T12:36:59Z
- **Tasks:** 2
- **Files modified:** 4 (3 src, 1 test script)

## Accomplishments
- loadHarness loads harness.yaml with js-yaml, reads CSV files as raw text, replaces `{{variable}}` placeholders, asserts no placeholders remain, and throws with clear messages on authoring errors
- splitPrompt splits on "# User Message Template" separator; returns ["", template] gracefully when separator absent
- calculateCost returns correct USD for anthropic/claude-sonnet-4-6 (18.00), openai/gpt-4o (12.50), google/gemini-1.5-pro (6.25), and -1 for unknown models
- writeResults creates results/<runId>/raw/<modelSlug>.json and results/<runId>/meta.json with all 12 required fields; mkdir uses recursive:true for idempotent creation

## Task Commits

Each task was committed atomically:

1. **Task 1: Build src/harness.ts** - `1a8633f` (feat)
2. **Task 2: Build src/cost.ts and src/output.ts** - `5fc9561` (feat)

_Note: TDD tasks — tests pre-existed in scripts/; implementation written to make them pass_

## Files Created/Modified
- `src/harness.ts` - loadHarness (YAML loader + CSV injector + validator) and splitPrompt exports
- `src/cost.ts` - PRICE_TABLE with 3 known models and calculateCost export
- `src/output.ts` - writeResults async function creating directory structure with raw JSON and meta.json
- `scripts/test-output.ts` - Added to verify writeResults behavior (not in plan; needed for GREEN phase verification)

## Decisions Made
- loadHarness throws on missing separator (not warning) — silent failure would produce malformed prompts sent to providers with no system/user split indication
- calculateCost returns -1 sentinel instead of throwing — allows benchmark run to complete and record cost as -1 (flagged) rather than crashing; cli.ts can log "cost unknown" without stopping the run
- Placeholder assertion runs post-injection — catches harness YAML that references `inject_as` variables not present in the template, or template variables not covered by YAML data entries

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Test Coverage] Added scripts/test-output.ts**
- **Found during:** Task 2 (verifying writeResults)
- **Issue:** Plan's verify command `npx tsx scripts/test-meta.ts` only validates meta field names against a hardcoded sample — it does not call writeResults or create actual files. No actual I/O verification existed.
- **Fix:** Added scripts/test-output.ts that calls writeResults, verifies file existence, validates raw JSON content, confirms all 12 meta fields are present in actual written file, and verifies mkdir idempotency.
- **Files modified:** scripts/test-output.ts (created)
- **Verification:** test-output.ts exits 0
- **Committed in:** 5fc9561 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing test coverage)
**Impact on plan:** Test script added to fill coverage gap between plan's existing test-meta.ts (validates field names against in-memory object) and actual writeResults I/O behavior. No scope creep.

## Issues Encountered
- `npx tsx -e` with top-level await fails with "cjs output format" error — resolved by writing test to a .ts file and running with `npx tsx scripts/test-output.ts`

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- src/harness.ts, src/cost.ts, and src/output.ts are all importable by src/cli.ts
- splitPrompt is ready for use by all three provider adapters in Plan 02-03
- writeResults accepts the exact shape returned by provider adapters (RunResult fields map directly to opts parameters)
- All three modules compile under tsx with no TypeScript errors

---
*Phase: 02-cli-runner*
*Completed: 2026-03-16*

## Self-Check: PASSED

- src/harness.ts: FOUND
- src/cost.ts: FOUND
- src/output.ts: FOUND
- commit 1a8633f (Task 1): FOUND
- commit 5fc9561 (Task 2): FOUND
