# Pitfalls: AI Agent Benchmark Suite

**Domain:** Open-source LLM evaluation / agent benchmark (business tasks)
**Researched:** 2026-03-12

---

## Critical Pitfalls

### 1. Ambiguous success criteria with no ground truth anchor

**What goes wrong:** Rubric dimensions are defined vaguely ("is the answer good?") so the LLM judge assigns arbitrary scores. Results become meaningless.

**Prevention:** Each rubric dimension needs a concrete definition with a calibration example: "Score 5 means recommendation cites ≥3 specific data points with exact values. Score 1 means recommendation contains no data references."

**Warning signs:** Judge rationales are short, vague, or identical across models.

**Phase:** Day 1 — lock rubric before writing any code.

---

### 2. LLM-as-judge positional bias (MT-Bench finding)

**What goes wrong:** When comparing two outputs side-by-side, judges favor whichever appears first. Published as a systematic failure mode in the MT-Bench paper (Zheng et al., 2023).

**Prevention:** RBAB scores each model independently (not A/B pairs). Each model's output is judged in isolation against the rubric. Eliminates positional bias entirely.

**Warning signs:** If you ever move to pairwise comparison, score each ordering and average.

**Phase:** Day 3 (eval engine design).

---

### 3. LLM verbosity bias / length preference

**What goes wrong:** Judges tend to rate longer, more verbose outputs higher regardless of actual quality. Well-documented in AlpacaEval research.

**Prevention:** Add explicit rubric instruction: "Do not score higher simply because the response is longer. A concise, specific recommendation scores higher than a verbose but vague one."

**Warning signs:** Model with highest word count always wins; qualitative scores don't match your own reading of the outputs.

**Phase:** Day 1 — include anti-verbosity instruction in eval-rubric.md.

---

### 4. Self-evaluation bias (judge model = tested model)

**What goes wrong:** Claude scores Claude's outputs favorably; GPT-4o scores GPT-4o favorably. Published finding across multiple studies.

**Prevention:** Fix a single judge model in harness.yaml and never change it. The judge is never the same model being evaluated. Use Claude Sonnet as the judge for all runs (temperature 0 for determinism).

**Warning signs:** Each model consistently scores highest when self-evaluated in any ad-hoc testing.

**Phase:** Day 1 — document in harness.yaml and in scoring methodology docs.

---

### 5. Benchmark data leakage into training data

**What goes wrong:** If harness prompts and data are published, future model versions may be trained on them. Scores improve not because models got smarter but because they memorized the benchmark.

**Prevention:** For v1, this risk is low (vending machine data is obscure). Mitigation: document data provenance and collection date. In v2, version harnesses and periodically rotate data.

**Warning signs:** Model scores jump dramatically on a new version without corresponding improvement on other benchmarks.

**Phase:** Document in LIMITATIONS.md before launch.

---

## Moderate Pitfalls

### 6. Non-determinism without reproducibility controls

**What goes wrong:** Two runs of the same model on the same harness produce different scores because temperature > 0 introduces randomness.

**Prevention:** Set temperature to a fixed value (0.0 or 0.2) and log it in every run manifest. Document that published reference results are single-pass at temperature 0.2.

**Warning signs:** Score variance >10% between identical runs.

**Phase:** Day 2 (CLI runner).

---

### 7. Leading prompts that anchor model reasoning

**What goes wrong:** System prompt inadvertently tells the model what conclusion to reach. Example: "You are a cost-cutting expert" biases inventory recommendations toward reducing stock.

**Prevention:** System prompt should describe the task and output format only. Avoid role personas that imply a conclusion direction. Have someone else read the prompt before publishing.

**Warning signs:** All models reach the same qualitative conclusions regardless of data variation.

**Phase:** Day 1 (prompt authoring).

---

### 8. Unrepresentative scenarios (single vending business)

**What goes wrong:** Results only apply to one business context. Community dismisses benchmark as too narrow.

**Prevention:** Frame this honestly — RBAB is a proof-of-concept harness format, not a universal business benchmark. In README: "These harnesses use one vending operation's data. Fork the harness format for your domain." Make the limitation a feature: reproducibility requires specificity.

**Warning signs:** N/A — this is a known tradeoff, document it proactively.

**Phase:** README + LIMITATIONS.md.

---

### 9. Model versioning on dashboard becomes stale

**What goes wrong:** Dashboard shows "GPT-4o" scores from March 2026. By the time anyone reads it, GPT-4o has had 3 silent updates and results are misleading.

**Prevention:** Show run date prominently alongside model name. Log the API version in every run manifest. Dashboard shows "GPT-4o (2026-03-15)" not just "GPT-4o."

**Warning signs:** Users ask "which version of GPT-4o?" and you can't answer.

**Phase:** Day 4 (reference runs) — capture API version in run manifest from the start.

---

### 10. Open-source repo that is hard to run

**What goes wrong:** Contributors can't reproduce runs because setup is undocumented or requires env variables, API keys, or data files that aren't included.

**Prevention:** Day 7 is dedicated to reproducing from scratch following the README. Every required env variable must be documented. API keys documented (not included, obviously). Data files committed to repo. `npm install && npm run benchmark -- --harness inventory --model anthropic/claude-sonnet-4-6` must work after README setup.

**Warning signs:** You need to explain anything verbally that isn't in the README.

**Phase:** Day 6-7 (README + launch prep).

---

### 11. Dashboard cherry-picking favorable metrics

**What goes wrong:** The person running the benchmark (you) chose which metric to display prominently. Community suspects bias.

**Prevention:** Show all dimensions, not just composite score. Show each model's strengths and weaknesses. The benchmark's credibility comes from showing where models fail, not just where they succeed.

**Warning signs:** All results look too uniformly good.

**Phase:** Day 5-6 (dashboard design).

---

## Minor Pitfalls

### 12. Overly strict JSON schema penalizing format deviations

**What goes wrong:** Model returns semantically correct output but with extra fields or slightly different field names. Schema validation fails. Model penalized for formatting, not reasoning.

**Prevention:** Use `additionalProperties: true` in JSON Schema. Validate required fields are present and correctly typed; ignore extra fields. Log the extraction method (native JSON vs. regex-extracted from fences).

**Phase:** Day 3 (eval engine).

---

### 13. Business jargon in harness data unexplained

**What goes wrong:** Data CSV has columns like "par_level", "velocity_7d", "COGS" without explanation. Models from outside the vending/retail domain score poorly not because of reasoning failure but because of terminology unfamiliarity.

**Prevention:** Add a data dictionary to the harness system prompt. Define all domain terms inline. This levels the playing field — models compete on reasoning, not on having vending industry training data.

**Phase:** Day 1 (prompt authoring).

---

### 14. 7-day timeline cuts that hurt credibility

**Safe to defer (won't hurt v1 credibility):**
- Multi-pass judge runs (3x averaging) — single-pass with documented limitation is fine
- Risk awareness rubric dimension — 4 dimensions sufficient for launch
- Community submission portal — author-only is correct for v1
- CI re-run automation — manual re-runs are fine

**Not safe to cut:**
- Transparent judge prompt in repo — without this, results aren't auditable
- Run manifest with model version + temperature — without this, results aren't reproducible
- LIMITATIONS.md — without this, community dismisses as overclaiming
- Anonymized data release — without this, can't publish to GitHub

**Phase:** Day 7 planning.
