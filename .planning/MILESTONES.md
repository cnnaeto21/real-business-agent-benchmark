# Milestones

## v1.0 MVP (Shipped: 2026-03-21)

**Phases:** 6 | **Plans:** 17 | **Commits:** 99 | **LOC:** ~2,560 TypeScript
**Timeline:** 10 days (2026-03-12 → 2026-03-21)
**Git range:** initial commit → 9e07dd3

**Delivered:** End-to-end benchmark suite with 3 harnesses, CLI runner, eval pipeline, 9 reference runs, live Vercel dashboard, and full documentation.

**Key accomplishments:**
- Three harness packages built from real vending business data with locked Zod v4 schemas, eval rubrics, and judge prompt (Phase 1)
- `benchmark` CLI executing end-to-end against Anthropic, OpenAI, and Google using each provider's native structured output mechanism (Phase 2)
- Two-gate eval pipeline: Zod schema validation gate + LLM-as-judge scoring (3 dimensions, composite 0–100) with deduplicated index.json (Phase 3)
- Nine reference benchmark results committed (3 harnesses × Claude Sonnet, GPT-4o, Gemini 1.5 Pro) with full run manifests and orchestration scripts (Phase 4)
- Static Next.js dashboard deployed to Vercel with model comparison table, per-dimension bar charts, run metadata, and "Run it yourself" section (Phase 5)
- Complete documentation suite (README, harness-spec.md, scoring.md, running.md, LIMITATIONS.md) enabling clean-clone reproducibility (Phase 6)

**Tech debt accepted:**
- DASH-04/DASH-05: Some metadata fields loaded but not rendered; model display string stale (fixed post-audit)
- EVAL-02: judge_temperature hardcoded (coincidentally correct at 0)
- HRNS-02: description field in harness.yaml silently ignored by TypeScript type
- Phase 4: No formal VERIFICATION.md (runs evidenced by 9 committed artifacts)

---

