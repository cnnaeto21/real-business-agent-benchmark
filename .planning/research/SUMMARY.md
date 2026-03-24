# Project Research Summary

**Project:** Real Business Agent Benchmark (RBAB) — Multi-Judge Ensemble Milestone (SCORE-02)
**Domain:** LLM evaluation pipeline — multi-judge ensemble scoring
**Researched:** 2026-03-23
**Confidence:** MEDIUM-HIGH

## Executive Summary

RBAB's multi-judge milestone adds Claude, GPT-4o, and Gemini as co-judges to an existing, production-validated single-Claude eval pipeline. The existing pipeline is well-structured and additive-extension-friendly: all three SDKs are already installed, all three API keys are already set, and the existing `callJudge` pattern is clean enough to clone for OpenAI and Google. The core engineering work is narrow — two new judge call functions, one ensemble orchestrator (`callJudgeEnsemble`), one averaging function (`averageJudgeResponses`), and additive schema changes to `ScoredResult` and `IndexEntry`. The recommended build sequence proceeds types-first to avoid integration surprises, and can deliver the full backend change in 1-2 days.

The primary technical risk is not SDK integration — it is judge-output validity. The existing judge prompt was tuned against Claude's JSON formatting behavior, and GPT-4o and Gemini differ in their compliance. Cross-provider self-preference bias is also a structural credibility threat: each judge systematically scores its own model family higher. Research confirms that the mitigation is to exclude a judge's contribution when evaluating its own model family (e.g., use only Claude + Gemini to score GPT-4o's output). This exclusion logic must be built into the aggregation formula, not treated as a future concern.

A secondary risk is backward compatibility: the existing 9 reference runs carry single-judge composite scores that are methodologically incomparable to ensemble-scored runs. The `index.json` schema must be versioned and annotated with a `scoring_method` field before any ensemble-scored results are written, and the dashboard must visually distinguish the two scoring generations. Skipping this step will produce a misleading leaderboard.

## Key Findings

### Recommended Stack

All SDKs needed for this milestone are already installed at current major versions (`@anthropic-ai/sdk` ^0.78.0, `openai` ^6.29.0, `@google/genai` ^1.45.0). No new dependencies are required. Each provider uses a different response accessor pattern: Anthropic uses `response.content.find(b => b.type === "text").text`, OpenAI uses `completion.choices[0].message.content`, and Google uses `response.text`. All three judge calls should use plain text (no `response_format` or `responseMimeType`) to maintain a uniform parse pipeline of markdown-fence-strip -> `JSON.parse` -> Zod `JudgeResponse.safeParse`.

**Core technologies:**
- `@anthropic-ai/sdk` ^0.78.0: existing judge (reference implementation, do not change)
- `openai` ^6.29.0: new OpenAI judge via `client.chat.completions.create` — Chat Completions, not Responses API
- `@google/genai` ^1.45.0: new Google judge via `client.models.generateContent` with `response.text` accessor — this is the unified replacement for the deprecated `@google/generative-ai`
- `zod` ^4.3.6: existing JudgeResponse schema validation (unchanged)

**Model IDs:**
- Anthropic: `claude-sonnet-4-6` (production-confirmed, HIGH confidence)
- OpenAI: `gpt-4o` stable alias (HIGH confidence)
- Google: `gemini-2.5-pro` (MEDIUM confidence — verify at implementation time; fallback to `gemini-2.5-pro-preview-05-06`)

### Expected Features

**Must have (table stakes):**
- Three judge calls in parallel via `Promise.all` — serial calls multiply latency with no benefit
- Per-judge scores and rationales stored in `ScoredResult.judge_passes` — audit trail
- Simple-average aggregate composite as the top-level `composite_score`
- Disagreement flag per dimension (`max - min >= 2` on 1-5 scale, per CMU ML Blog 2025 threshold)
- `judge_ensemble` array in both scored JSON and `index.json`
- Self-preference bias exclusion: exclude a judge's score when evaluating its own model family
- Re-score all 9 existing reference runs under the ensemble pipeline

**Should have (differentiators):**
- `Promise.allSettled` with 2-of-3 quorum instead of `Promise.all` fail-fast — graceful partial ensemble
- `--judges` CLI flag for cost control (single-judge mode for CI, ensemble for published runs)
- `scoring_method` field in `IndexEntry` to distinguish single-judge vs. ensemble runs
- Dashboard ensemble badge reading the `judge_ensemble` field

**Defer (v2+):**
- Judge cost attribution per provider (track alongside SCORE-03 cost-per-insight metric)
- Dashboard per-judge score drill-down (launch with ensemble badge first)
- Weighted aggregation (requires human-rated ground truth corpus RBAB does not have)
- Meta-judge for disagreement adjudication (adds 4th LLM call, marginal gain at 3-judge scale)
- Configurable judge pool beyond the three hard-coded providers
- Statistical significance testing across runs (separate milestone, TOOL-02)

### Architecture Approach

The architecture keeps the existing `callJudge` (single-pass Anthropic function) unchanged and wraps it with two new layers: `callJudgeEnsemble`, which fans out across all three provider judge functions via `Promise.allSettled`, and `averageJudgeResponses`, a pure function that takes `JudgeResponseType[]` and returns a single averaged `JudgeResponseType` (using `Math.round(mean)` per dimension, with first-pass rationale as canonical). `runEval` is the single integration point where the existing `callJudge(...)` call is replaced by the ensemble path. `IndexEntry` stays unchanged in shape to protect the Next.js dashboard; `ScoredResult` gains additive fields only.

**Major components:**
1. `callJudge` (existing, unchanged) — single-pass Anthropic judge call with retry-once on malformed JSON
2. `callJudgeOpenAI` / `callJudgeGoogle` (new) — provider-parallel implementations matching `callJudge` contract exactly
3. `callJudgeEnsemble` (new) — parallel fan-out across all three providers with quorum logic and self-preference exclusion
4. `averageJudgeResponses` (new, pure) — arithmetic mean per dimension, disagreement flag, first-pass rationale as canonical
5. `ScoredResult` (extended) — adds `judge_pass_count`, `judge_passes`, `judge_ensemble`, `ensemble_disagreement`
6. `IndexEntry` (minimally extended) — adds optional `scoring_method` and `judges` fields; old entries without these fields default to `"single"`

### Critical Pitfalls

1. **Cross-provider JSON output variance** — The judge prompt was tuned for Claude. GPT-4o and Gemini have different fence-wrapping and compliance behaviors. Test raw output from each provider on 5 sample outputs before building aggregation logic. Add provider-specific normalization beyond fence-stripping if needed. If raw-text JSON reliability is below 90% per provider, native structured output APIs become required rather than optional.

2. **Self-preference bias** — Claude, GPT-4o, and Gemini each assign systematically higher scores to outputs from their own model family (Arxiv 2410.21819, confirmed). For any run where the subject model is from a judge's family, exclude that judge's score. Use only the two cross-family judges for that run's ensemble. This is a structural requirement with no workaround.

3. **Score distribution miscalibration** — GPT-4o exhibits verbosity bias (higher scores for longer outputs); Gemini calibration differs from Claude. Before finalizing the aggregation formula, run all three judges on the 9 reference runs and compare per-dimension means. If any judge's mean deviates more than 0.5 points from the others, apply z-score normalization before averaging.

4. **Backward compatibility break in `index.json`** — Ensemble-scored composites are not comparable to single-judge composites. Add `scoring_method: "single" | "ensemble"` and optional `judges: string[]` to `IndexEntry` before writing the first ensemble result. Re-score all 9 reference runs as ensemble entries to create a clean comparison baseline.

5. **Partial ensemble failure** — `Promise.all` means one judge API failure aborts the entire run at 3x the cost. Use `Promise.allSettled` with a 2-of-3 quorum: write a result flagged `ensemble_complete: false` if only 2 judges contributed; invalidate only if fewer than 2 judges succeed.

## Implications for Roadmap

The dependency chain is strict: types -> pure functions -> provider integration -> orchestration wiring -> data model updates -> config changes -> re-runs. This maps naturally to four phases.

### Phase 1: Type System and Data Model Foundation
**Rationale:** All subsequent changes depend on correct TypeScript types. Getting interfaces right first means each subsequent phase is independently testable without type errors. Pure type additions break nothing in the existing pipeline.
**Delivers:** Updated `HarnessSpec.eval` (adds optional `judge_passes`); updated `ScoredResult` (adds `judge_pass_count`, `judge_passes`, `judge_ensemble`, `ensemble_disagreement`); updated `IndexEntry` (adds optional `scoring_method` and `judges` fields with backward-compatible defaults).
**Addresses:** Table-stakes features for per-judge score storage and index schema versioning.
**Avoids:** Pitfall 4 (index.json backward compatibility) — schema defined correctly before any ensemble data is written.

### Phase 2: Provider Integration and Judge Call Functions
**Rationale:** The two new provider functions (`callJudgeOpenAI`, `callJudgeGoogle`) must be validated independently before being wired into the ensemble orchestrator. Raw output from each provider must be tested against the current judge prompt before aggregation logic is built on top of it.
**Delivers:** `callJudgeOpenAI` and `callJudgeGoogle` matching the existing `callJudge` contract (accept judge prompt, return `JudgeResponseType`, strip fences, `safeParse`, retry-once, throw on double failure). Provider-specific output normalization where needed. Empirical validation of JSON reliability per provider on 5 sample outputs.
**Uses:** `openai` ^6.29.0 via `client.chat.completions.create`; `@google/genai` ^1.45.0 via `client.models.generateContent` with `response.text` accessor; both without structured output forcing.
**Avoids:** Pitfall 1 (cross-provider JSON variance) — empirical prompt compatibility test gates Phase 3.

### Phase 3: Ensemble Orchestration and Aggregation Logic
**Rationale:** With individual judge functions validated, the ensemble layer can be built on a solid foundation. This phase also resolves the two non-trivial design decisions — self-preference exclusion and quorum logic — that must be correct before any scoring results are produced.
**Delivers:** `callJudgeEnsemble` (parallel fan-out via `Promise.allSettled` with 2-of-3 quorum and self-preference exclusion); `averageJudgeResponses` pure function (per-dimension `Math.round(mean)`, disagreement flag, first-pass rationale); updated `runEval` replacing the single `callJudge` call with the ensemble path. Score distribution validation on reference runs to determine whether z-score normalization is needed.
**Addresses:** Self-preference bias exclusion (table stakes), disagreement flag (differentiator), partial-ensemble quorum (differentiator).
**Avoids:** Pitfall 2 (self-preference bias), Pitfall 3 (score miscalibration), Pitfall 5 (partial failure).

### Phase 4: Configuration, Re-Scoring, and Dashboard
**Rationale:** With the ensemble pipeline validated end-to-end, the final phase updates harness configuration, re-runs all reference models under the new scoring method, and surfaces the results in the dashboard with correct provenance indicators.
**Delivers:** `judge_passes: 3` added to all three `harness.yaml` files; `--judges` CLI flag for cost control; all 9 existing reference runs re-scored with `scoring_method: "ensemble"` entries in `index.json`; dashboard ensemble badge reading `judge_ensemble` field.
**Avoids:** Pitfall 6 (cost multiplication — `--judges` flag enables single-judge CI mode); Pitfall 4 (leaderboard comparability — dashboard distinguishes scoring methods).

### Phase Ordering Rationale

- Type-system changes come first because every other phase depends on correct interfaces. Writing code against provisional types creates rework.
- Provider integration (Phase 2) is isolated before orchestration (Phase 3) because the ensemble aggregation logic is meaningless if individual judge calls are unreliable. The empirical prompt-compatibility test in Phase 2 is a hard gate for Phase 3.
- Orchestration (Phase 3) must include self-preference exclusion from day one — retrofitting it later requires re-scoring all runs again.
- Re-scoring (Phase 4) is last because it produces the final dataset the dashboard must display correctly. The `--judges` CLI flag and dashboard badge changes are straightforward and can happen in parallel with re-scoring.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Provider Integration):** GPT-4o and Gemini JSON output behavior under the current judge prompt is empirically unknown. If either provider's reliability is below 90%, structured output APIs (OpenAI `response_format: json_schema`, Gemini `responseMimeType`) may need to replace prompt-only JSON extraction — a design change with scope implications.
- **Phase 3 (Score Calibration):** Whether z-score normalization is needed depends on empirical score distribution data from the reference runs. This decision gates the final aggregation formula and cannot be resolved before Phase 2 is complete.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Types):** Additive TypeScript interface changes — well-established pattern, no unknowns.
- **Phase 4 (Config/Re-scoring):** YAML field addition and CLI flag — standard patterns, no new technology.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All SDKs production-installed and version-pinned; OpenAI and Google patterns confirmed via official docs and existing codebase usage; no SDK upgrades needed |
| Features | HIGH | Feature list grounded in academic research (NeurIPS 2023, Arxiv 2024-2025) and direct analysis of the existing production pipeline |
| Architecture | HIGH | Based on direct code reads of `src/eval.ts`, `src/types.ts`, and harness files; no speculation about existing structure |
| Pitfalls | MEDIUM-HIGH | Self-preference bias and score distribution pitfalls have published research backing; JSON output variance and calibration thresholds are empirical and will vary per prompt |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Gemini model ID stability:** `gemini-2.5-pro` is the recommended ID but Google's versioning is volatile. Verify the model resolves correctly at implementation time; have `gemini-2.5-pro-preview-05-06` as a fallback.
- **Provider JSON reliability under current prompt:** Unknown until empirically tested in Phase 2. Low reliability would expand Phase 2 scope to include native structured output API integration.
- **Score calibration thresholds:** Whether the 0.5-point mean deviation threshold triggers z-score normalization is unknown until the three judges are run on reference outputs. This decision gates the aggregation formula in Phase 3.
- **Self-preference exclusion matching logic:** The exclusion logic needs careful provider-prefix matching (e.g., `openai/gpt-4o` subject -> exclude OpenAI judge). This should be unit-tested independently before integration.
- **Temperature non-determinism bounds:** Temperature 0 is not fully deterministic across any of the three providers. The variance magnitude is unknown until measured empirically; this affects reproducibility claims.

