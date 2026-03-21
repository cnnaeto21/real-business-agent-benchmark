# Project Research Summary

**Project:** Real Business Agent Benchmark (RBAB)
**Domain:** Open-source LLM evaluation / agent benchmark (business task focus)
**Researched:** 2026-03-12
**Confidence:** MEDIUM-HIGH

## Executive Summary

RBAB is a pipeline-style benchmark suite, not a web application. Experts in this space build a thin runner that loads declarative harness specs, calls LLM provider APIs, scores outputs via a separate eval engine (LLM-as-judge), and persists results as flat JSON committed to git. The dashboard is a static read-only layer on top — not a backend. The key architectural insight is that run, eval, and publish are composable stages, not a monolith. This design lets contributors reproduce any historical run by checking out the repo and running a single CLI command.

The recommended approach is TypeScript throughout (runner, eval engine, dashboard), using Zod as the single source of truth for output schemas, with each provider's native structured-output mechanism. The eval engine scores each model's output independently against a rubric (never pairwise) using Claude Sonnet at temperature 0 as the fixed judge. Nine reference runs (3 harnesses x 3 models) provide the public baseline. Next.js on Vercel reads result JSON at build time, requiring no runtime backend.

The dominant risks are in benchmark credibility, not in engineering difficulty. A vague rubric collapses the entire scoring system because the LLM judge will produce arbitrary scores. Self-evaluation bias (judge = subject model) and verbosity bias (longer = better) are well-documented failure modes that must be designed out on Day 1 — they cannot be patched later without invalidating existing results. Engineering-wise the project is straightforward; credibility is the hard problem.

---

## Key Findings

### Recommended Stack

TypeScript is the correct choice for this project: the runner, eval engine, and dashboard all share schema types, and a single-language monorepo makes this tractable. The `tsx` executor removes the build step for the CLI. Zod schemas drive both TypeScript types and runtime validation, and `zod-to-json-schema` generates provider-compatible JSON Schema from the same definition — a single source of truth that prevents schema drift across three providers.

Do not adopt an existing eval framework (promptfoo, Braintrust, LangSmith, OpenAI evals). A ~300-line TypeScript runner gives full control over the LLM-as-judge chain and keeps all data in the repo. Flat JSON result files are the right storage choice for v1: they are git-diffable, require no setup to reproduce, and enable static Next.js builds on Vercel.

**Core technologies:**
- TypeScript ^5.4 + Node.js >=20 LTS: single language; native fetch; all LLM SDKs support it
- `@anthropic-ai/sdk` ^0.27, `openai` ^4.67, `@google/generative-ai` ^0.21: official SDKs with native structured output per provider
- `zod` ^3.23 + `zod-to-json-schema` ^3.23: one schema definition drives validation and provider JSON Schema
- `tsx` ^4.15: no build step for CLI runner
- `commander` ^12.1: minimal CLI arg parsing
- Next.js ^14.2 App Router + Tailwind ^3.4 + Recharts ^2.12: static dashboard, read-only at build time
- Vercel: zero-config hosting for static Next.js; deploy on git push

### Expected Features

The benchmark community has a clear bar for credibility. Missing any table-stakes item will cause dismissal, regardless of technical quality.

**Must have (table stakes):**
- Versioned harness format — results must be citable as "v1.0.0 of inventory harness"
- Deterministic prompt construction — same input data must produce identical prompts
- Structured output schema (JSON) — enables automated first-gate scoring
- Per-dimension scoring breakdown — composite score alone hides which capability failed
- Reproducible run record — every result includes model name+version, date, harness version, temperature, tokens
- Cost and latency reporting — AI builders evaluate cost-effectiveness, not just accuracy
- Public reference results — nine runs across three harnesses and three models is the minimum anchor
- CLI runner with single command — `benchmark --harness inventory --model gpt-4o`
- Transparent judge prompt published in repo — without this, results aren't auditable
- LIMITATIONS.md — community dismisses benchmarks that overclaim scope

