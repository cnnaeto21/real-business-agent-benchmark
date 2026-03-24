# Feature Landscape

**Domain:** Multi-Judge LLM Evaluation Ensemble
**Project:** Real Business Agent Benchmark (RBAB) — Multi-Judge Milestone
**Researched:** 2026-03-23
**Milestone scope:** Adding Claude + GPT-4o + Gemini as co-judges to the existing single-Claude eval pipeline

---

## Context: Existing Pipeline (Already Built)

The eval pipeline in `src/eval.ts` calls a single Anthropic judge, parses a
`JudgeResponse` (3 dimensions × `{score, rationale}`), computes
`(sum / 3) * 20` → composite 0-100, and writes to
`results/<run-id>/scored/<model-slug>.json` plus `results/index.json`.

All new features must be additive and backward-compatible with that structure.

---

## Table Stakes

Features the multi-judge milestone must deliver. Missing any = the stated goal
("reduce single-judge bias") is not achieved.

| Feature | Why Required | Complexity | Pipeline Dependency |
|---------|--------------|------------|---------------------|
| Parallel judge calls (Claude + GPT-4o + Gemini) | Serial calls add 3× latency with no benefit; Promise.all() is straightforward in Node.js | Low | Requires OpenAI SDK + Google Generative AI SDK already in repo |
| Per-judge score storage in scored JSON | Needed to audit bias, replay scoring, detect drift later | Low | Extend existing `ScoredResult` shape |
| Aggregate (averaged) scores in scored JSON | The single consumer of scores (dashboard) needs one canonical number | Low | `computeComposite` already exists; wrap it |
| index.json stores aggregated composite | Dashboard reads index.json; must reflect ensemble score, not single-judge score | Low | `upsertIndex` already handles arbitrary `IndexEntry` |
| Judge identity recorded per score | Reproducibility — knowing which model produced which score is required to audit bias claims | Low | Add `judge_model` field to per-judge block |
| Simple average aggregation (default) | Supported by academic literature as sufficient when judges are roughly equal-capability frontier models; simpler than weighted | Low | Arithmetic on existing dimension scores |
| Retry-once on malformed JSON per judge | Existing single-judge path already retries once; multi-judge needs same contract per judge | Low | Replicate existing `attempt()` pattern per provider |

---

## Differentiators

Features that elevate ensemble scoring from "three API calls" to a credible
bias-reduction mechanism.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Disagreement flag per dimension | Research (arxiv 2411.15594) shows max dimension spread ≥ 2 points on a 1-5 scale signals genuine ambiguity; flagging it surfaces low-confidence scores to dashboard viewers | Low | `max(scores) - min(scores) >= 2` per dimension → `high_disagreement: true` |
| Per-judge rationale stored (not just score) | Rationales are the audit trail; they reveal *why* GPT-4o gave 3 when Claude gave 5; without them the disagreement flag is opaque | Low | Already captured in existing `{score, rationale}` shape |
| Judge cost tracked per judge | Judge ensemble adds real cost; cost-per-insight metric (PROJECT.md SCORE-03) requires accurate judge cost attribution | Medium | Requires token counting per provider SDK |
| Dashboard "ensemble badge" | Visual indicator that a result used 3-judge ensemble vs single-judge; gives audience confidence signal | Low | Dashboard-side feature; backend emits `judge_ensemble: ["claude", "gpt-4o", "gemini"]` field |
| Graceful partial-ensemble on judge failure | If one of three judges fails, record the two successes rather than failing the whole eval; document which judge(s) contributed | Medium | Requires Promise.allSettled + minimum-quorum logic (2/3 sufficient) |

---

## Anti-Features

Features that seem valuable but should NOT be built in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Weighted aggregation by judge "quality" | No reliable weight source exists without ground truth; assigning weights is speculation dressed as science. Academic findings (Jury-on-Demand approach) require learned reliability predictors trained on human ratings — RBAB has no human rating corpus | Use equal-weight simple average; document as known limitation |
| Meta-judge (LLM adjudicating disagreements) | Adds a 4th LLM call on disagreement; introduces additional bias; significant complexity for marginal gain at 3-judge scale | Flag disagreement in data; let the human reading the dashboard interpret |
| Score calibration / normalization across judges | Different models use different regions of a 1-5 scale (GPT-4o tends high; Gemini varies). Calibration requires a ground-truth dataset RBAB doesn't have | Report raw per-judge scores and note calibration as future work |
| Configurable judge pool (plug in any model) | Premature abstraction; current scope is exactly Claude + GPT-4o + Gemini | Hard-code three judges; refactor to config when a 4th judge is needed |
| Asynchronous / background judge runs | CLI is synchronous end-to-end by design; async eval would require a queue, state management, and polling — massive scope increase | Run all three judges in a single Promise.all() within the existing sync CLI flow |
| Statistical significance testing across runs | PROJECT.md TOOL-02 defers this; it requires multiple runs per model, not just multiple judges per run | Separate milestone |

---

## Feature Dependencies (on Existing Pipeline)

