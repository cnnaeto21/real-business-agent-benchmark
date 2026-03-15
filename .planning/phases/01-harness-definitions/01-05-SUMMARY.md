---
phase: 01-harness-definitions
plan: "05"
subsystem: benchmarking
tags: [judge-prompt, llm-as-judge, zod, json-schema, validation]

# Dependency graph
requires:
  - phase: 01-02
    provides: inventory-optimization harness (schema.ts, rubric.md with three dimensions)
  - phase: 01-03
    provides: pricing-strategy harness (schema.ts, rubric.md with three dimensions)
  - phase: 01-04
    provides: financial-forecasting harness (schema.ts, rubric.md with three dimensions)
provides:
  - docs/judge-prompt.md — shared judge prompt for all RBAB reference runs (EVAL-02)
  - Cross-harness schema validation passing for all three harnesses
  - Phase 1 complete — all five harness artifacts locked and validated
affects:
  - 02-runner-scaffolding
  - 03-eval-engine
  - 04-reference-runs

# Tech tracking
tech-stack:
  added: []
  patterns:
    - LLM-as-judge prompt with placeholder injection ({{model_output}}, {{rubric}}) at eval runtime
    - Three-dimension JSON scoring output (actionability, reasoning_transparency, completeness)
    - Anti-verbosity instructions as explicit numbered rules in judge prompt

key-files:
  created:
    - docs/judge-prompt.md
  modified: []

key-decisions:
  - "Judge prompt version 1.0.0 locked — changes require re-scoring all existing reference runs"
  - "Three scoring dimensions (actionability, reasoning_transparency, completeness) confirmed consistent across all three harness rubrics and judge prompt output format"
  - "Judge prompt uses placeholder injection pattern ({{model_output}}, {{rubric}}) so eval engine injects harness-specific content at runtime without modifying the base prompt"

patterns-established:
  - "Judge prompt pattern: role declaration, model_output placeholder, rubric placeholder, anti-bias numbered rules, structured JSON output"
  - "Anti-verbosity as explicit numbered instruction: 'Do not score higher simply because the response is longer'"
  - "Dimension consistency pattern: rubric dimension names in rubric.md must exactly match JSON keys in judge prompt output format"

requirements-completed: [EVAL-02]

# Metrics
duration: 2min
completed: 2026-03-15
---

# Phase 1 Plan 05: Judge Prompt and Final Validation Summary

**RBAB judge prompt v1.0.0 authored with five required sections and validated that all three harness Zod schemas produce valid JSON Schema via z.toJSONSchema()**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-15T22:34:40Z
- **Completed:** 2026-03-15T22:36:13Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Authored docs/judge-prompt.md with all five required sections: role declaration, {{model_output}} placeholder, {{rubric}} placeholder, anti-bias scoring instructions (6 explicit rules including anti-verbosity), and required JSON output format
- Confirmed all three scoring dimensions (actionability, reasoning_transparency, completeness) appear in both scoring instructions and required output format, matching dimension names in all three harness rubrics
- Ran npx tsx scripts/validate-schemas.ts — all three harnesses passed: inventory-optimization, pricing-strategy, financial-forecasting
- Verified all harness artifacts present: three harness directories each with harness.yaml, prompt.md, schema.ts, rubric.md, and data/ with two CSVs each

## Task Commits

Each task was committed atomically:

1. **Task 1: Author docs/judge-prompt.md** - `5f2f0b6` (feat)
2. **Task 2: Run cross-harness schema validation** - verification only, no files modified

**Plan metadata:** (final docs commit — see below)

## Files Created/Modified

- `docs/judge-prompt.md` — RBAB judge prompt v1.0.0; shared by all reference runs; {{model_output}} and {{rubric}} placeholders injected at eval runtime; JSON output format with three scored dimensions

## Decisions Made

- Judge prompt version locked at 1.0.0 — the footer note makes clear that any future changes require re-scoring all existing reference runs, ensuring benchmark reproducibility
- Placeholder injection pattern ({{model_output}}, {{rubric}}) chosen so the eval engine can inject harness-specific rubrics at runtime without storing or modifying the base prompt
- Anti-verbosity instruction phrased as numbered rules (not prose) to reduce ambiguity for the judge model

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 1 complete: all five plans executed, all artifacts locked and validated
- Three harnesses ready: inventory-optimization, pricing-strategy, financial-forecasting — each with harness.yaml (version 1.0.0), prompt.md, schema.ts, rubric.md (three dimensions with 1/3/5 anchors), and two CSVs
- docs/judge-prompt.md committed and stable — REF-03 reference runs can use it without modification
- No blockers for Phase 2 (runner scaffolding)

---
*Phase: 01-harness-definitions*
*Completed: 2026-03-15*

## Self-Check: PASSED

- docs/judge-prompt.md: FOUND
- 01-05-SUMMARY.md: FOUND
- commit 5f2f0b6: FOUND