**Should have (differentiators):**
- Hybrid scoring: JSON parse validation + LLM-as-judge qualitative scoring — no business benchmark combines both
- Business rubric dimensions (data grounding, actionability, reasoning transparency, completeness) — existing benchmarks lack these
- Real operational data, not synthetic — credibly grounded in actual P&L and sales velocity
- Domain coherence across harnesses — all three share one business, enabling cross-harness analysis
- Results show actual output excerpts side by side — makes the benchmark viscerally compelling
- "Fork this harness" affordance — clear structure and docs for adaptation

**Defer (v2+):**
- Risk awareness rubric dimension (5th dimension) — 4 is sufficient for launch
- Community submission portal — author-only control is correct for v1
- Multi-pass judge runs (3x averaging) — single-pass with documented limitation is fine
- Automated re-runs on model version bumps
- Multi-turn / conversational harnesses
- Local model inference support
- Statistical significance testing

### Architecture Approach

The system is a Unix-style pipeline: harness definition -> CLI runner -> LLM provider APIs -> raw output -> eval engine -> LLM-as-judge -> scored result JSON -> dashboard (read-only, static). Each stage is decoupled — the eval engine can re-score old runs if the rubric changes, without touching the runner. Results are stored as flat JSON in `results/` committed to git; the dashboard reads `results/index.json` at Next.js build time, requiring no Vercel backend.

The monorepo uses npm workspaces (not Turborepo) with three packages: `runner`, `eval`, and `dashboard`. Shared TypeScript types live in `runner/src`. A `harness.yaml` spec per harness drives the entire pipeline declaratively: data files, prompt template, output schema path, eval rubric path, judge model, and provider list.

**Major components:**
1. **Harness Definition** (`harnesses/<name>/`) — declarative spec with data files, prompt template, output schema, eval rubric, and provider list
2. **CLI Runner** (`runner/src/`) — loads harness, renders prompt, calls provider APIs, writes raw output to `results/<run-id>/raw/`
3. **Eval Engine** (`eval/src/`) — JSON schema validation (first gate) + LLM-as-judge rubric scoring; writes scored JSON to `results/<run-id>/scored/`
4. **Result Store** (`results/`) — flat JSON files committed to git; `index.json` is the dashboard's read model
5. **Dashboard** (`dashboard/`) — Next.js static site; reads result store at build time; deployed to Vercel on git push

### Critical Pitfalls

1. **Vague rubric with no calibration examples** — Define each rubric dimension with concrete score anchors ("Score 5 means recommendation cites ≥3 specific data points with exact values"). Lock this on Day 1 before writing any code. Vague rubric makes the judge produce arbitrary scores; all downstream results are invalid.

2. **LLM judge scoring the model that generated the output (self-evaluation bias)** — Fix a single external judge model in `harness.yaml` and never evaluate a model using itself. Use Claude Sonnet as judge for all runs at temperature 0.

3. **LLM verbosity bias (longer output = higher score)** — Add an explicit anti-verbosity instruction to `eval-rubric.md`: "Do not score higher simply because the response is longer." Include on Day 1.

4. **Benchmark data leakage** — Document data provenance and collection date in LIMITATIONS.md. For v1 the risk is low (obscure vending data), but proactively acknowledge it.

5. **Hard-to-reproduce open-source repo** — Day 7 is dedicated to reproducing from scratch following the README. Every required env variable must be documented. Data files committed to repo. `npm install && npm run benchmark -- --harness inventory --model anthropic/claude-sonnet-4-6` must work after README setup.

---

## Implications for Roadmap

The architecture's critical path is sequential: data/spec -> runner -> eval engine -> reference runs -> dashboard. Each stage depends on the previous one being stable. Building the dashboard against mocks will cause shape mismatches when real data arrives. Building the eval engine before the runner validates the harness spec will require rework. The research strongly recommends following this order.

### Phase 1: Harness Definitions and Data

