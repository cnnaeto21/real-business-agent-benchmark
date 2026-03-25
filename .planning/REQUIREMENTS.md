# Requirements: Real Business Agent Benchmark (RBAB)

**Defined:** 2026-03-22
**Core Value:** Any agent builder should be able to run `benchmark --harness inventory --model gpt-4o` and get a reproducible, comparable score — proving (or disproving) that their agent can actually help run a business.

---

## v1.1 Requirements

### Eval Engine (Multi-Judge Ensemble)

- [ ] **JUDG-01**: `callJudge()` fans out to all three judge models (Claude Sonnet, GPT-4o, Gemini 2.5 Pro) in parallel via `Promise.allSettled`; requires 2-of-3 responses to produce a score (1-of-3 failure is tolerated, run is not invalidated)
- [ ] **JUDG-02**: Aggregation uses simple equal-weight average per dimension — scientifically defensible without a human rating corpus; cancels self-preference bias across cross-family judge pairs
- [ ] **JUDG-03**: Scored result stores per-judge dimension scores alongside ensemble aggregate (disagreements visible and auditable in scored JSON)
- [ ] **JUDG-04**: Disagreement flag set when max spread across judge scores >= 2 on any dimension (signals ambiguous result)
- [ ] **JUDG-05**: `IndexEntry` gains `scoring_method` and `judges` fields; old v1.0 single-judge entries get `scoring_method: "single"` backfill so dashboard never compares single-judge and ensemble scores on the same axis

### Data

- [ ] **DATA-01**: Real vending machine CSV data replaces synthetic CSVs in all three harnesses
- [ ] **DATA-02**: Data anonymized before commit (location names and dollar amounts scrubbed, patterns preserved)

### Reference Runs

- [ ] **REF-06**: Reference runs use equivalent flagship models: `anthropic/claude-sonnet-4-6`, `openai/gpt-4o`, `google/gemini-2.5-pro` (verify Gemini model ID at implementation time — Google versioning is volatile)
- [ ] **REF-07**: Nine new reference results committed using real data + multi-judge ensemble scores

### Dashboard & Docs

- [ ] **DASH-06**: Dashboard displays judge ensemble badge per result (which models judged)
- [ ] **DASH-07**: Dashboard visually distinguishes v1.0 single-judge results from v1.1 ensemble results (prevents false score comparisons)
- [ ] **DOCS-06**: `docs/scoring.md` updated with multi-judge methodology, simple averaging rationale, and known remaining limitations (temperature non-determinism, Gemini model ID volatility)

---

## Future Requirements (v2+)

### Scoring

- **SCORE-01**: Risk awareness rubric dimension (4th dimension) — all reference runs re-scored
- **SCORE-02**: Multi-pass judge (same model, 3× per output, scores averaged) for higher reliability within a single judge
- **SCORE-03**: Cost-per-insight metric on dashboard: (composite score / cost USD) × 100

### Benchmark Expansion

- **EXPND-01**: Additional harness domains beyond vending (contributed via PR)
- **EXPND-02**: Community submission portal with verification gate
- **EXPND-03**: Automated re-run CI triggered by model version config bump

### Tooling

- **TOOL-01**: Local model inference support via OpenAI-compatible API (Ollama, vLLM)
- **TOOL-02**: Statistical significance testing on dimension score variance across runs

---

## Out of Scope (v1.1)

| Feature | Reason |
|---------|--------|
| Weighted judge aggregation | Requires human rating corpus to calibrate weights — not available |
| Self-preference exclusion per run | Simple average across 3 judges already cancels family bias; exclusion adds complexity without clear gain |
| Meta-judge adjudication | Over-engineering for 3 judges; disagreement flag is sufficient |
| Output excerpts on dashboard | Deferred to v2 |
| Community submissions | Prevents gaming; author-only control correct for v1 |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| JUDG-01 | TBD | Pending |
| JUDG-02 | TBD | Pending |
| JUDG-03 | TBD | Pending |
| JUDG-04 | TBD | Pending |
| JUDG-05 | TBD | Pending |
| DATA-01 | TBD | Pending |
| DATA-02 | TBD | Pending |
| REF-06 | TBD | Pending |
| REF-07 | TBD | Pending |
| DASH-06 | TBD | Pending |
| DASH-07 | TBD | Pending |
| DOCS-06 | TBD | Pending |

**Coverage:**
- v1.1 requirements: 12 total
- Mapped to phases: 0 (roadmap pending)
- Unmapped: 12

---
*Requirements defined: 2026-03-22*
