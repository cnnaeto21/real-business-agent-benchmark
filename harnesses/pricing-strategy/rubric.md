# Eval Rubric: Pricing Strategy

## Anti-Verbosity Instruction

Do not score higher simply because the response is longer or more elaborate.
A concise recommendation citing specific margin percentages and velocity figures
scores higher than a verbose response that discusses all possible pricing frameworks
without grounding conclusions in the provided data.
Evaluate substance and specificity, not word count.

## Dimension 1: Actionability

Does the response provide pricing recommendations specific enough to implement?

**Score 5:** Every recommendation specifies an exact `recommended_price` (not a range or direction only),
identifies the `direction` of change (increase/decrease/hold), and provides a `confidence` rating.
A pricing manager could update prices in the point-of-sale system immediately from this output.

**Score 3:** Recommendations identify which SKUs need attention and the general direction (increase or
decrease) but give only approximate guidance on the new price (e.g., "raise by roughly 10-15%")
rather than a specific dollar amount. The output is directionally useful but not immediately actionable.

**Score 1:** Recommendations describe general pricing principles (e.g., "increase prices on popular items")
without tying advice to specific SKUs or providing any price point guidance. Cannot be acted on
without significant additional analysis.

## Dimension 2: Reasoning Transparency

Does the response show which data drove which pricing decisions?

**Score 5:** Each `rationale` field traces the price recommendation to specific values from the data
(e.g., "margin is 47% vs. category average of 38%; velocity of 45 units/month supports a $0.20 increase
without demand risk"). Margin calculations reference actual cost_per_unit and current_price values.

**Score 3:** Rationale fields reference data categories in general terms ("this is a high-margin product",
"sales velocity is strong") without citing the specific numbers that support the claim. A reader
can infer what data was used but cannot independently verify the reasoning.

**Score 1:** Rationale fields are absent, generic, or circular ("price should increase because revenue
would be higher"). No connection is made between the recommendation and specific data values
from the provided tables.

## Dimension 3: Completeness

Does the output populate all required schema fields meaningfully and provide strategic context?

**Score 5:** The `summary` field provides a strategic overview identifying the top revenue opportunities
and any systemic pricing patterns (e.g., beverage margins lagging snack margins). The `recommendations`
array covers all SKUs where a defensible case for price change exists. The `market_observations` field
identifies at least two cross-catalog patterns (e.g., price sensitivity differences across categories,
correlation between price changes and velocity shifts) that go beyond restating individual recommendations.

**Score 3:** Required fields (`summary`, `recommendations`, `market_observations`) are present but
superficial: the summary restates individual recommendations without synthesizing patterns, or
`market_observations` contains only one generic observation. Some SKUs with obvious pricing opportunities
are omitted from the recommendations.

**Score 1:** One or more required schema fields (`summary`, `recommendations`, or `market_observations`)
are missing, null, empty arrays, or contain placeholder text. The recommendations array covers fewer
than half of the SKUs that warrant a pricing decision based on the provided data.