**Rationale:** Everything downstream depends on the harness schema and data shape. Ambiguity here cascades into all other phases. The rubric must also be locked here — changing it after reference runs invalidates those runs.
**Delivers:** Three complete harness packages (inventory-optimization, pricing-strategy, financial-forecasting), each with anonymized CSV data, system prompt, output schema (Zod + JSON Schema), and a rubric with score anchors and anti-verbosity instruction.
**Addresses:** Versioned harness format, deterministic prompt construction, structured output schema, transparent judge prompt, anonymized data release.
**Avoids:** Vague rubric pitfall, verbosity bias pitfall, leading prompts pitfall, business jargon pitfall.
**Research flag:** NEEDS research — rubric dimension definitions and output schema design for each business domain are high-stakes decisions with no undo.

### Phase 2: CLI Runner (Single Provider)

**Rationale:** Validates that harness specs are well-formed before the eval engine is built on top of them. A single-provider pass (Anthropic first) surfaces prompt rendering issues cheaply.
**Delivers:** Working `benchmark` CLI that loads a harness, renders the prompt, calls one LLM provider, and writes raw output to `results/<run-id>/raw/`.
**Uses:** TypeScript, `tsx`, `commander`, `@anthropic-ai/sdk`, Zod harness loader.
**Implements:** CLI Runner and Harness Definition components.
**Avoids:** Non-determinism pitfall (fix temperature logging here), monolithic CLI anti-pattern (keep run/eval/publish as separate stages from the start).
**Research flag:** Standard patterns — well-documented CLI + SDK integration, skip research-phase.

### Phase 3: Eval Engine

**Rationale:** Decoupled from the runner so rubric changes can re-score existing raw outputs without re-running the LLM. Must be built before multi-provider runs to ensure scoring is stable.
**Delivers:** Eval engine that runs JSON schema validation (first gate) and LLM-as-judge rubric scoring (four dimensions), writing scored JSON to `results/<run-id>/scored/`.
**Uses:** Zod `safeParse`, `zod-to-json-schema`, `@anthropic-ai/sdk` (judge calls at temperature 0).
**Implements:** Eval Engine component; establishes `results/index.json` shape.
**Avoids:** Positional bias pitfall (score each model independently, never pairwise), overly strict schema pitfall (use `additionalProperties: true`), self-evaluation bias (judge is never the subject model).
**Research flag:** Standard patterns for the JSON validation layer; LLM-as-judge prompt engineering may benefit from a targeted research pass.

### Phase 4: Multi-Provider Reference Runs

**Rationale:** The dashboard needs real data from all three providers before UI work begins. Building the dashboard against mocks risks shape mismatches. All nine reference runs (3 harnesses x 3 models) should be generated and committed to git in this phase.
**Delivers:** Nine scored result files committed to `results/`, run manifests with model version and temperature, `results/index.json` fully populated.
**Uses:** `openai` SDK, `@google/generative-ai` SDK, provider-specific structured output configuration.
**Implements:** Multi-provider extension of the CLI Runner.
**Avoids:** Model versioning staleness pitfall (capture API version in run manifest), non-determinism pitfall (log temperature per run).
**Research flag:** Standard patterns — SDK integration is well-documented. May need to verify exact structured output API signatures for GPT-4o and Gemini at implementation time.

### Phase 5: Dashboard

**Rationale:** Build against real result data to avoid shape mismatches. The dashboard is purely read-only static; no backend complexity.
**Delivers:** Next.js static dashboard deployed to Vercel showing model comparison table (scores, cost, latency), per-dimension breakdown, per-model output excerpts, and run metadata.
**Uses:** Next.js ^14.2 App Router, Tailwind CSS, Recharts radar charts, `results/index.json` read at build time.
**Implements:** Dashboard component.
**Avoids:** Cherry-picking pitfall (show all dimensions, not just composite score; show where models fail).
**Research flag:** Standard patterns — Next.js static data loading is well-documented.

### Phase 6: Documentation and Launch Prep

**Rationale:** Benchmark credibility lives in the documentation. Missing LIMITATIONS.md, a methodology section in the README, or undocumented env variables will cause community dismissal regardless of technical quality.
**Delivers:** README with methodology, `docs/harness-spec.md`, `docs/running.md`, `docs/scoring.md`, LIMITATIONS.md, cost-per-insight metric added to dashboard. Full reproduction test from a clean checkout.
**Avoids:** Hard-to-reproduce repo pitfall (Day 7 scratch reproduction test), unrepresentative scenarios pitfall (frame single-domain scope honestly in LIMITATIONS.md), benchmark data leakage pitfall (document provenance).
**Research flag:** Standard patterns — skip research-phase.

