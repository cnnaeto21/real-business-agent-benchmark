# Feature Landscape

**Domain:** AI Agent Benchmark and Evaluation Platform (Business Task Focus)
**Project:** Real Business Agent Benchmark (RBAB)
**Researched:** 2026-03-12

---

## Table Stakes

Features every credible benchmark must have. Missing = results dismissed by community.

| Feature | Why Expected | Complexity |
|---------|--------------|------------|
| Versioned harness format | Results must cite a specific harness version; "v1.0.0 of inventory harness" is a citable artifact | Low |
| Deterministic prompt construction | Same input data must produce identical prompts every run | Low |
| Structured output schema (JSON) | Enables automated scoring; invalid JSON = automatic 0 | Medium |
| Per-dimension scoring breakdown | Single aggregate score hides which capability failed (HELM reports 5+ dimensions) | Medium |
| Reproducible run record | Every result must include: model name+version, date, harness version, temperature, total tokens | Low |
| Cost and latency reporting | AI builders evaluate cost-effectiveness, not just accuracy | Low |
| Public reference results | At least one published baseline; without it the benchmark has no anchor | Low |
| Self-contained harness package | Others must reproduce results without contacting the author | Medium |
| CLI runner with single command | `benchmark --harness inventory --model gpt-4` | Medium |
| README with methodology | Community dismisses benchmarks without documented methodology | Low |
| Anonymized data release | Real business data requires scrubbing before public release | Low |

---

## Differentiators

What makes RBAB stand out from SWE-bench-style benchmarks.

| Feature | Value | Complexity |
|---------|-------|------------|
| Hybrid scoring: JSON parse + LLM judge | No business benchmark combines structured output validation with qualitative reasoning scoring | High |
| Business rubric dimensions | Existing benchmarks lack: actionability, specificity, risk awareness, data grounding | Medium |
| Real operational data (not synthetic) | SWE-bench uses GitHub issues; RBAB uses actual P&L and sales velocity — credibly grounded | High |
| Domain coherence across harnesses | All 3 harnesses share same business — enables cross-harness analysis | Low |
| Cost-per-insight metric | (composite score / total USD cost) × 100 — answers "is GPT-4o worth 3x?" | Low |
| Transparent judge prompt | Most LLM-as-judge implementations hide the judge prompt; publishing enables audit/replication | Low |
| Results show actual output excerpts | Visitors read GPT-4o vs Claude's actual recommendations side by side | Medium |
| "Fork this harness" affordance | Clear structure + docs so others can adapt data to their own domain | Low |

---

## Anti-Features (Deliberately NOT in v1)

| Anti-Feature | Why Avoid |
|--------------|-----------|
| Community submission portal | Prevents leaderboard gaming; v1 results credible only if author-controlled |
| Automated re-runs on model version bumps | Good v2 feature; not needed for launch |
| Multi-turn / conversational harness | Dramatically increases scoring complexity; start single-turn |
| Harnesses outside vending domain | Single domain keeps data quality high and story coherent |
| Custom model inference server | Local models add infra complexity; v1 uses provider APIs only |
| Automated ground truth validation | No ground truth exists for open-ended business decisions |
| Statistical significance testing | Overkill for v1 with 3 harnesses and 3 models |

---

## Business Rubric Dimensions (LLM Judge)

| Dimension | Definition | Scale |
|-----------|------------|-------|
| Data grounding | Does the recommendation cite specific numbers from the provided data? | 1-5 |
| Actionability | Are recommendations specific enough to act on? | 1-5 |
| Reasoning transparency | Does the model show its work — what data drove the conclusion? | 1-5 |
| Risk awareness | Does the model flag tradeoffs, caveats, or potential downsides? | 1-5 |
| Completeness | Does output address all required schema fields and key decision factors? | 1-5 |

Start with 4 core dimensions (data grounding, actionability, reasoning transparency, completeness). Add risk awareness in v2.

---

## Run Result JSON Standard Format

```json
{
  "harness": "inventory-optimization",
  "harness_version": "1.0.0",
  "run_date": "2026-03-15T14:22:00Z",
  "model": {
    "provider": "anthropic",
    "model_id": "claude-sonnet-4-6",
    "temperature": 0.2,
    "max_tokens": 2000
  },
  "tokens": { "input": 3240, "output": 847, "cost_usd": 0.0187 },
  "latency_ms": 4823,
  "schema_valid": true,
  "scores": {
    "data_grounding": 4,
    "actionability": 5,
    "reasoning_transparency": 4,
    "completeness": 4,
    "composite": 4.25
  },
  "judge_model": "claude-sonnet-4-6",
  "judge_rationales": {
    "data_grounding": "Model cited exact sales velocity figures for 7 SKUs...",
    "actionability": "All recommendations included specific par levels..."
  }
}
```

---

## MVP Feature Set

**Must ship for v1 credibility:**
1. Versioned harness packages (all 3) — data + prompt + schema + rubric
2. JSON output schema validation (first scoring gate)
3. LLM-as-judge on 4 core dimensions
4. CLI runner: single command, outputs run manifest JSON
5. Reference runs: Claude Sonnet, GPT-4o, Gemini 1.5 Pro × 3 harnesses = 9 runs
6. Results dashboard: model comparison table with scores, cost, latency, excerpts
7. Transparent judge prompt published in repo

**Defer without losing credibility:**
- Risk awareness dimension (start with 4, not 5)
- Multi-pass judge runs (single-pass sufficient, document as known limitation)
- Cost-per-insight metric (easy to add post-launch)
