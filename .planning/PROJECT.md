# Real Business Agent Benchmark (RBAB)

## What This Is

An open-source benchmark suite that tests AI agents on real business operations — not synthetic coding tasks. Inspired by Bret Taylor's "CSS Zen Garden for agent harnesses" concept, RBAB packages real vending machine business data into standardized harnesses that any model can be run against in one shot, producing comparable metrics across agents. v1.0 ships 3 harnesses (inventory optimization, pricing strategy, financial forecasting), a CLI runner supporting Anthropic/OpenAI/Google, LLM-as-judge eval pipeline, 9 reference runs, and a live Vercel results dashboard.

## Core Value

Any agent builder or operator should be able to run `benchmark --harness inventory --model gpt-4o` and get a reproducible, comparable score — proving (or disproving) that their agent can actually help run a business.

## Requirements

### Validated

- ✓ 3 benchmark harnesses built from real vending machine data (inventory optimization, pricing strategy, financial forecasting) — v1.0
- ✓ Each harness: data package + prompt template + Zod structured output schema + eval rubric — v1.0
- ✓ Hybrid evaluation: Zod schema validation gate + LLM-as-judge for reasoning quality — v1.0
- ✓ CLI runner: `benchmark --harness <name> --model <provider/model>` executes a harness end-to-end — v1.0
- ✓ Reference runs published for Claude Sonnet, GPT-4o, Gemini 1.5 Pro (9 total, 3 harnesses × 3 models) — v1.0
- ✓ Live results dashboard (Next.js + Vercel) showing scores across models with per-dimension breakdown — v1.0
- ✓ GitHub repo with full harness data, runner code, and documentation — v1.0
- ✓ Data anonymized (location names and dollar amounts scrubbed, patterns preserved) — v1.0

### Active

- [ ] SCORE-01: Risk awareness rubric dimension (4th dimension) — all reference runs re-scored
- [ ] SCORE-02: Multi-pass judge (3× per output, scores averaged) for higher reliability
- [ ] SCORE-03: Cost-per-insight metric on dashboard: (composite score / cost USD) × 100
- [ ] EXPND-01: Additional harness domains beyond vending (contributed via PR)
- [ ] EXPND-02: Community submission portal with verification gate
- [ ] EXPND-03: Automated re-run CI triggered by model version config bump
- [ ] TOOL-01: Local model inference support via OpenAI-compatible API (Ollama, vLLM)
- [ ] TOOL-02: Statistical significance testing on dimension score variance across runs

### Out of Scope

- Location analysis harness — deferred to v2; 3 precise harnesses ship cleaner than 4
- Real-time leaderboard with community submissions in v1 — author-run only prevents gaming
- Non-vending business domains in v1 — single domain keeps data quality high; others can fork
- Multi-turn/conversational harness format — single prompt + structured output keeps scoring reproducible
- Ground truth / correct answers — open-ended business decisions have no single correct answer; LLM judge is the methodology

## Context

**Shipped v1.0 with ~2,560 LOC TypeScript.**
Tech stack: Node.js CLI (tsx), Zod v4, Anthropic/OpenAI/Google SDKs, Next.js, Vercel.

- **Inspiration**: Bret Taylor's LinkedIn post proposing standardized agent harnesses ("kind of a CSS Zen Garden") — RBAB applies this to business operations.
- **Data source**: Owner's real vending machine operation — actual P&L, sales velocity, inventory logs, location performance data. Cleaned and anonymized for public release.
- **Evaluation gap filled**: No existing benchmark captures qualitative reasoning quality for business decisions. SWE-bench, HumanEval etc. are all code. RBAB fills this gap.
- **Target audience**: AI builders evaluating which agent to deploy for business automation; agent companies wanting real-world eval evidence; operators considering AI tools.
- **Distribution**: Show HN + direct outreach to agent companies.
- **Known issues**: EVAL-02 judge_temperature hardcoded; HRNS-02 description field silently ignored; some dashboard metadata display gaps (accepted as tech debt for v2).

## Constraints

- **Tech stack**: Node.js/TypeScript for CLI, Next.js + Vercel for dashboard
- **Data privacy**: Business data fine to publish after anonymization (location names + $ amounts scrubbed)
- **Evaluation**: No ground truth — quality judged by reasoning depth and actionability
- **Scoring**: Hybrid — Zod structured output validation + LLM judge for qualitative reasoning

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 3 harnesses from single domain (vending) | Precision over breadth; better data quality + coherent story; more harnesses are v2 | ✓ Good — shipped cleanly, story coherent |
| Structured output schema (not freeform) | Reproducible, parseable, gradeable without human review per run | ✓ Good — Zod v4 native z.toJSONSchema() worked well |
| Author runs reference results (not community) | Prevents gaming, ensures quality bar for v1 launch | ✓ Good — 9 reference runs committed |
| LLM-as-judge for qualitative scoring | No ground truth exists; scales without human grading bottleneck | ✓ Good — Claude Sonnet judge at temp 0 stable |
| Next.js + Vercel | Ships fastest, excellent for results dashboard, free tier sufficient | ✓ Good — deployed cleanly on first push |
| Zod v4 native z.toJSONSchema() (vs zod-to-json-schema) | zod-to-json-schema is EOL; Zod v4 has native API | ✓ Good — eliminated dependency, works across all 3 harnesses |
| Each provider uses native structured output (tool use / json_schema / responseMimeType) | More reliable than prompt-only JSON extraction | ✓ Good — all 3 providers returned valid structured output |

---
*Last updated: 2026-03-21 after v1.0 milestone*
