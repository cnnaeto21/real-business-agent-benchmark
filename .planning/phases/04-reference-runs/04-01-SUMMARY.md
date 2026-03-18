---
phase: 04-reference-runs
plan: 01
subsystem: infra
tags: [typescript, tsx, child_process, readline, orchestration, verification]

# Dependency graph
requires:
  - phase: 01-harness-definitions
    provides: harness YAML specs, prompt templates, rubrics for all 3 harnesses
  - phase: 02-cli-runner
    provides: tsx src/bin.ts CLI invoked as subprocess by run-reference.ts
  - phase: 03-eval-engine
    provides: eval pipeline, index.json format, IndexEntry type
provides:
  - scripts/run-reference.ts — full orchestrator for 9 reference runs
  - scripts/verify-reference.ts — standalone verifier for result integrity
  - npm run reference and npm run verify-reference script entries
affects: [04-reference-runs, 05-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [child_process.spawn for subprocess invocation, readline confirmation prompt, module guard pattern for ESM scripts that are both importable and directly runnable]

key-files:
  created:
    - scripts/run-reference.ts
    - scripts/verify-reference.ts
  modified:
    - package.json

key-decisions:
  - "Module guard in verify-reference.ts uses process.argv[1].endsWith() check to prevent main() executing on import — required because run-reference.ts imports verifyReference as a function"
  - "readLatestEntry uses dynamic import of fs/promises rather than top-level import to avoid any subtle ESM circular concerns — functionally equivalent, follows existing script patterns"
  - "Dry-run exits 0 regardless of env var failures — env var absence is informational, not a script error"

patterns-established:
  - "Importable script pattern: export function + isMain guard at bottom so script works both as CLI and as imported module"
  - "Sequential subprocess pattern: spawn tsx src/bin.ts with stdio: inherit so benchmark output streams live to terminal"

requirements-completed: [REF-01, REF-02, REF-03]

# Metrics
duration: 10min
completed: 2026-03-18
---

# Phase 04 Plan 01: Reference Run Orchestration Scripts Summary

**Node.js orchestration scripts using child_process.spawn and readline to drive 9 sequential benchmark subprocesses with cost confirmation, automatic retry, summary table, and standalone verification against index.json**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-18T00:51:43Z
- **Completed:** 2026-03-18T01:01:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `scripts/verify-reference.ts` exports `verifyReference()` for import and runs standalone as `npm run verify-reference`
- `scripts/run-reference.ts` implements full orchestration: clear → cost estimate → readline confirm → 9 sequential subprocess runs → retry → summary table → verify → commit instructions
- `--dry-run` flag validates all 3 harnesses load and checks env vars, exits 0 without any API calls
- Both scripts follow established project patterns (no Commander, top-level await, tsx invocation)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write scripts/verify-reference.ts** - `15d1280` (feat)
2. **Task 2: Write scripts/run-reference.ts and update package.json** - `8157b67` (feat)

## Files Created/Modified
- `scripts/verify-reference.ts` - Standalone verifier: checks 9 entries, all schema_valid, all 9 combos, docs/judge-prompt.md exists
- `scripts/run-reference.ts` - Main orchestrator: dry-run, clear, cost estimate, confirm, run 9, retry, summary table, verify
- `package.json` - Added `reference` and `verify-reference` script entries

## Decisions Made
- Module guard pattern in verify-reference.ts: `process.argv[1]?.endsWith("verify-reference.ts")` check so `main()` only runs when invoked directly, not when imported as a module by run-reference.ts. This is needed because verify-reference.ts uses top-level await (ESM module-level execution) and is both a runnable script and an importable module.
- Dry-run exits 0 even when env vars are missing — the dry-run is informational, letting users see what needs to be set before spending API credits.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed module-level execution when verify-reference.ts is imported**
- **Found during:** Task 2 (verifying run-reference.ts --dry-run)
- **Issue:** verify-reference.ts had `await main()` at module level with no guard, causing it to execute and exit the process immediately when imported by run-reference.ts
- **Fix:** Added `isMain` guard checking `process.argv[1]?.endsWith("verify-reference.ts")` before calling `await main()`
- **Files modified:** scripts/verify-reference.ts
- **Verification:** `npx tsx scripts/run-reference.ts --dry-run` prints harness/env results cleanly; `npx tsx scripts/verify-reference.ts` still works standalone
- **Committed in:** 8157b67 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential fix — without it, importing verifyReference would crash the orchestrator process. No scope creep.

## Issues Encountered
- Pre-existing TypeScript TS5097 errors from `.ts` extension imports project-wide — not introduced by this plan. The new scripts follow the exact same import pattern as `scripts/re-eval.ts` and other existing scripts. All scripts compile and run correctly via tsx.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `npm run reference --dry-run` validates the environment before spending API credits
- Set `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY` then run `npm run reference` to execute all 9 reference runs
- `npm run verify-reference` available for post-run spot checks and debugging
- After 9 successful runs, commit with `git add results/ docs/judge-prompt.md`

---
*Phase: 04-reference-runs*
*Completed: 2026-03-18*