## Sources

### Primary (HIGH confidence)
- `src/eval.ts` (direct code read, 2026-03-23) — existing `callJudge`, `runEval`, `ScoredResult`, `IndexEntry` shapes
- `src/types.ts` (direct code read, 2026-03-23) — `HarnessSpec.eval` type
- `package.json` (direct read, 2026-03-23) — installed SDK versions
- `harnesses/*/harness.yaml` (direct read, 2026-03-23) — judge config location and structure
- [Judging LLM-as-a-Judge with MT-Bench (NeurIPS 2023, Arxiv 2306.05685)](https://arxiv.org/abs/2306.05685) — foundational LLM-as-judge methodology; GPT-4 > 80% human agreement

### Secondary (MEDIUM confidence)
- [A Survey on LLM-as-a-Judge (Arxiv 2411.15594)](https://arxiv.org/abs/2411.15594) — aggregation methods, bias taxonomy, disagreement thresholds
- [Self-Preference Bias in LLM-as-a-Judge (Arxiv 2410.21819)](https://arxiv.org/abs/2410.21819) — GPT-4o and Claude family-bias findings
- [Justice or Prejudice? Quantifying Biases in LLM-as-a-Judge](https://llm-judge-bias.github.io/) — 12 bias types, mitigation via ensemble
- [Validating LLM-as-a-Judge under Rating Indeterminacy — CMU ML Blog](https://blog.ml.cmu.edu/2025/12/09/validating-llm-as-a-judge-systems-under-rating-indeterminacy/) — disagreement thresholds (max spread >= 2)
- OpenAI Chat Completions API docs — `client.chat.completions.create` pattern confirmed
- `@google/genai` npm package v1.45.0 docs — `ai.models.generateContent`, `response.text` accessor confirmed
- Google Gemini models docs — `gemini-2.5-pro` current flagship tier confirmed
- [Does Temperature 0 Guarantee Deterministic LLM Outputs?](https://www.vincentschmalbach.com/does-temperature-0-guarantee-deterministic-llm-outputs/) — per-provider determinism analysis

### Tertiary (LOW confidence)
- [Exploring Biases in GPT-4o, Claude, and Qwen2.5 Judgements](https://www.simonpcouch.com/blog/2025-01-30-llm-biases/) — scoring tendency differences (practitioner blog)
- [LLM-as-a-Judge best practices — agenta.ai](https://agenta.ai/blog/llm-as-a-judge-guide-to-llm-evaluation-best-practices) — aggregation guidance (practitioner blog)
- [SE-Jury: An LLM-as-Ensemble-Judge Metric (Arxiv 2505.20854)](https://arxiv.org/html/2505.20854v2) — ensemble aggregation strategies

---
*Research completed: 2026-03-23*
*Ready for roadmap: yes*
