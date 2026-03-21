# Scoring Methodology

RBAB uses a two-stage hybrid scoring pipeline: a JSON schema validation gate followed by an LLM judge. This document explains each stage, the three scoring dimensions, the composite formula, and includes a representative scored output.

## Why Hybrid Scoring

Business decisions have no objectively correct answer — there is no ground truth to compare against. Traditional accuracy metrics do not apply. The hybrid approach addresses this in two ways:

- **Schema gate first:** Structural failures (wrong types, missing required fields, invalid enums) are caught before any LLM API call is made. This prevents spending judge credits on outputs that cannot be used operationally.
- **LLM judge for quality:** Once an output passes the schema gate, an LLM judge evaluates it against a harness-specific rubric. This scales evaluation to arbitrary task domains without requiring human graders.

## Stage 1: JSON Schema Validation Gate

Every model output is validated against the harness's Zod schema using `safeParse`. If validation fails:

- `composite_score` is written as `0`
- `schema_valid` is written as `false`
- The LLM judge is never called
- The run record is saved to `results/<run-id>/scored/` so the raw output is not lost

If validation passes, execution continues to Stage 2.

## Stage 2: LLM Judge

The judge model is `anthropic/claude-sonnet-4-6` at `temperature: 0`. This model and temperature are fixed for all reference harnesses to ensure reproducibility across benchmark runs.

The judge receives the model output and the harness-specific rubric. It scores three dimensions and returns a rationale for each. See [docs/judge-prompt.md](judge-prompt.md) for the full judge prompt text.

## Scoring Dimensions

Each dimension is scored on an integer scale of 1–5. Anchors at 1, 3, and 5 are defined per harness in `rubric.md`. The following verbatim anchors are from `harnesses/inventory-optimization/rubric.md` and represent the canonical pattern used across all reference harnesses. Custom harnesses define their own domain vocabulary against the same three dimensions.

---

### Dimension 1: Actionability

Does the response provide recommendations specific enough to execute without further clarification?

**Score 5:** Every recommendation in the `recommendations` array specifies a concrete SKU identifier,
a definitive action (restock/hold/reduce), an exact quantity (non-zero for restock, 0 for hold/reduce),
and a clear urgency level. A warehouse manager could place an order and schedule a machine visit
from this output alone, without asking any follow-up questions.

**Score 3:** Recommendations identify which products need attention and the action type, but are vague
about quantities (e.g., "order some more" or "quantity TBD") or urgency (e.g., "soon" without a
defined timeframe). The response is directionally correct but not operationally complete.

**Score 1:** Recommendations are general observations or restatements of the data
(e.g., "several products are low on stock") with no actionable specifics tied to individual SKUs.
A manager cannot act without significant additional analysis.

---

### Dimension 2: Reasoning Transparency

Does the response show its reasoning — which specific data values drove which conclusions?

**Score 5:** Each recommendation in the `rationale` field traces its conclusion to exact values
from the provided data (e.g., "current_stock=4 / velocity_7d=12 = 2.3 days remaining, below
the 14-day restock threshold"). Calculations or comparisons are explicit and reproducible.

**Score 3:** Recommendations reference data trends in general terms ("high-velocity product",
"stock is running low") but do not cite specific numeric values from the CSV. A reader can
infer what data was used but cannot verify the calculation.

**Score 1:** Conclusions appear without any visible connection to the provided data.
The response could have been generated without access to the inventory or sales data at all.
Rationale fields are empty, generic, or contain only assertions ("this product needs restocking").

---

### Dimension 3: Completeness

Does the output populate all required schema fields meaningfully and cover the full set of SKUs
requiring a decision?

**Score 5:** The `summary` field synthesizes overall inventory health in a way that adds context
beyond listing individual recommendations. The `recommendations` array covers every SKU that
falls below or near par_level (no obvious candidates are omitted). The `data_gaps` field
identifies at least one genuine missing data point (e.g., expiration dates, machine location
visit schedules) that would materially improve the analysis, or explicitly states none exist.

**Score 3:** Required fields (`summary`, `recommendations`, `data_gaps`) are present but some are
superficial: the summary restates the prompt rather than synthesizing findings, `data_gaps` is an
empty array when obvious gaps exist (such as no expiry or margin data), or the recommendations
list omits borderline SKUs that warranted a decision.

**Score 1:** One or more required schema fields (`summary`, `recommendations`, or `data_gaps`) are
missing, null, or contain placeholder content. The recommendations array is empty or covers fewer
than half of the SKUs that are at or below par_level.

---

## Composite Formula

```
composite_score = (actionability + reasoning_transparency + completeness) / 3 × 20
```

Each dimension score is an integer from 1 to 5. The composite result is in the range 0–100. A schema validation failure produces `composite_score = 0`; the judge is never called for invalid outputs.

**Example calculation:** scores of 4, 3, 3 → `(4 + 3 + 3) / 3 × 20 = 10 / 3 × 20 = 66.67 → rounds to 67`

## Representative Scored Example

The following is a real scored result from a reference run against `openai/gpt-4o-mini` on the `inventory-optimization` harness:

```json
{
  "run_id": "f39cf220-9c9f-49e5-a820-6b85b37efb12",
  "harness": "inventory-optimization",
  "harness_version": "1.0.0",
  "model": "openai/gpt-4o-mini",
  "composite_score": 67,
  "scores": {
    "actionability": {
      "score": 4,
      "rationale": "Every recommendation specifies a concrete SKU, a definitive action, an exact quantity, and a clear urgency level making it operationally executable; however, SNACK-PRETZEL-1OZ is incorrectly flagged for restock despite having stock well above par, undermining full executability."
    },
    "reasoning_transparency": {
      "score": 3,
      "rationale": "Rationale fields cite current_stock and velocity_7d values but do not show explicit calculations such as days-of-stock-remaining or comparison to par_level thresholds, making reasoning directionally verifiable but not fully reproducible."
    },
    "completeness": {
      "score": 3,
      "rationale": "All three required schema fields are present but data_gaps is an empty array despite obvious missing data points such as expiration dates and margin data, and the summary restates individual product issues rather than synthesizing overall inventory health."
    }
  },
  "schema_valid": true,
  "cost_usd": 0.00047415,
  "latency_ms": 12749,
  "run_date": "2026-03-19T23:57:29.924Z"
}
```

The math: `(4 + 3 + 3) / 3 × 20 = 66.67`, which rounds to `67`. The schema gate passed (`schema_valid: true`), so the judge was called and produced per-dimension rationale for each score.