### Phase Ordering Rationale

- Phases 1-3 form a strict dependency chain: spec -> runner -> eval. No phase can begin until the previous is stable.
- Phase 4 (reference runs) must precede Phase 5 (dashboard) to avoid building UI against mocks that won't match real output shapes.
- Phase 6 (documentation) is last because LIMITATIONS.md accurately describes what was actually built, not what was planned.
- The rubric design in Phase 1 is the only decision that is catastrophically expensive to change later — changing it invalidates all scored results. All other decisions are cheap to revise.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Rubric dimension definitions and calibration examples are novel (no established standard for business task benchmarks); output schema design for each harness domain involves domain-specific judgment. Recommend a focused research pass before implementation.
- **Phase 3:** LLM-as-judge prompt engineering may benefit from reviewing MT-Bench and AlpacaEval judge prompt designs before writing the eval rubric.

Phases with standard patterns (skip research-phase):
- **Phase 2:** CLI + Anthropic SDK integration is well-documented.
- **Phase 4:** Provider SDK structured output configurations are well-documented; verify specific API versions at implementation time.
- **Phase 5:** Next.js static data loading and Recharts integration are well-documented.
- **Phase 6:** README/docs authoring — no research needed.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Official SDK versions are from training data (Aug 2025); verify with `npm info` before install. Core technology choices (TypeScript, Next.js, Zod) are stable and high-confidence. |
| Features | HIGH | Business benchmark community expectations are well-documented via HELM, MT-Bench, AlpacaEval, SWE-bench precedents. Table stakes list is reliable. |
| Architecture | HIGH | Pipeline architecture is the established pattern for eval systems. Flat JSON + static dashboard is well-validated for open-source benchmarks. No novel architectural risk. |
| Pitfalls | HIGH | Self-evaluation bias, positional bias, and verbosity bias are published research findings with citations. Mitigation strategies are standard practice. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Exact SDK versions at install time:** All SDK version numbers are from training data through August 2025. Run `npm info` version checks before `npm install` to catch any major version changes.
- **Provider structured output API stability:** OpenAI `response_format: { type: "json_schema", strict: true }` and Gemini `responseMimeType` configurations should be verified against current API docs before Phase 4 implementation. These APIs evolved rapidly in 2024-2025.
- **Harness output schema design per domain:** The research defines the schema structure (Zod + JSON Schema) but not the domain-specific fields for pricing strategy and financial forecasting harnesses. These require business domain judgment and should be resolved in Phase 1 planning.
- **Judge prompt calibration:** The anti-verbosity and anti-positional-bias instructions are specified at the principle level; the actual judge prompt text needs to be authored and tested in Phase 3.

---

## Sources

### Primary (HIGH confidence)
- MT-Bench paper (Zheng et al., 2023) — positional bias in LLM judges; pairwise comparison failure modes
- AlpacaEval research — verbosity/length bias in LLM-as-judge evaluations
- HELM benchmark (Stanford) — per-dimension scoring standards for LLM evaluation
- Official Anthropic SDK docs — tool use for structured output
- Official OpenAI API docs — `response_format: { type: "json_schema" }` structured output
- Official Google Generative AI SDK docs — `responseMimeType: "application/json"` structured output

### Secondary (MEDIUM confidence)
- SWE-bench, HumanEval — established patterns for benchmark reproducibility requirements and community credibility expectations
- Next.js App Router docs — static data loading patterns (`getStaticProps` / RSC at build time)
- Vercel deployment docs — static Next.js deploy on git push

### Tertiary (LOW confidence)
- SDK version numbers (`@anthropic-ai/sdk` ^0.27, `openai` ^4.67, `@google/generative-ai` ^0.21, `next` ^14.2) — from training data through Aug 2025; verify before install

---
*Research completed: 2026-03-12*
*Ready for roadmap: yes*
