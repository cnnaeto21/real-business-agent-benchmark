# Eval Rubric: Financial Forecasting

## Anti-Verbosity Instruction

Do not score higher simply because the response is longer or more elaborate.
A forecast that states a specific projected revenue figure with a named methodology
and cites the exact trend data it extrapolates from scores higher than a verbose
response that discusses many forecasting considerations without committing to numbers.
Evaluate specificity and data grounding, not word count.

## Dimension 1: Actionability

Does the response produce a forecast and recommendations specific enough for the operator to act on?

**Score 5:** The `forecast` object contains exact dollar projections (not ranges) for revenue, expenses,
and net income, with an explicit `methodology` description (e.g., "3-month trailing average with 4%
seasonal uplift based on prior-year March data"). The `opportunities` array includes at least one
recommendation with a concrete estimated dollar impact. The `confidence` level is stated with a rationale
(not just a label).

**Score 3:** The `forecast` object provides projected figures but the `methodology` is vague ("based on
recent trends") without naming the specific calculation. The `opportunities` list exists but estimated
impacts are described only qualitatively (e.g., "could significantly improve margins") without dollar
approximations.

**Score 1:** The response provides directional statements ("revenue will likely grow") without committing
to specific projected values. The operator cannot use this output to set a budget or make a capital
allocation decision without independent analysis.

## Dimension 2: Reasoning Transparency

Does the response show which historical data points drove the forecast?

**Score 5:** The `forecast.methodology` field names the specific months or trend calculation used
(e.g., "extrapolated from the January–March 2026 average of $10,100/month, adjusted downward by
$300 for the March operating expense increase visible in the expense table"). The `risks` and
`opportunities` entries each cite a specific data_evidence field linking to a named expense category
or revenue trend. Calculations are reproducible from the provided data alone.

**Score 3:** The forecast references historical patterns in general terms ("the past few months show
growth") without identifying specific months or computing a visible rate. Risk and opportunity entries
reference data categories without citing specific values (e.g., "machine maintenance costs are a risk"
without citing the actual dollar figures or trend indicator).

**Score 1:** The forecast appears without any visible connection to the provided historical data.
Risks and opportunities are generic (e.g., "unexpected expenses could hurt results") with no reference
to any data from the provided tables. A different set of P&L data would produce the same response.

## Dimension 3: Completeness

Does the output populate all required schema fields meaningfully?

**Score 5:** All five top-level fields are populated with substantive content: `executive_summary`
synthesizes the key financial trend in 2-3 sentences (not just restating the prompt); `forecast`
has all six sub-fields including a period name (e.g., "April–June 2026") and a non-trivial methodology;
`risks` contains at least two entries with evidence; `opportunities` contains at least one entry
with a specific estimated_impact dollar range; `data_limitations` either identifies a genuine missing
data type (e.g., "no machine-level revenue breakdown to assess location performance") or explicitly
states the data is sufficient.

**Score 3:** Required fields are present but some are thin: `executive_summary` restates the prompt
rather than synthesizing the trend; `risks` or `opportunities` has only one entry; `data_limitations`
is an empty array when obvious gaps exist (such as no machine-level breakdown or no prior-year
comparison data for seasonal adjustment).

**Score 1:** One or more of the five top-level fields (`executive_summary`, `forecast`, `risks`,
`opportunities`, `data_limitations`) is missing, null, an empty array/object, or contains only
placeholder text. The `forecast` object is missing required sub-fields like `projected_revenue`
or `methodology`.
