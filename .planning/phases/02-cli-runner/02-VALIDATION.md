---
phase: 2
slug: cli-runner
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `tsx` + Node `assert` for unit scripts; no formal test runner |
| **Config file** | none — Wave 0 installs test scripts |
| **Quick run command** | `npx tsx scripts/test-render.ts` |
| **Full suite command** | `npx tsx scripts/test-render.ts && npx tsx scripts/test-routing.ts && npx tsx scripts/test-meta.ts` |
| **Estimated runtime** | ~5 seconds (no API calls) |

---

## Sampling Rate

- **After every task commit:** Run `npx tsx scripts/test-render.ts` (fast, no API call)
- **After every plan wave:** Run full suite + Anthropic end-to-end smoke test
- **Before `/gsd:verify-work`:** Full suite must be green + live run produces expected output files
- **Max feedback latency:** ~5 seconds (unit scripts), ~30 seconds (smoke test with live API)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-W0-01 | W0 | 0 | RUN-02 | unit | `npx tsx scripts/test-render.ts` | ❌ W0 | ⬜ pending |
| 2-W0-02 | W0 | 0 | RUN-03 | unit | `npx tsx scripts/test-routing.ts` | ❌ W0 | ⬜ pending |
| 2-W0-03 | W0 | 0 | RUN-06 | unit | `npx tsx scripts/test-meta.ts` | ❌ W0 | ⬜ pending |
| 2-xx-01 | varies | 1 | RUN-01 | smoke | `npx tsx src/cli.ts --harness inventory-optimization --model anthropic/claude-sonnet-4-6` | ❌ W0 | ⬜ pending |
| 2-xx-02 | varies | 1 | RUN-05 | file-exists | `ls results/*/raw/anthropic--claude-sonnet-4-6.json` | ❌ W0 | ⬜ pending |
| 2-xx-03 | varies | 2 | RUN-04 | smoke | `npx tsx src/cli.ts --harness inventory-optimization --model anthropic/claude-sonnet-4-6` + inspect output | Phase run | ⬜ pending |
| 2-xx-04 | varies | 2 | RUN-06 | unit | `npx tsx scripts/test-meta.ts` after live run | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/test-render.ts` — loads inventory-optimization harness, renders prompt, asserts no `{{` placeholders remain; covers RUN-02
- [ ] `scripts/test-routing.ts` — verifies provider dispatch routes correctly by model prefix (anthropic/, openai/, google/); covers RUN-03
- [ ] `scripts/test-meta.ts` — parses a sample meta.json fixture and validates all required fields present (model, provider_api_version, temperature, max_tokens, input_tokens, output_tokens, cost_usd, latency_ms); covers RUN-06
- [ ] `.gitignore` entry for `results/` — prevent accidental commits of dev run output

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Anthropic provider uses tool use (not native Structured Outputs) | RUN-04 | Requires inspecting actual API request payload | Run with `ANTHROPIC_DEBUG=1` or inspect raw JSON in results; confirm `tools` array and `tool_choice` present in request |
| Rendered prompt is deterministic across two runs | RUN-02 (determinism) | Requires running twice and diffing | Run benchmark twice on same harness, diff the two `raw/*.json` files — prompt field must be identical |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
