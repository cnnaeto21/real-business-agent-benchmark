# Requirements: Real Business Agent Benchmark (RBAB)

**Defined:** 2026-03-12
**Core Value:** Any agent builder should be able to run `benchmark --harness inventory --model gpt-4o` and get a reproducible, comparable score — proving (or disproving) that their agent can actually help run a business.

---

## v1 Requirements

### Harness Definitions

- [x] **HRNS-01**: Three harness packages exist: inventory-optimization, pricing-strategy, financial-forecasting
- [x] **HRNS-02**: Each harness has a `harness.yaml` declarative spec (data files, prompt template, schema path, rubric path, judge model, provider list)
- [x] **HRNS-03**: Each harness includes anonymized CSV data with location names and dollar amounts scrubbed
- [x] **HRNS-04**: Each harness has a structured output schema defined in Zod (generates TypeScript types and JSON Schema from single source)
- [x] **HRNS-05**: Each harness has an eval rubric with concrete score anchors per dimension ("Score 5 means X; Score 1 means Y")
- [x] **HRNS-06**: Rubric includes explicit anti-verbosity instruction ("Do not score higher simply because the response is longer")
- [x] **HRNS-07**: Each harness is versioned (semver in harness.yaml)

### CLI Runner

- [x] **RUN-01**: User can execute `benchmark --harness <name> --model <provider/model-id>` as a single command
- [x] **RUN-02**: Runner loads harness spec, injects CSV data into prompt template, and calls the specified LLM provider
- [x] **RUN-03**: Runner supports three providers: Anthropic (`anthropic/`), OpenAI (`openai/`), Google (`google/`)
- [ ] **RUN-04**: Runner uses each provider's native structured output mechanism (Anthropic tool use, OpenAI json_schema mode, Gemini responseMimeType)
- [ ] **RUN-05**: Runner writes raw output to `results/<run-id>/raw/<model-slug>.json`
- [x] **RUN-06**: Runner writes run manifest to `results/<run-id>/meta.json` including: model id, provider API version, temperature, max_tokens, input tokens, output tokens, cost USD, latency ms

### Eval Engine

- [ ] **EVAL-01**: Eval engine validates raw output against the harness output schema (Zod safeParse) — first scoring gate
- [x] **EVAL-02**: Eval engine calls Claude Sonnet (temperature 0) as the fixed LLM judge for all runs regardless of subject model
- [ ] **EVAL-03**: Judge scores on 3 dimensions: actionability, reasoning transparency, completeness (each 1-5)
- [ ] **EVAL-04**: Judge returns structured JSON with score + rationale per dimension
- [ ] **EVAL-05**: Eval engine computes composite score (unweighted average of dimension scores, normalized 0-100)
- [ ] **EVAL-06**: Eval engine writes scored result to `results/<run-id>/scored/<model-slug>.json`
- [ ] **EVAL-07**: Eval engine updates `results/index.json` after each run

### Reference Results

- [ ] **REF-01**: Nine reference runs exist and are committed to git: 3 harnesses × 3 models (Claude Sonnet, GPT-4o, Gemini 1.5 Pro)
- [ ] **REF-02**: All reference runs include full run manifest (model version, date, temperature, tokens, cost)
- [ ] **REF-03**: Judge prompt used for all reference runs is published in the repo at `docs/judge-prompt.md`

### Results Dashboard

- [ ] **DASH-01**: Dashboard is deployed and publicly accessible on Vercel
- [ ] **DASH-02**: Dashboard shows model comparison table: all models × all harnesses with composite score, cost (USD), latency (ms)
- [ ] **DASH-03**: Dashboard shows per-dimension score breakdown for each model (bar or radar chart)
- [ ] **DASH-04**: Dashboard shows run metadata per result: model name+version, run date, harness version, temperature
- [ ] **DASH-05**: Dashboard has a "Run it yourself" section with copy-paste CLI command and link to `docs/running.md` — equally prominent as the published results

### Documentation

