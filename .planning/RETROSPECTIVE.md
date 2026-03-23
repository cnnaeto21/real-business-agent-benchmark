# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-21
**Phases:** 6 | **Plans:** 17 | **Commits:** 99 | **Timeline:** 10 days

### What Was Built
- Three production harness packages from real vending business data — locked Zod v4 schemas, eval rubrics, and judge prompt
- `benchmark` CLI supporting Anthropic/OpenAI/Google with each provider's native structured output mechanism
- Two-gate eval pipeline: Zod schema validation + LLM-as-judge with composite 0–100 scoring and index.json
- Nine reference benchmark results (3 harnesses × 3 models) committed to git with full run manifests
- Static Next.js dashboard deployed to Vercel with model comparison table, per-dimension charts, run metadata
- Complete documentation suite (README, harness-spec.md, scoring.md, running.md, LIMITATIONS.md)

### What Worked
- **Strict architectural dependency ordering** (spec → runner → eval → runs → dashboard → docs) prevented rework — each phase had stable contracts before dependent work began
- **Zod v4 native z.toJSONSchema()** eliminated the EOL zod-to-json-schema dependency and worked cleanly across all 3 harnesses
- **Provider-agnostic routing by string prefix** (anthropic/, openai/, google/) kept the CLI interface clean without registry indirection
- **results/ committed to git** (not gitignored) was the right call — Vercel static build needed the data at build time, no API needed
- **Coarse granularity kept phase count reasonable** — 6 phases for a strict pipeline is appropriate; forcing finer granularity would have created artificial splits

### What Was Inefficient
- **Phase 4 SUMMARY missing** — 04-02-PLAN.md (the actual execution of 9 runs) was completed without a formal SUMMARY.md, leaving the ROADMAP progress table inconsistent with reality (showing 0/2 when runs existed)
- **DASH-04 metadata rendering gap** — run_date, harness_version, temperature were loaded into types and data layer but never rendered in ScoresTable.tsx; caught only in audit, not during implementation
- **EVAL-02 judge_temperature hardcoded** — loadHarness reads spec.eval.judge_temperature but callJudge() hardcodes 0; worked coincidentally but creates a silent failure risk for future rubric changes
- **HRNS-02 description field** — declared in all 3 YAML files but absent from HarnessSpec TypeScript type; silently ignored. No consumer was planned but the type/file mismatch is confusing

### Patterns Established
- **Importable script pattern**: export function + isMain guard at bottom — scripts work both as CLI (`npx tsx script.ts`) and as imported modules
- **Sequential subprocess with stdio:inherit**: child_process.spawn for orchestrating benchmark subprocesses streams output live to terminal
- **TDD RED first**: Wave 0 test scaffold written before implementation catches interface mismatches before code is written
- **Dry-run exits 0**: env var absence is informational, not a failure — lets users see setup requirements before spending API credits

### Key Lessons
1. **Plan execution artifacts (SUMMARY.md) are as important as code artifacts** — a phase that ran without a SUMMARY creates audit confusion and incorrect progress tracking downstream
2. **Render what you load** — if a field is typed, loaded, and passed through the data layer, it should be rendered or explicitly dropped. Halfway implementation (loaded but not rendered) creates silent drift
3. **Lock judge prompt before eval engine** — EVAL-02 assigned to Phase 1 was correct; any rubric or judge prompt change after reference runs invalidates all historical scores
4. **Static site + git-committed data** is a simple, durable architecture for benchmark dashboards — no API, no database, Vercel builds from repo state
5. **Provider-specific structured output quirks require API version research** — Google's responseJsonSchema vs responseSchema distinction (post-v1.9.0) and Anthropic tool_choice forcing are not obvious from docs

### Cost Observations
- Model mix: ~100% sonnet (claude-sonnet-4-6 for all agent execution; claude-sonnet-4-6 as judge)
- Sessions: ~20 planning/execution sessions estimated
- Notable: Coarse granularity (6 phases vs potential 12+) kept context load manageable; wave-based parallelization used within phases

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 6 | 17 | First milestone — baseline established |

### Cumulative Quality

| Milestone | Phases Verified | Tech Debt Items | Notes |
|-----------|-----------------|-----------------|-------|
| v1.0 | 5/6 | 4 | Phase 4 missing VERIFICATION.md; 3 display/type gaps |

### Top Lessons (Verified Across Milestones)

1. Always write SUMMARY.md for executed plans — progress tracking and audit accuracy depend on it
2. Render what you load — typed fields that go unrendered create invisible drift between data layer and UI