```
callJudge() (Anthropic-only) → must be provider-abstracted
  └─ New: callJudgeAnthropic(), callJudgeOpenAI(), callJudgeGoogle()
         all return the same JudgeResponseType

computeComposite(scores) → already correct; call once per judge + once on averages

ScoredResult interface → extend with:
  judge_ensemble: string[]          // e.g. ["claude-sonnet-4-6", "gpt-4o", "gemini-1.5-pro"]
  per_judge_scores: {
    [judgeModel: string]: JudgeResponseType & { cost_usd: number }
  }
  ensemble_disagreement: {
    actionability: boolean
    reasoning_transparency: boolean
    completeness: boolean
  }
  // existing composite_score becomes the averaged ensemble composite
  // existing scores become averaged dimension scores

IndexEntry → add judge_ensemble: string[] field (for dashboard badge)
```

---

## Score Aggregation: Research Findings

**Simple average is the right choice for this milestone.** Findings:

- The "A Survey on LLM-as-a-Judge" (arxiv 2411.15594, 2024) confirms majority-vote
  and simple averaging reduce per-judge variance and are the established baseline.
- Weighted aggregation outperforms simple averaging only when judge reliability
  weights are learned from human preference data — RBAB has no such corpus.
- Self-preference bias research (arxiv 2410.21819) confirms Claude, GPT-4o, and
  Gemini each show family-bias toward outputs from their own model family. Using
  all three judges and averaging directly cancels out this bias across the 3-model
  reference run set (each model is judged by its own family judge once and
  cross-family judges twice).
- Disagreement threshold: max spread ≥ 2 on a 1-5 scale is the practical signal
  (CMU ML Blog, 2025). This maps to a 40-point range on the 1-5 integer scale —
  a meaningful gap that warrants the flag.

**Formula:**

```
dimension_avg = mean(judge_1.dimension, judge_2.dimension, judge_3.dimension)
composite_ensemble = (actionability_avg + reasoning_transparency_avg + completeness_avg) / 3 * 20
high_disagreement = max(judges.dimension) - min(judges.dimension) >= 2
```

---

## Implementation Complexity Summary

| Feature | Effort | Risk |
|---------|--------|------|
| Provider-abstract callJudge() | Low (2-3 hrs) | Low — OpenAI/Google SDKs already known patterns |
| Promise.all() parallel fan-out | Low (1 hr) | Low — 3 calls only, no rate-limit concerns |
| ScoredResult schema extension | Low (1 hr) | Low — additive fields, backward-compatible reads |
| IndexEntry extension + upsertIndex | Low (30 min) | Low — existing function handles arbitrary shape |
| Dashboard ensemble badge + per-judge display | Medium (2-4 hrs) | Low — display only, no new data pipeline |
| Partial-ensemble on judge failure | Medium (2 hrs) | Medium — quorum logic needs careful error handling |
| Disagreement flag | Low (30 min) | Low — arithmetic on existing fields |

Total estimated effort: 1-2 days for backend; 0.5-1 day for dashboard updates.

---

## MVP for This Milestone

**Must deliver:**
1. Three judge calls in parallel (Claude + GPT-4o + Gemini)
2. Per-judge scores + rationales stored in scored JSON
3. Simple-average aggregate composite written as top-level `composite_score`
4. Disagreement flag per dimension (max spread ≥ 2)
5. `judge_ensemble` array in both scored JSON and index.json
6. Existing 9 reference runs re-scored under ensemble pipeline

**Defer without losing milestone value:**
- Judge cost attribution (add alongside SCORE-03 cost-per-insight metric)
- Dashboard per-judge score drill-down (launch with ensemble badge first)
- Partial-ensemble quorum logic (fail-fast on any judge failure is acceptable for v1 ensemble)

---

## Sources

- [A Survey on LLM-as-a-Judge (arxiv 2411.15594)](https://arxiv.org/abs/2411.15594) — inter-judge reliability, aggregation methods, bias taxonomy — MEDIUM confidence
- [Self-Preference Bias in LLM-as-a-Judge (arxiv 2410.21819)](https://arxiv.org/abs/2410.21819) — GPT-4o and Claude 3.5 Sonnet confirmed family-bias — MEDIUM confidence
- [Justice or Prejudice? Quantifying Biases in LLM-as-a-Judge](https://llm-judge-bias.github.io/) — bias types, mitigation via ensemble — MEDIUM confidence
- [Judging LLM-as-a-Judge with MT-Bench (arxiv 2306.05685)](https://arxiv.org/abs/2306.05685) — foundational LLM-as-judge methodology, GPT-4 > 80% human agreement — HIGH confidence (peer-reviewed NeurIPS)
- [LLM-as-a-Judge best practices — agenta.ai](https://agenta.ai/blog/llm-as-a-judge-guide-to-llm-evaluation-best-practices) — practical prompt and aggregation guidance — LOW confidence (practitioner blog)
- [Validating LLM-as-a-Judge under Rating Indeterminacy — CMU ML Blog](https://blog.ml.cmu.edu/2025/12/09/validating-llm-as-a-judge-systems-under-rating-indeterminacy/) — disagreement thresholds, variance metrics — MEDIUM confidence
- [Gemini API Structured Output](https://ai.google.dev/gemini-api/docs/structured-output) — JSON schema support confirmed for Gemini models — HIGH confidence (official docs)
