---
phase: 3
slug: eval-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in `assert` (no framework — established in Phase 2) |
| **Config file** | none — scripts run directly with `tsx` |
| **Quick run command** | `npx tsx scripts/test-eval.ts` |
| **Full suite command** | `npx tsx scripts/test-meta.ts && npx tsx scripts/test-output.ts && npx tsx scripts/test-render.ts && npx tsx scripts/test-routing.ts && npx tsx scripts/test-eval.ts` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsx scripts/test-eval.ts`
- **After every plan wave:** Run full suite (all test-*.ts scripts)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | EVAL-01,03,04,05,06,07 | unit+integration | `npx tsx scripts/test-eval.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | EVAL-01 | unit | `npx tsx scripts/test-eval.ts` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | EVAL-03,04,05 | unit (mock) | `npx tsx scripts/test-eval.ts` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 1 | EVAL-06,07 | integration | `npx tsx scripts/test-eval.ts` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | EVAL-01..07 | integration (live) | manual smoke test | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/test-eval.ts` — covers all EVAL-01 through EVAL-07 without live API calls
  - Unit: `computeComposite` formula correctness
  - Unit: schema validation failure path (score 0, validation_error, schema_valid false)
  - Unit: JudgeResponse Zod schema parse (valid + invalid judge JSON)
  - Integration: `writeScored` creates `results/<run-id>/scored/<slug>.json` with correct shape
  - Integration: `upsertIndex` adds new entry + replaces existing entry for same run_id
  - Uses mock judge JSON string — no live Anthropic API call

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Judge call uses plain text mode (no tool use) | EVAL-04 | Live Anthropic API call required | Run `set -a; source .env; set +a && npx tsx src/bin.ts --harness inventory-optimization --model anthropic/claude-sonnet-4-6` and verify `results/<run-id>/scored/` directory and file are created |
| Inline score display in CLI output | EVAL-03,05 | Requires live run | Verify CLI prints `Scores: Actionability X/5 · Reasoning X/5 · Completeness X/5` and `Composite: XX/100` |
| --no-eval flag skips scoring | EVAL-01 (negative) | Requires CLI invocation | Run with `--no-eval` flag and verify `scored/` directory is NOT created |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
