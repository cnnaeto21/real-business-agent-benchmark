# Roadmap: Real Business Agent Benchmark (RBAB)

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-03-21)
- ⬜ **v1.1 Integrity** — Phases 7-10 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-03-21</summary>

- [x] Phase 1: Harness Definitions (5/5 plans) — completed 2026-03-15
- [x] Phase 2: CLI Runner (4/4 plans) — completed 2026-03-16
- [x] Phase 3: Eval Engine (4/4 plans) — completed 2026-03-17
- [x] Phase 4: Reference Runs (2/2 plans) — completed 2026-03-18
- [x] Phase 5: Dashboard (2/2 plans) — completed 2026-03-21
- [x] Phase 6: Documentation and Launch (2/2 plans) — completed 2026-03-21

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

**v1.1 Integrity (Phases 7-10)**

- [ ] **Phase 7: Real Data Ingestion** - User provides real vending CSVs; AI anonymizes and validates; committed data replaces synthetic fixtures
- [ ] **Phase 8: Multi-Judge Eval Engine** - Eval pipeline fans out to 3-model ensemble with averaging, disagreement flagging, and backward-compatible index schema
- [ ] **Phase 9: Reference Runs** - Nine new benchmark results produced using real data and ensemble scoring across equivalent flagship models
- [ ] **Phase 10: Dashboard and Docs** - Dashboard distinguishes v1.0 vs v1.1 results with ensemble badge; scoring methodology documented

## Phase Details

### Phase 7: Real Data Ingestion
**Goal**: Real vending machine CSV data is loaded into all three harnesses, anonymized, and committed — replacing synthetic fixtures
**Depends on**: Nothing (can start immediately; human gate required)
**Requirements**: DATA-01, DATA-02
**Success Criteria** (what must be TRUE):
  1. Each of the three harnesses (inventory, pricing, forecasting) loads from a real CSV file, not a synthetic fixture
  2. No location names or dollar amounts appear in any committed harness data file
  3. Statistical patterns in the real data (velocity, margins, seasonality) are preserved after anonymization
  4. The benchmark CLI runs end-to-end against all three harnesses with the new data without errors
**Plans**: TBD

### Phase 8: Multi-Judge Eval Engine
**Goal**: The eval pipeline fans out to Claude, GPT-4o, and Gemini as co-judges, averages their scores, flags disagreements, and stores per-judge detail — while remaining backward-compatible with v1.0 index entries
**Depends on**: Phase 7 (real data needed to validate ensemble on non-synthetic inputs)
**Requirements**: JUDG-01, JUDG-02, JUDG-03, JUDG-04, JUDG-05
**Success Criteria** (what must be TRUE):
  1. Running `benchmark --harness inventory --model anthropic/claude-sonnet-4-6` produces a scored result containing per-judge scores from all three providers alongside an ensemble aggregate
  2. If one of the three judge API calls fails, the run still completes with a 2-of-3 quorum and is not invalidated
  3. A scored result where any dimension has a max-min spread >= 2 across judges carries a visible disagreement flag in the output JSON
  4. The v1.0 reference run entries in index.json display a `scoring_method: "single"` field; new ensemble entries display `scoring_method: "ensemble"` with a `judges` array — the two groups are never compared on the same axis
  5. A judge is automatically excluded from the ensemble when evaluating output from its own model family (self-preference exclusion)
**Plans**: TBD

### Phase 9: Reference Runs
**Goal**: Nine new benchmark results exist using real vending data and ensemble scoring, covering the equivalent flagship models at each provider
**Depends on**: Phase 7 (real data), Phase 8 (ensemble engine must be complete and validated)
**Requirements**: REF-06, REF-07
**Success Criteria** (what must be TRUE):
  1. Benchmark results exist for all nine combinations: 3 harnesses × (`anthropic/claude-sonnet-4-6`, `openai/gpt-4o`, `google/gemini-2.5-pro`)
  2. Every new result has `scoring_method: "ensemble"` in index.json and was produced with real harness data
  3. All nine results are committed to the repository and visible in the dashboard
**Plans**: TBD

### Phase 10: Dashboard and Docs
**Goal**: The dashboard visually distinguishes v1.0 single-judge results from v1.1 ensemble results, shows which judges contributed, and scoring.md explains the methodology
**Depends on**: Phase 9 (results must exist to display and validate badges)
**Requirements**: DASH-06, DASH-07, DOCS-06
**Success Criteria** (what must be TRUE):
  1. Each result row or card on the dashboard shows a judge ensemble badge listing which models judged it (e.g., "Claude + GPT-4o + Gemini")
  2. v1.0 single-judge results are visually distinct from v1.1 ensemble results — a user cannot accidentally compare the two generations as equivalent
  3. `docs/scoring.md` contains a section on multi-judge methodology explaining: why simple averaging was chosen, how self-preference exclusion works, and the known limitations (temperature non-determinism, Gemini model ID volatility)
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Harness Definitions | v1.0 | 5/5 | Complete | 2026-03-15 |
| 2. CLI Runner | v1.0 | 4/4 | Complete | 2026-03-16 |
| 3. Eval Engine | v1.0 | 4/4 | Complete | 2026-03-17 |
| 4. Reference Runs | v1.0 | 2/2 | Complete | 2026-03-18 |
| 5. Dashboard | v1.0 | 2/2 | Complete | 2026-03-21 |
| 6. Documentation and Launch | v1.0 | 2/2 | Complete | 2026-03-21 |
| 7. Real Data Ingestion | v1.1 | 0/? | Not started | - |
| 8. Multi-Judge Eval Engine | v1.1 | 0/? | Not started | - |
| 9. Reference Runs | v1.1 | 0/? | Not started | - |
| 10. Dashboard and Docs | v1.1 | 0/? | Not started | - |
