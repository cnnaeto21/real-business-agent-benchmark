# Roadmap: Real Business Agent Benchmark (RBAB)

## Overview

RBAB is built as a sequential pipeline: harness definitions lock the schema and rubric, the CLI runner validates those specs against a real provider, the eval engine adds scoring, reference runs produce the public baseline data, the dashboard makes results visible, and documentation ensures reproducibility. Each stage depends on the previous being stable — the ordering is architectural, not arbitrary. Granularity is set to coarse, but the strict dependency chain prevents compression without creating unverifiable monoliths.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Harness Definitions** - Lock the data packages, output schemas, rubric, and judge prompt before any code is written (completed 2026-03-15)
- [x] **Phase 2: CLI Runner** - Build the runner that loads a harness, calls an LLM provider, and writes raw output (completed 2026-03-16)
- [x] **Phase 3: Eval Engine** - Add JSON schema validation and LLM-as-judge scoring as a decoupled stage (completed 2026-03-17)
- [ ] **Phase 4: Reference Runs** - Extend to all three providers and generate the nine committed reference results
- [ ] **Phase 5: Dashboard** - Build and deploy the static Next.js results site against real result data
- [ ] **Phase 6: Documentation and Launch** - Write methodology docs, LIMITATIONS.md, and verify end-to-end reproducibility

## Phase Details

### Phase 1: Harness Definitions
**Goal**: Three complete harness packages exist with locked schemas, rubrics, and judge prompt — the foundation everything else builds on
**Depends on**: Nothing (first phase)
**Requirements**: HRNS-01, HRNS-02, HRNS-03, HRNS-04, HRNS-05, HRNS-06, HRNS-07, EVAL-02
**Success Criteria** (what must be TRUE):
  1. Three harness directories exist (inventory-optimization, pricing-strategy, financial-forecasting), each with a `harness.yaml`, anonymized CSV data files, a prompt template, a Zod output schema, and an eval rubric
  2. Each rubric has concrete score anchors per dimension ("Score 5 means X; Score 1 means Y") and an explicit anti-verbosity instruction
  3. Each harness has a semver version in `harness.yaml` and a designated judge model (Claude Sonnet, temperature 0)
  4. The judge prompt is authored and committed to `docs/judge-prompt.md`
  5. Running `z.toJSONSchema()` (Zod v4 native) on each harness schema.ts produces valid JSON Schema with no errors (note: zod-to-json-schema is EOL; use Zod v4 native API)
**Plans**: 5 plans

Plans:
- [ ] 01-01-PLAN.md — Project bootstrap: package.json (zod@^4.3.6), directory scaffold, validate-schemas.ts
- [ ] 01-02-PLAN.md — inventory-optimization harness: all 5 artifacts + 2 CSVs
- [ ] 01-03-PLAN.md — pricing-strategy harness: all 5 artifacts + 2 CSVs
- [ ] 01-04-PLAN.md — financial-forecasting harness: all 5 artifacts + 2 CSVs
- [ ] 01-05-PLAN.md — docs/judge-prompt.md + cross-harness schema validation

### Phase 2: CLI Runner
**Goal**: A working `benchmark` CLI that loads a harness, renders a prompt with real data, calls one LLM provider, and writes raw output to disk
**Depends on**: Phase 1
**Requirements**: RUN-01, RUN-02, RUN-03, RUN-04, RUN-05, RUN-06
**Success Criteria** (what must be TRUE):
  1. Running `benchmark --harness inventory-optimization --model anthropic/claude-sonnet-4-6` completes without error and writes a file to `results/<run-id>/raw/<model-slug>.json`
  2. The run manifest at `results/<run-id>/meta.json` contains: model id, provider API version, temperature, max_tokens, input tokens, output tokens, cost USD, latency ms
  3. The runner uses the provider's native structured output mechanism (Anthropic tool use for the Anthropic provider)
  4. The prompt rendered by the runner is deterministic — running the same harness twice produces identical prompt text
**Plans**: 4 plans

Plans:
- [ ] 02-01-PLAN.md — Bootstrap: npm deps, .gitignore, shared TypeScript contracts, Wave 0 test scripts
- [ ] 02-02-PLAN.md — Core modules: harness loader, cost table, output writer
- [ ] 02-03-PLAN.md — Provider adapters: Anthropic (tool use), OpenAI (zodResponseFormat), Google (responseMimeType)
- [ ] 02-04-PLAN.md — Wire: cli.ts orchestration, bin.ts entry point, end-to-end smoke test

