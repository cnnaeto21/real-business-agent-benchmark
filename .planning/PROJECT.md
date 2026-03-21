# Real Business Agent Benchmark (RBAB)

## What This Is

An open-source benchmark suite that tests AI agents on real business operations — not synthetic coding tasks. Inspired by Bret Taylor's "CSS Zen Garden for agent harnesses" concept, RBAB packages real vending machine business data into standardized harnesses that any model can be run against in one shot, producing comparable metrics across agents. The v1 benchmark ships 3 harnesses (inventory optimization, pricing strategy, financial forecasting) with a live results dashboard comparing Claude, GPT-4, Gemini, and other agents.

## Core Value

Any agent builder or operator should be able to run `benchmark --harness inventory --model gpt-4` and get a reproducible, comparable score — proving (or disproving) that their agent can actually help run a business.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] 3 benchmark harnesses built from real vending machine data (inventory optimization, pricing strategy, financial forecasting)
- [ ] Each harness: data package + system prompt + structured output schema (JSON) + eval rubric
- [ ] Hybrid evaluation: structured output parsing + LLM-as-judge for reasoning quality
- [ ] CLI runner: `benchmark --harness <name> --model <provider/model>` executes a harness end-to-end
- [ ] Reference runs published for Claude Sonnet, GPT-4o, Gemini 1.5 Pro
- [ ] Live results dashboard (Next.js + Vercel) showing scores across models
- [ ] GitHub repo with full harness data, runner code, and documentation
- [ ] Data anonymized (location names and dollar amounts scrubbed, patterns preserved)

### Out of Scope

- Location analysis harness — deferred to v2; 3 precise harnesses ship cleaner than 4
- Real-time leaderboard with community submissions — v1 results are author-run only, prevents gaming
- Non-vending business domains in v1 — single domain keeps data quality high; others can fork
- Multi-turn/conversational harness format — single prompt + structured output keeps scoring reproducible
- Automated CI that re-runs all models when new versions drop — good v2 feature, not needed for launch

## Context

- **Inspiration**: Bret Taylor's LinkedIn post proposing standardized agent harnesses ("kind of a CSS Zen Garden") — the idea being a single prompt that terraforms an application/task from scratch, enabling direct model-to-model comparison. RBAB applies this to business operations.
- **Data source**: Owner's real vending machine operation — actual P&L, sales velocity, inventory logs, location performance data. Ready to clean and anonymize for public release.
- **Evaluation gap being filled**: No existing benchmark captures qualitative reasoning quality for business decisions. SWE-bench, HumanEval, etc. are all code. Business operators have no equivalent.
- **Target audience**: AI builders evaluating which agent to deploy for business automation; agent companies (Anthropic, OpenAI, Google) wanting real-world eval evidence; operators considering AI tools.
- **Distribution**: HN Show HN post + direct outreach to agent companies as proof of real-world eval need.

## Constraints

- **Timeline**: 7-day prototype (by 2026-03-19) — must ship live site + working harnesses
- **Tech stack**: Next.js + Vercel for web, Node.js/Python for CLI runner
- **Data privacy**: Business data fine to publish after anonymization (location names + $ amounts scrubbed)
- **Evaluation**: No ground truth — harnesses are open-ended business decisions, quality judged by reasoning depth and actionability, not a single correct answer
- **Scoring**: Hybrid — structured JSON output parsing for quantitative metrics + LLM judge for qualitative reasoning quality

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 3 harnesses from single domain (vending) | Precision over breadth; better data quality + coherent story; more harnesses are v2 | — Pending |
| Structured output schema (not freeform) | Reproducible, parseable, gradeable without human review per run | — Pending |
| Author runs reference results (not community) | Prevents gaming, ensures quality bar for v1 launch | — Pending |
| LLM-as-judge for qualitative scoring | No ground truth exists; scales without human grading bottleneck | — Pending |
| Next.js + Vercel | Ships fastest, excellent for results dashboard, free tier sufficient | — Pending |

---
*Last updated: 2026-03-12 after initialization*
