---
phase: 01-harness-definitions
plan: 02
subsystem: testing
tags: [zod, typescript, csv, yaml, benchmark, harness, inventory]

# Dependency graph
requires:
  - phase: 01-harness-definitions-01-01
    provides: package.json with Zod v4, harness directory scaffolds, validate-schemas.ts

provides:
  - Complete inventory-optimization harness package (6 files)
  - harness.yaml declarative spec with version 1.0.0
  - Zod v4 InventoryRecommendation schema (z.toJSONSchema validated)
  - 20-row anonymized inventory and sales CSV data files
  - prompt.md with data dictionary for all 7 CSV columns
  - rubric.md with anti-verbosity instruction and 1/3/5 score anchors for 3 dimensions

affects:
  - 01-03-pricing-strategy (rubric structure is the quality bar for subsequent harnesses)
  - 01-04-financial-forecasting (same harness file pattern)
  - 01-05-validate-harnesses (validate-schemas.ts will pick up inventory schema.ts)
  - Phase 3 (eval engine consumes harness.yaml, rubric.md format)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Harness file structure: harness.yaml + schema.ts + prompt.md + rubric.md + data/*.csv"
    - "CSV anonymization: SKUs use category-product-size pattern (no brand names), dollar amounts are scaled relative values"
    - "Rubric structure: anti-verbosity header + 3 dimensions each with Score 1/3/5 anchors"
    - "Completeness dimension explicitly names schema fields (summary, recommendations, data_gaps)"

key-files:
  created:
    - harnesses/inventory-optimization/harness.yaml
    - harnesses/inventory-optimization/schema.ts
    - harnesses/inventory-optimization/prompt.md
    - harnesses/inventory-optimization/rubric.md
    - harnesses/inventory-optimization/data/inventory.csv
    - harnesses/inventory-optimization/data/sales.csv
  modified: []

key-decisions:
  - "CSV data designed with intentional decision gradient: ~7 SKUs below par (clear restock), ~7 borderline, ~6 above par (hold/reduce) — creates differentiated reasoning opportunities across models"
  - "prompt.md uses neutral framing ('analyze, recommend') with no persona bias toward cost-cutting or growth"
  - "data_gaps field in schema captures what information would have improved the analysis, enabling evaluation of model self-awareness"

patterns-established:
  - "Rubric pattern: anti-verbosity instruction first, then 3 dimensions, each with 3 score anchors (1/3/5)"
  - "Schema completeness dimension must reference actual field names from schema.ts"
  - "Data dictionary in prompt.md covers every non-obvious column with a usage hint (e.g. velocity_7d division formula)"

requirements-completed:
  - HRNS-01
  - HRNS-02
  - HRNS-03
  - HRNS-04
  - HRNS-05
  - HRNS-06
  - HRNS-07

# Metrics
duration: 5min
completed: 2026-03-15
---

# Phase 1 Plan 02: Inventory Optimization Summary

**Complete inventory-optimization harness: 6-file package with Zod v4 schema (z.toJSONSchema validated), 20-row anonymized CSVs, neutral prompt with data dictionary, and 3-dimension rubric with 1/3/5 anchors**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-15T22:24:58Z
- **Completed:** 2026-03-15T22:30:00Z
- **Tasks:** 2
- **Files created:** 6

## Accomplishments

- Authored harness.yaml with version 1.0.0, all required fields (data, prompt, output, eval, providers), and 3 providers (claude-sonnet-4-6, gpt-4o, gemini-1.5-pro)
- Created Zod v4 InventoryRecommendation schema with summary, recommendations array (sku/action/quantity/rationale/urgency), and data_gaps — z.toJSONSchema() produces valid JSON Schema with type "object"
- Generated 20 anonymized inventory and sales CSV rows with intentional decision gradient (immediate restocks, borderline holds, clear reduces) to create differentiated model reasoning opportunities
- Authored prompt.md with neutral framing and data dictionary covering all 7 CSV columns including velocity formula hint
- Authored rubric.md with explicit anti-verbosity instruction and score anchors at 1, 3, and 5 for Actionability, Reasoning Transparency, and Completeness — completeness anchors name schema fields by exact name

## Task Commits

Each task was committed atomically:

1. **Task 1: Author harness.yaml, schema.ts, and CSV data files** - `77a1c2a` (feat)
2. **Task 2: Author prompt.md and rubric.md** - `af4b7dc` (feat, included in financial-forecasting commit by prior session)

## Files Created/Modified

- `harnesses/inventory-optimization/harness.yaml` - Declarative harness spec with version 1.0.0 and 3 providers
- `harnesses/inventory-optimization/schema.ts` - Zod v4 schema: InventoryRecommendation + InventoryRecommendationType
- `harnesses/inventory-optimization/data/inventory.csv` - 20 anonymized SKUs (sku, product_name, current_stock, par_level, unit_cost)
- `harnesses/inventory-optimization/data/sales.csv` - 20 matching rows (sku, velocity_7d, velocity_30d, last_restock_date)
- `harnesses/inventory-optimization/prompt.md` - System prompt with neutral framing + data dictionary
- `harnesses/inventory-optimization/rubric.md` - Eval rubric with anti-verbosity + 3 dimensions x 3 score anchors

## Decisions Made

- CSV data designed with intentional decision gradient: approximately 7 SKUs clearly below par (e.g. DRINK-ENERGY-8OZ at 0 stock with velocity_7d=8), approximately 7 borderline, and approximately 6 well above par. This ensures models encounter varied reasoning demands.
- Prompt uses neutral framing with no persona bias. The data dictionary includes a velocity formula hint ("Divide current_stock by velocity_7d / 7") to test whether models use it explicitly in rationale.
- data_gaps schema field tests model self-awareness — whether models can identify missing information (expiry dates, machine visit schedules, margin data) beyond what was provided.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Schema verification (`z.toJSONSchema` returning `type: "object"`) passed on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- inventory-optimization harness is complete and self-contained; validate-schemas.ts will pick up schema.ts automatically
- Rubric structure established here is the template for Plans 03 (pricing-strategy) and 04 (financial-forecasting) rubrics
- All 7 HRNS requirements satisfied by this harness

## Self-Check: PASSED

All 6 harness files exist on disk. Both task commits (77a1c2a, af4b7dc) verified in git log.
SUMMARY.md created at `.planning/phases/01-harness-definitions/01-02-SUMMARY.md`.
STATE.md updated, ROADMAP.md updated via gsd-tools.

---
*Phase: 01-harness-definitions*
*Completed: 2026-03-15*
