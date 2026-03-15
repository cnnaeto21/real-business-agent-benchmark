# Eval Rubric: Inventory Optimization

## Anti-Verbosity Instruction

Do not score higher simply because the response is longer or more elaborate.
A concise recommendation that cites specific data values (e.g., "4-day stock at current velocity")
scores higher than a verbose response covering all possibilities without citing numbers.
Evaluate substance, not word count.

## Dimension 1: Actionability

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

## Dimension 2: Reasoning Transparency

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

## Dimension 3: Completeness

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