### Phase 3: Eval Engine
**Goal**: A decoupled eval engine that scores any existing raw output directory without re-running the LLM — enabling rubric changes to be re-applied to old runs
**Depends on**: Phase 2
**Requirements**: EVAL-01, EVAL-03, EVAL-04, EVAL-05, EVAL-06, EVAL-07
**Success Criteria** (what must be TRUE):
  1. Running the eval engine against a `results/<run-id>/raw/` directory validates the raw output against the Zod schema and rejects malformed outputs at the first gate
  2. Valid outputs are scored by Claude Sonnet at temperature 0 on three dimensions (actionability, reasoning transparency, completeness), each returning a score 1-5 and a rationale
  3. The scored result is written to `results/<run-id>/scored/<model-slug>.json` with composite score (unweighted average, normalized 0-100)
  4. `results/index.json` is updated after each eval run and contains all results in a shape the dashboard can consume
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — Wave 0 test scaffold: scripts/test-eval.ts covering all EVAL requirements
- [ ] 03-02-PLAN.md — Core eval engine: src/eval.ts (validation, judge call, scoring, file writes)
- [ ] 03-03-PLAN.md — CLI integration: wire runEval into cli.ts, --skip-eval flag, inline score printing

### Phase 4: Reference Runs
**Goal**: Nine scored reference results committed to git — 3 harnesses times 3 models — providing the public baseline the dashboard will display
**Depends on**: Phase 3
**Requirements**: REF-01, REF-02, REF-03
**Success Criteria** (what must be TRUE):
  1. Nine files exist under `results/` (3 harnesses x Claude Sonnet, GPT-4o, Gemini 1.5 Pro), each with a full scored JSON and run manifest
  2. Every run manifest includes model name, model version, run date, harness version, temperature, token counts, and cost in USD
  3. `docs/judge-prompt.md` is committed and matches the judge prompt used for all nine reference runs
  4. `results/index.json` is fully populated and all nine entries are readable by the Next.js dashboard at build time
**Plans**: TBD

### Phase 5: Dashboard
**Goal**: A publicly accessible static dashboard on Vercel showing model comparison scores, per-dimension breakdowns, and run metadata — built against real reference data
**Depends on**: Phase 4
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05
**Success Criteria** (what must be TRUE):
  1. The dashboard URL is publicly accessible on Vercel and loads without errors
  2. A model comparison table shows all models across all harnesses with composite score, cost (USD), and latency (ms) — visible on page load without any interaction
  3. A per-dimension score breakdown (bar or radar chart) is visible for each model
  4. Each result entry shows run metadata: model name and version, run date, harness version, temperature
  5. Dashboard has a "Run it yourself" section with a copy-paste CLI command and link to docs/running.md — equally prominent as the published results table
**Plans**: TBD

### Phase 6: Documentation and Launch
**Goal**: The repo is self-contained and reproducible — a new person can clone it, follow the README, and run a benchmark with a single command; community credibility requirements are met
**Depends on**: Phase 5
**Requirements**: DOCS-01, DOCS-02, DOCS-03, DOCS-04, DOCS-05
**Success Criteria** (what must be TRUE):
  1. Following only the README from a clean clone, a user can run `npm install && benchmark --harness inventory-optimization --model anthropic/claude-sonnet-4-6` and get a scored result
  2. `LIMITATIONS.md` explicitly states: single-domain scope, no ground truth, single-pass judge, training data leakage risk
  3. `docs/harness-spec.md` documents the harness package format with enough detail that someone can author a new harness without asking for help
  4. `docs/scoring.md` explains the hybrid scoring system (JSON validation gate + LLM judge), rubric dimensions, and score anchors
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in strict dependency order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Harness Definitions | 5/5 | Complete    | 2026-03-15 |
| 2. CLI Runner | 4/4 | Complete   | 2026-03-16 |
| 3. Eval Engine | 3/3 | Complete   | 2026-03-17 |
| 4. Reference Runs | 0/? | Not started | - |
| 5. Dashboard | 0/? | Not started | - |
| 6. Documentation and Launch | 0/? | Not started | - |