- [ ] **DOCS-01**: README explains methodology: what RBAB measures, how scoring works, known limitations
- [ ] **DOCS-02**: `docs/harness-spec.md` documents the harness package format so others can fork and adapt
- [ ] **DOCS-03**: `docs/running.md` documents how to run a benchmark locally (env vars, install, single command)
- [ ] **DOCS-04**: `docs/scoring.md` documents the hybrid scoring system (JSON validation + LLM judge) and rubric dimensions
- [ ] **DOCS-05**: `LIMITATIONS.md` explicitly states: single-domain scope, no ground truth, single-pass judge, training data leakage risk

---

## v2 Requirements

### Scoring

- **SCORE-01**: Risk awareness rubric dimension (4th dimension) added and all reference runs re-scored
- **SCORE-02**: Multi-pass judge runs (3x per output, scores averaged) for higher result reliability
- **SCORE-03**: Cost-per-insight metric displayed on dashboard: (composite score / cost USD) × 100

### Benchmark Expansion

- **EXPND-01**: Additional harness domains beyond vending machine (contributed via PR)
- **EXPND-02**: Community submission portal with verification gate (prevents leaderboard gaming)
- **EXPND-03**: Automated re-run CI triggered by model version config bump

### Tooling

- **TOOL-01**: Local model inference support via OpenAI-compatible API endpoint (Ollama, vLLM)
- **TOOL-02**: Statistical significance testing on dimension score variance across runs

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Location analysis harness | Deferred to v2; 3 precise harnesses ship cleaner |
| Community submissions in v1 | Prevents leaderboard gaming; author-only control is correct for v1 |
| Data grounding as rubric dimension | 3 dimensions (actionability, reasoning transparency, completeness) are sufficient for v1 launch |
| Output excerpts on dashboard | Deferred to v2; model comparison table + scores covers the core value |
| Ground truth / correct answers | Open-ended business decisions have no single correct answer; LLM judge is the methodology |
| Multi-turn conversational harnesses | Single-turn + structured output keeps scoring reproducible; multi-turn is v2+ |
| Non-vending business domains in v1 | Single domain keeps data quality high and story coherent |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| HRNS-01 | Phase 1 | Complete |
| HRNS-02 | Phase 1 | Complete |
| HRNS-03 | Phase 1 | Complete |
| HRNS-04 | Phase 1 | Complete |
| HRNS-05 | Phase 1 | Complete |
| HRNS-06 | Phase 1 | Complete |
| HRNS-07 | Phase 1 | Complete |
| EVAL-02 | Phase 1 | Complete |
| RUN-01 | Phase 2 | Complete |
| RUN-02 | Phase 2 | Complete |
| RUN-03 | Phase 2 | Complete |
| RUN-04 | Phase 2 | Pending |
| RUN-05 | Phase 2 | Pending |
| RUN-06 | Phase 2 | Complete |
| EVAL-01 | Phase 3 | Pending |
| EVAL-03 | Phase 3 | Pending |
| EVAL-04 | Phase 3 | Pending |
| EVAL-05 | Phase 3 | Pending |
| EVAL-06 | Phase 3 | Pending |
| EVAL-07 | Phase 3 | Pending |
| REF-01 | Phase 4 | Pending |
| REF-02 | Phase 4 | Pending |
| REF-03 | Phase 4 | Pending |
| DASH-01 | Phase 5 | Pending |
| DASH-02 | Phase 5 | Pending |
| DASH-03 | Phase 5 | Pending |
| DASH-04 | Phase 5 | Pending |
| DASH-05 | Phase 5 | Pending |
| DOCS-01 | Phase 6 | Pending |
| DOCS-02 | Phase 6 | Pending |
| DOCS-03 | Phase 6 | Pending |
| DOCS-04 | Phase 6 | Pending |
| DOCS-05 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 33 total
- Mapped to phases: 33
- Unmapped: 0

Note: EVAL-02 (judge prompt design) is assigned to Phase 1, not Phase 3. The judge prompt is a harness artifact that must be locked before the eval engine is built. EVAL-01 and EVAL-03 through EVAL-07 are assigned to Phase 3.

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-12 — traceability expanded to individual requirement rows; corrected count from 28 to 32; EVAL-02 explicitly assigned to Phase 1*
