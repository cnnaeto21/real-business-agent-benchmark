# Domain Pitfalls: Multi-Judge Ensemble Integration

**Domain:** Adding multi-judge ensemble to existing single-judge LLM benchmark (RBAB)
**Researched:** 2026-03-23
**Scope:** Pitfalls specific to migrating from Claude-only judge to 3-model ensemble (Claude + GPT-4o + Gemini)

---

## Critical Pitfalls

### Pitfall 1: Assuming the Same Judge Prompt Works Identically Across All Three Providers

**What goes wrong:** The current judge-prompt.md was authored and tuned against Claude Sonnet. The instruction set assumes behaviors specific to Claude — for example, the explicit "Return valid JSON only. Do not add any text before or after the JSON object" instruction exists because Claude can wrap JSON in markdown fences. GPT-4o and Gemini have different tendencies around JSON formatting, instruction adherence, and how they handle the rubric anchors (1/3/5 scale).

Specific divergence risks in the current prompt:

- The instruction "Score against the anchor, not your intuition" assumes a model that reads and applies structured rubric anchors carefully. Gemini 1.5 Pro has documented difficulty interpreting field descriptions in structured schemas, meaning the anchor-based scoring logic may be applied inconsistently.
- The instruction "Provide a one-sentence rationale that cites specific evidence" produces different rationale lengths and citation styles across models. What Claude treats as a single sentence, GPT-4o often expands into multiple sentences or adds preamble.
- The current `callJudge` function strips markdown code fences (```` ```json ```` wrapping). GPT-4o at temperature 0 also sometimes wraps JSON in fences; Gemini sometimes returns a raw object without braces. The strip logic handles Claude's exact pattern but may not handle all Gemini deviations.

**Consequences:** One judge produces valid JSON consistently; another judge fails the `JudgeResponse.safeParse` check and triggers the retry path; a third fails both attempts and causes the eval run to silently drop that judge's score. End result is an ensemble run that isn't actually an ensemble.

**Prevention:**

1. Test each provider's raw output against the judge prompt on 5 sample harness outputs before building the ensemble pipeline. Document the exact failure modes per provider.
2. Add provider-specific JSON cleanup normalization before the `JSON.parse` call — not just fence stripping, but also handling trailing commas and partial brace output from Gemini.
3. Consider using each provider's native structured output mechanism for the judge call (OpenAI `response_format: { type: "json_schema" }`, Gemini `responseMimeType: "application/json"`) rather than relying on prompt-only JSON extraction. The PROJECT.md notes this already succeeded for the harness runner; apply the same pattern to judge calls.

**Detection:** Log the raw text block from each judge before parsing. If a provider's success rate on the JudgeResponse schema falls below 90% in testing, the prompt needs provider-specific adjustment.

**Phase to address:** Phase implementing multi-judge infrastructure — before wiring up score aggregation.

---

### Pitfall 2: Score Distribution Differences Masquerading as Real Quality Signal

**What goes wrong:** Research (Justice or Prejudice? Quantifying Biases in LLM-as-a-Judge, 2024; Exploring Biases in GPT-4o, Claude, and Qwen2.5 Judgements, 2025) documents that different LLM families have systematically different scoring distributions on identical rubrics:

- **Claude** tends toward moderate scores with careful justification; less likely to assign 5/5 without strong evidence.
- **GPT-4o** exhibits verbosity bias — consistently higher scores for longer, more detailed responses. Published finding: LLM judges often prefer verbose outputs regardless of substantive quality.
- **Gemini** shows lower inter-model agreement with other families; its most capable models trend toward GPT-4-level calibration but the scaling is inconsistent across rubric dimensions.

On RBAB's 1–5 integer scale with three discrete dimensions, even a half-point systematic offset between judges creates a measurable composite score distortion once averaged. An ensemble that naively averages three judges is not measuring a single consensus quality signal — it is averaging three partially miscalibrated signals, which can be more misleading than a single well-calibrated judge.

**Consequences:** A model whose outputs are verbose and formatted (but not more insightful) scores higher under GPT-4o's judge. Switching to ensemble scoring changes the leaderboard rankings, and the change is driven by judge calibration differences, not true quality differences. The dashboard shows different composite scores for the same runs depending on the judge mix, which is not a valid comparison across time.

**Prevention:**

1. Before finalizing the ensemble, run all three judges on the existing 9 reference runs and compare per-dimension score distributions. If any judge's mean score on any dimension differs by more than 0.5 points from the other two, that judge requires calibration or the aggregation needs normalization.
2. Use z-score normalization per judge before averaging: convert each judge's raw 1–5 score to a z-score based on that judge's historical distribution, then average the z-scores and convert back to the 1–5 scale. This is the standard approach in multi-rater calibration.
3. Alternatively, use median-of-three rather than mean — median is more robust to a single outlier judge.
4. Document in the scoring methodology that the ensemble composite is not directly comparable to old single-judge scores (see Pitfall 5).

**Detection:** Per-judge score distributions should overlap substantially. If GPT-4o's average score on any dimension exceeds Claude's by more than 0.5 points across the reference runs, calibration is needed.

**Phase to address:** Phase designing ensemble aggregation logic — before committing final formula.

---

### Pitfall 3: Self-Preference Bias Inflating Scores for the Judge's Own Family

**What goes wrong:** Research published in 2024–2025 (Self-Preference Bias in LLM-as-a-Judge, Arxiv 2410.21819; Beyond the Surface: Measuring Self-Preference in LLM Judgments, ACL 2025) demonstrates that GPT-4o and Claude 3.5 Sonnet both display significant family-bias — they assign systematically higher scores to outputs from models in their own family. The bias is not limited to identical models: GPT-4o assigns higher scores to GPT-3.5-Turbo outputs than to Claude outputs, and vice versa.

In RBAB, this creates a structural conflict: when GPT-4o is both a tested model AND a judge in the ensemble, GPT-4o's judge score for GPT-4o's harness output will be inflated relative to its score for Claude's output. Same for the Claude judge scoring Claude's output.

**Consequences:** The ensemble score is biased in favor of whichever judge model also ran the harness. A three-judge panel where each judge is also one of the tested models produces a leaderboard that reflects self-favoritism, not quality. This would directly undermine RBAB's credibility.

**Prevention:**

1. The simplest mitigation: exclude a judge's score when evaluating that judge's own model family. For a run with model `openai/gpt-4o`, the ensemble uses only Claude and Gemini scores (two-judge average). For `anthropic/claude-sonnet-4-6`, use only GPT-4o and Gemini.
2. If implementation complexity of conditional judge exclusion is high, an alternative is to add a fourth judge that is not in the tested set (e.g., a Mistral or Llama model) specifically to prevent any 2-vs-1 self-preference scenario.
3. Document this bias and the chosen mitigation explicitly in the scoring methodology section of the README.

**Detection:** Compare a model's composite score when evaluated by all 3 judges vs. only the 2 non-family judges. If the delta is greater than 5 points, self-preference bias is active and must be handled.

**Phase to address:** Phase designing ensemble aggregation logic — this is a structural constraint that affects the aggregation formula design.

---

### Pitfall 4: One Judge API Failure Silently Invalidating the Entire Eval Run

**What goes wrong:** The current `runEval` function has a single judge call path (`callJudge`) that throws on failure after one retry, and the caller silently returns without writing `scored/` or updating `index.json`. This is acceptable for a single judge because the run simply has no score, which is observable.

With a 3-judge ensemble, the failure modes multiply:

- Gemini API goes down mid-run. Claude and GPT-4o both succeed. The current architecture has no concept of a "partial ensemble." The run writes no score at all.
- OpenAI rate-limits one call. All three judges need to be called, but the current sequential architecture means a 429 on judge 2 aborts the whole eval before judge 3 runs.
- One judge returns valid JSON but with a score of 0 on all dimensions (valid per the Zod schema, but a silent quality failure). The averaged composite is pulled down by a bad outlier with no visibility.

**Consequences:** An eval run costs 3x the judge tokens and API calls. Any partial failure produces no result rather than a degraded result. This is worse than the current single-judge behavior, not better.

**Prevention:**

1. Run the three judge calls concurrently with `Promise.allSettled` (not `Promise.all`) — this ensures all three attempts complete regardless of individual failures, and the caller inspects each result independently.
2. Define a quorum threshold: if at least 2 of 3 judges succeed, write a scored result flagged as `ensemble_complete: false` with the available judges listed. Only invalidate the run if 0 or 1 judges succeed.
3. Implement per-judge retries independently (each judge retries once on malformed JSON), not a global retry that retries all three.
4. Log which judges contributed to each score in the ScoredResult JSON, e.g., `"judges": ["anthropic/claude-sonnet-4-6", "openai/gpt-4o"]`, so downstream consumers know if a run used 2 vs 3 judges.
5. Add timeouts per judge call (e.g., 30 seconds) to prevent one slow provider from blocking the entire run.

**Detection:** Monitor `ensemble_complete` flag in index.json. If any runs have this flag as `false`, investigate the failing provider.

**Phase to address:** Phase implementing the judge call infrastructure — before adding score aggregation.

---

### Pitfall 5: Backwards Compatibility Break in index.json

**What goes wrong:** The current `index.json` schema has no concept of a judge model or ensemble. Each `IndexEntry` has a single `composite_score` computed from a single judge. When the new ensemble code writes a new run, it writes a new-format entry. But the existing 9 reference run entries in `index.json` are single-judge scores with no `judges` field.

The dashboard reads `index.json` and presumably renders a table. Two problems arise:

- **Silent incompatibility:** The dashboard code reads `entry.composite_score` without knowing whether that score came from 1 judge or 3. A 78 from Claude-only and a 78 from 3-judge ensemble are not the same measurement. Rendering them together on the same chart implies comparability that does not exist.
- **Schema mismatch:** If the new `IndexEntry` type adds required fields (`judges`, `ensemble_complete`), the old entries will fail TypeScript type checks or cause runtime errors when the dashboard tries to read them.

**Consequences:** The leaderboard mixes single-judge and ensemble scores without indication, misleading comparisons. The old reference runs appear to have lower/higher scores than re-runs with the ensemble, when the change is methodological, not model quality.

**Prevention:**

1. Add a `scoring_method` field to `IndexEntry` with values `"single"` (backward compat default) and `"ensemble"`. Existing entries without this field default to `"single"` via nullish coalescing.
2. Add an optional `judges: string[]` field to `IndexEntry`. Old entries have no `judges` field; new entries populate it.
3. The dashboard must render `scoring_method` as a visible tag alongside each run's score. Do not mix the two on the same chart without a filter or visual separator.
4. Before launching the multi-judge feature, re-score all 9 reference runs with the ensemble and write them as new entries with `scoring_method: "ensemble"`. The old single-judge entries are retained in `index.json` as a historical record but are visually distinguished.
5. Add a `schema_version` field to `index.json` (e.g., `"schema_version": 2`) to let the dashboard detect and handle old-format files.

**Detection:** After writing the first ensemble-scored entry, read it back with the updated `IndexEntry` TypeScript type. Confirm no TypeScript errors and no runtime undefined access in the dashboard.

**Phase to address:** Phase updating data models and index.json schema — before the first ensemble-scored run is written.

---

## Moderate Pitfalls

### Pitfall 6: Cost Multiplication Without Usage Guardrails

**What goes wrong:** Each judge call consumes input tokens (the full judge prompt + model output + rubric) and output tokens (the JSON response). With three judges per eval run:

- Current single-judge cost per run: approximately (prompt tokens) × 3 providers' pricing.
- Ensemble cost per run: 3x judge tokens on top of the model run cost itself.

For RBAB's current scale (9 reference runs, manual re-runs), this is manageable. But the active backlog includes SCORE-02 (multi-pass judge: 3× per output), which would compound to 9 judge calls per run (3 judges × 3 passes). Combined with EXPND-01 (additional harness domains) and EXPND-03 (automated CI re-runs), unguarded cost could scale quickly.

**Prevention:**

1. Profile actual token counts for a judge call on each harness before setting a budget. The current judge prompt is ~800 tokens of instructions plus the model output (variable) plus the rubric (~300 tokens). Total input is likely 1,500–2,500 tokens per judge call.
2. Add a `--judges` CLI flag that accepts a comma-separated list of judge providers. Default to all three; allow `--judges anthropic` for single-judge mode during development and CI validation runs.
3. Document expected cost per full benchmark run in the README (e.g., "Running all 3 harnesses with ensemble judging costs approximately $X at current API pricing").
4. For CI re-runs (EXPND-03), use single-judge mode to keep CI costs low; ensemble is for published reference runs only.

**Phase to address:** Phase designing the ensemble CLI interface — add `--judges` flag from day one.

---

### Pitfall 7: Temperature 0 Non-Determinism Differs by Provider

**What goes wrong:** The current `callJudge` hardcodes `temperature: 0` because Claude Sonnet at temperature 0 is stable enough to treat as deterministic. Research from 2025 shows this assumption does not hold uniformly across providers:

- Claude: explicitly documented that temperature 0 is not fully deterministic. Moderate consistency.
- GPT-4o: lower consistency at temperature 0 than smaller models. Non-determinism attributed to Sparse MoE routing, floating-point GPU batching, and model parallelism.
- Gemini: determinism behavior is less documented; temperature 0 reduces variance but does not eliminate it.

For a benchmark claiming reproducible scores, this is a validity problem. Two runs on the same harness with the same 3-judge ensemble could produce measurably different composites.

**Prevention:**

1. Quantify actual variance empirically: run the same judge prompt 5 times per provider at temperature 0 on 3 reference outputs. Compute the standard deviation of scores per dimension.
2. If variance is above 0.2 points standard deviation per dimension, multi-pass judging (SCORE-02: 3× per output averaged) becomes more important, not less.
3. Document the observed variance in the scoring methodology. Do not claim perfect determinism; claim "mean score across N passes at temperature 0."
4. For the Anthropic judge call specifically: the current hardcoded temperature is `0` in the `messages.create` call. The issue EVAL-02 ("judge_temperature hardcoded") is relevant here — this should be a config value, especially since different judges may warrant different temperature settings.

**Phase to address:** Phase implementing multi-judge infrastructure — test before claiming reproducibility.

---

### Pitfall 8: Rationale Field Comparability Breaks Human Auditing

**What goes wrong:** One of RBAB's credibility features is that every score has a one-sentence rationale citing specific evidence. The current judge prompt enforces this: "Provide a one-sentence rationale that cites specific observable evidence from the model output."

Across three judge providers, the rationale field will have materially different styles:
- Claude: concise, evidence-citing, often uses exact quoted phrases from the output.
- GPT-4o: tends to expand into two or three sentences despite the "one sentence" instruction, and often adds qualitative preamble before the evidence citation.
- Gemini: rationales can be brief but sometimes reference rubric anchor text rather than the actual model output.

The dashboard currently displays rationales per dimension. If the dashboard shows all three judges' rationales side-by-side, the inconsistency in length and style will look like a quality gap between providers rather than a prompt compliance issue. If the dashboard shows only one rationale (e.g., from the primary judge), users can't audit ensemble scores.

**Prevention:**

1. Store all three judges' rationales per dimension in `ScoredResult` under a new `judge_rationales` field, keyed by judge model name. Display the primary judge's rationale by default; surface others via expand/tooltip.
2. Add a "rationale compliance" check during testing: does each judge's rationale contain a quoted phrase or specific data value from the model output? This detects generic rationales that pass validation but provide no audit value.

**Phase to address:** Phase updating ScoredResult schema and dashboard display.

---

## Minor Pitfalls

### Pitfall 9: Gemini API Authentication Differs from Anthropic/OpenAI

**What goes wrong:** The current `callJudge` function is Anthropic-only (`new Anthropic({ apiKey: ... })`). OpenAI uses `new OpenAI({ apiKey: ... })`. Google Gemini has two separate APIs: the Gemini Developer API (uses `GOOGLE_API_KEY`) and Vertex AI (uses `GOOGLE_APPLICATION_CREDENTIALS` service account JSON). The correct one depends on how the project is structured.

The existing CLI runner code already handles all three providers (it's in the active stack), but `callJudge` does not. The judge client instantiation needs to mirror the runner's provider routing logic.

**Prevention:** Extract the provider-dispatch logic from the existing runner into a shared `createProviderClient(model: string)` utility. Both the harness runner and the judge caller should use the same function. Don't write a second parallel implementation.

**Phase to address:** Phase implementing multi-judge infrastructure.

---

### Pitfall 10: The `judgeModel` Field in harness.yaml Is a Single String

**What goes wrong:** Each harness spec currently has `spec.eval.judge_model` as a single string (e.g., `"anthropic/claude-sonnet-4-6"`). The `runEval` function passes this to `callJudge`. There is no current affordance for a list of judge models.

If the multi-judge feature is implemented by changing `judge_model` to `judge_models: string[]` in the HarnessSpec type, every harness yaml file needs to be updated and the spec parsing logic updated. If this migration is done inconsistently (some harnesses updated, some not), the runner silently falls back to single-judge behavior without warning.

**Prevention:** Either add `judge_models` as a new optional array field alongside the existing `judge_model` (backward-compatible), or add a runtime check that warns when `judge_model` is a string and `judge_models` is absent when running in ensemble mode.

**Phase to address:** Phase updating HarnessSpec type and harness yaml files.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Multi-judge call infrastructure | One provider failure silently drops the entire run | Use `Promise.allSettled`; define 2-of-3 quorum |
| Score aggregation formula | Self-preference bias inflates scores for judge's own model family | Exclude judge's own family from its score contribution |
| Provider prompt compatibility | GPT-4o and Gemini may not reliably produce schema-valid JSON from the current prompt | Test raw output per provider before building aggregation; use native structured output APIs |
| Score calibration | GPT-4o verbosity bias inflates scores for long outputs; Gemini calibration differs from Claude | Validate score distributions on reference runs; consider z-score normalization |
| index.json schema update | Old single-judge entries become incompatible with new ensemble entries | Add `scoring_method` and `judges` fields; treat absent fields as `"single"` |
| Dashboard display | Mixing single-judge and ensemble scores on one chart implies false comparability | Add `scoring_method` filter; visually distinguish old vs. new entries |
| Cost management | 3x judge calls per run, compounded by multi-pass judging | Add `--judges` CLI flag; default to single-judge for CI runs |
| Temperature determinism | Temperature 0 is not actually deterministic across all three providers | Empirically measure variance; document observed reproducibility bounds |

---

## Sources

- [Justice or Prejudice? Quantifying Biases in LLM-as-a-Judge](https://llm-judge-bias.github.io/) — 12 bias types, CALM framework, cross-model bias analysis
- [Self-Preference Bias in LLM-as-a-Judge (Arxiv 2410.21819)](https://arxiv.org/abs/2410.21819) — GPT-4o and Claude 3.5 Sonnet family-bias findings
- [Beyond Consensus: Mitigating the Agreeableness Bias in LLM Judge Evaluations](https://aicet.comp.nus.edu.sg/wp-content/uploads/2025/10/Beyond-Consensus-Mitigating-the-agreeableness-bias-in-LLM-judge-evaluations.pdf) — bandwagon effects in multi-judge panels
- [Exploring Biases in GPT-4o, Claude, and Qwen2.5 Judgements](https://www.simonpcouch.com/blog/2025-01-30-llm-biases/) — scoring tendency differences per provider
- [Structured Output Comparison across popular LLM providers](https://www.glukhov.org/llm-performance/benchmarks/structured-output-comparison-popular-llm-providers) — JSON reliability differences across Anthropic, OpenAI, Google
- [SE-Jury: An LLM-as-Ensemble-Judge Metric](https://arxiv.org/html/2505.20854v2) — ensemble aggregation strategies, dynamic team selection
- [Does Temperature 0 Guarantee Deterministic LLM Outputs?](https://www.vincentschmalbach.com/does-temperature-0-guarantee-deterministic-llm-outputs/) — per-provider determinism analysis
- [Retries, Fallbacks, and Circuit Breakers in LLM Apps](https://portkey.ai/blog/retries-fallbacks-and-circuit-breakers-in-llm-apps/) — production resilience patterns for multi-provider LLM calls
- [Using LLMs for Evaluation (Cameron Wolfe)](https://cameronrwolfe.substack.com/p/llm-as-a-judge) — verbosity bias, calibration, best practices
