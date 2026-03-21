---
phase: 01-harness-definitions
plan: "04"
subsystem: harness-definitions
tags: [zod, yaml, csv, financial-forecasting, rubric, benchmark]

# Dependency graph
requires:
  - phase: 01-01
    provides: project bootstrap with package.json, validate-schemas.ts, and harness directory scaffolding
provides:
  - Complete financial-forecasting harness package with anonymized P&L and expense CSV data
  - Zod v4 FinancialForecast schema with z.toJSONSchema support
  - Eval rubric with anti-verbosity instruction and 1/3/5 score anchors for three dimensions
  - Data dictionary prompt with all required column definitions
affects:
  - 02-eval-engine (consumes harness.yaml and schema.ts for runner implementation)
  - 03-eval-runs (runs this harness against all providers)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Anonymized vending machine financial data: all dollar amounts scaled by fixed multiplier (0.6) to preserve ratios while removing identifiability"
    - "Monthly P&L CSV structure: month, revenue, cogs, gross_profit, operating_expenses, net_income"
    - "Expense breakdown CSV with trend column: stable | increasing | decreasing"
    - "Rubric anti-verbosity instruction pattern established for all financial harnesses"

key-files:
  created:
    - harnesses/financial-forecasting/harness.yaml
    - harnesses/financial-forecasting/schema.ts
    - harnesses/financial-forecasting/prompt.md
    - harnesses/financial-forecasting/rubric.md
    - harnesses/financial-forecasting/data/monthly-pl.csv
    - harnesses/financial-forecasting/data/expenses.csv
    - harnesses/financial-forecasting/schema.test.ts
  modified: []

key-decisions:
  - "Financial schema is the most open-ended of three harnesses — captures executive_summary, nested forecast object (6 sub-fields), risks array, opportunities array, and data_limitations array"
  - "CSV data designed with intentional margin compression trend (operating expenses growing faster than revenue in recent months) to create a meaningful forecasting challenge"
  - "15 months of P&L history chosen (within 12-18 range) to give enough seasonal context including winter dip and recovery"
  - "Rubric completeness dimension names all five top-level schema fields explicitly to prevent partial completion scoring ambiguity"

patterns-established:
  - "Anti-verbosity instruction: 'Do not score higher simply because the response is longer' — must appear in all harness rubrics"
  - "Data dictionary pattern: all domain-specific column names defined in System Prompt section of prompt.md"
  - "Score anchor pattern: Score 5 / Score 3 / Score 1 with concrete behavioral examples per dimension"

requirements-completed: [HRNS-01, HRNS-02, HRNS-03, HRNS-04, HRNS-05, HRNS-06, HRNS-07]

# Metrics
duration: 3min
completed: 2026-03-15
---

# Phase 1 Plan 4: Financial Forecasting Harness Summary

**Anonymized 15-month vending P&L dataset with Zod v4 schema capturing forecast projections, risk flags, and opportunity levers — plus a 3-dimension rubric with explicit anti-verbosity guard**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-15T22:25:17Z
- **Completed:** 2026-03-15T22:28:00Z
- **Tasks:** 2 (Task 1 had TDD RED + GREEN commits)
- **Files modified:** 7

## Accomplishments

- Financial-forecasting harness is complete and self-contained: all five required files plus two CSV data files
- FinancialForecast Zod v4 schema passes z.toJSONSchema() — exports both named schema and TypeScript type
- Monthly P&L CSV has 15 rows with intentional seasonal dip (Q4 winter slowdown) and margin compression trend visible in recent months
- Expense breakdown CSV has 10 categories with majority trending "increasing" to explain the margin compression visible in P&L
- Rubric anti-verbosity instruction present; all three dimensions have score anchors at 1, 3, and 5

## Task Commits

Each task was committed atomically:

1. **Task 1 TDD RED: Failing tests** - `fcb12fa` (test)
2. **Task 1 TDD GREEN: harness.yaml, schema.ts, monthly-pl.csv, expenses.csv** - `af4b7dc` (feat)
3. **Task 2: prompt.md, rubric.md** - `fc3f8cf` (feat)

## Files Created/Modified

- `harnesses/financial-forecasting/harness.yaml` - Declarative harness spec with version 1.0.0 and all required fields
- `harnesses/financial-forecasting/schema.ts` - Zod v4 FinancialForecast schema exporting schema object and TypeScript type
- `harnesses/financial-forecasting/prompt.md` - System prompt with data dictionary for all 8 column names and forecast instructions
- `harnesses/financial-forecasting/rubric.md` - 3-dimension rubric with anti-verbosity instruction and 1/3/5 score anchors
- `harnesses/financial-forecasting/data/monthly-pl.csv` - 15 months of anonymized P&L data (Dec 2024 – Feb 2026)
- `harnesses/financial-forecasting/data/expenses.csv` - 10 expense categories with trend indicators
- `harnesses/financial-forecasting/schema.test.ts` - TDD test file validating schema, YAML, and CSV structure

## Decisions Made

- Financial schema captures a nested `forecast` object (6 sub-fields) to structure the quantitative projection separately from qualitative analysis — this enforces that models commit to specific dollar figures
- CSV data deliberately shows operating expenses growing from $2,940 (Dec 2024) to $3,730 (Feb 2026) while revenue only grows from $8,420 to $9,140 — a discernible margin compression pattern agents must identify
- `data_limitations` field uses permissive description ("state none if the provided data is sufficient") to avoid penalizing models for the intentionally realistic dataset

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three harnesses (inventory-optimization, pricing-strategy, financial-forecasting) now complete
- Phase 2 (eval engine) can consume harness.yaml and schema.ts files from all three harness directories
- validate-schemas.ts script from Plan 01-01 can be run to confirm all three schemas pass z.toJSONSchema()

---
*Phase: 01-harness-definitions*
*Completed: 2026-03-15*
