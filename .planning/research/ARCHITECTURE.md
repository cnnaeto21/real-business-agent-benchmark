# Architecture Patterns: AI Agent Benchmark Suite

**Domain:** Open-source LLM evaluation / agent benchmark
**Researched:** 2026-03-12

---

## Recommended Architecture

The system is a **pipeline**, not a web app with a database. Think of it as a Unix pipeline with a thin persistence layer and a read-only dashboard on top.

```
Harness Definition (YAML + CSV/JSON data)
       |
       v
  CLI Runner  ──calls──>  LLM Provider APIs (Anthropic / OpenAI / Gemini)
       |
       v
  Raw Output (JSON)
       |
       v
  Eval Engine  ──calls──>  LLM-as-Judge API
       |
       v
  Scored Result (JSON)
       |
       v
  Result Store (flat JSON files, committed to git)
       |
       v
  Dashboard (Next.js reads result store at build time)
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Harness Definition** | Declarative spec: data, prompt template, output schema, eval rubric | CLI Runner reads it |
| **CLI Runner** | Orchestrates run: loads harness, calls LLM, writes raw output | Harness, LLM APIs, Eval Engine, Result Store |
| **Eval Engine** | Scores outputs: JSON validation + LLM-as-judge rubric scoring | Raw output, Judge LLM, Result Store |
| **Result Store** | Persists scored results in diffable format | CLI Runner writes, Dashboard reads |
| **Dashboard** | Visualises scores across runs/models in a browser | Result Store (read-only) |

---

## Data Flow (One Harness Run)

```
1. USER: benchmark --harness inventory --model anthropic/claude-sonnet-4-6

2. CLI RUNNER
   a. Loads harness definition from harnesses/inventory/harness.yaml
   b. Reads data: harnesses/inventory/data/*.csv
   c. Renders prompt template with data injected
   d. Calls LLM provider API
   e. Writes raw response to: results/<run-id>/raw/<model-slug>.json

3. EVAL ENGINE
   a. JSON schema validation → structure_score (0-1 per required field)
   b. LLM-as-judge call → dimension scores (1-5 each) + rationales
   c. Writes: results/<run-id>/scored/<model-slug>.json

4. RESULT STORE
   results/<run-id>/meta.json           (timestamp, harness, model, versions)
   results/<run-id>/raw/<model>.json    (verbatim LLM output)
   results/<run-id>/scored/<model>.json (scores + reasoning)
   results/index.json                   (all run metadata — updated after each run)

5. DASHBOARD
   Next.js reads results/index.json at build time (getStaticProps)
   Score tables, model diffs, per-model breakdown
   Vercel: rebuild triggered by git push (results committed to repo)
```

---

## Why Flat JSON Over a Database (for v1)

- Git-committable — every result run is auditable and diffable
- No database setup required for contributors who reproduce runs
- Next.js reads them at build time → zero backend on Vercel
- When to switch (v2): when community submissions are accepted

---

## File/Folder Structure

```
agentHarness/
├── harnesses/
│   ├── inventory-optimization/
│   │   ├── harness.yaml
│   │   ├── system-prompt.md
│   │   ├── output-schema.json
│   │   ├── eval-rubric.md
│   │   └── data/
│   │       ├── inventory.csv
│   │       └── sales.csv
│   ├── pricing-strategy/
│   │   └── ...
│   └── financial-forecasting/
│       └── ...
│
├── runner/
│   └── src/
│       ├── cli.ts
│       ├── harness-loader.ts
│       ├── prompt-renderer.ts
│       ├── providers/
│       │   ├── anthropic.ts
│       │   ├── openai.ts
│       │   └── google.ts
│       └── run-manager.ts
│
├── eval/
│   └── src/
│       ├── schema-validator.ts
│       ├── judge.ts
│       └── scorer.ts
│
├── results/
│   ├── index.json
│   └── <run-id>/
│       ├── meta.json
│       ├── raw/<model-slug>.json
│       └── scored/<model-slug>.json
│
├── dashboard/
│   ├── app/
│   │   ├── page.tsx              (overview: all harnesses × all models)
│   │   ├── harness/[name]/page.tsx
│   │   └── run/[id]/page.tsx
│   └── lib/results.ts
│
├── scripts/
│   ├── anonymize-data.ts
│   └── publish-results.ts
│
├── docs/
│   ├── harness-spec.md
│   ├── running.md
│   └── scoring.md
│
├── package.json                  (npm workspaces root)
└── README.md
```

---

## harness.yaml Schema

```yaml
name: inventory-optimization
version: 1.0.0
description: "Given current inventory levels and sales velocity, recommend restocking actions"

data:
  - file: data/inventory.csv
    inject_as: inventory_table
  - file: data/sales.csv
    inject_as: sales_table

prompt:
  system: system-prompt.md
  user: |
    Here is the current inventory:
    {{inventory_table}}

    Here is recent sales velocity:
    {{sales_table}}

output_schema: output-schema.json

eval:
  rubric: eval-rubric.md
  judge_model: anthropic/claude-sonnet-4-6
  judge_temperature: 0

providers:
  - anthropic/claude-sonnet-4-6
  - openai/gpt-4o
  - google/gemini-1.5-pro
```

---

## Monorepo Decision

**npm workspaces (not turborepo for v1)**

- `runner` and `eval` share TypeScript types — must be in same repo
- `dashboard` reads same `results/` directory — colocation is simpler
- Contributors clone one repo and run everything
- Turborepo adds unnecessary complexity for a single developer

---

## 7-Day Build Order (Critical Path)

| Day | Focus | Why This Order |
|-----|-------|----------------|
| 1 | Harness data + spec | Everything downstream depends on the schema; fuzziness here cascades |
| 2 | CLI Runner (single provider) | Validates specs are well-formed before eval is built on top |
| 3 | Eval Engine | Decoupled from runner — can re-score old runs if rubric changes |
| 4 | Multi-provider + reference runs | Dashboard needs real data; run before building UI to avoid shape mismatches |
| 5 | Dashboard skeleton | Build against real data, not mocks |
| 6 | Dashboard polish + README | Presentable for HN |
| 7 | Buffer + launch prep | Reproduce from scratch following README; catch friction; write HN post |

---

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Instead |
|--------------|---------|---------|
| Database for v1 results | Breaks "clone and run"; results not diffable | Flat JSON in `results/` committed to git |
| Monolithic CLI (run + eval + publish in one function) | Untestable, can't re-score old runs | Run, Eval, Publish as composable stages |
| Baking data into harness.yaml | YAML becomes huge; data updates require editing spec | Data files in `data/` directory |
| Same model as judge and subject | Self-serving scores | Fix judge model in harness.yaml |
| Dynamic results from Vercel API routes | Vercel filesystem not writable at runtime | Static JSON; publish script before deploy |
