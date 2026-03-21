---
phase: 4
slug: reference-runs
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `assert` (no framework — consistent with Phase 2-3 Wave 0 scripts) |
| **Config file** | None — scripts follow `tsx scripts/` convention |
| **Quick run command** | `npm run verify-reference` |
| **Full suite command** | `npm run verify-reference` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run verify-reference`
- **After every plan wave:** Run `npm run verify-reference` + manual review of one scored JSON per harness
- **Before `/gsd:verify-work`:** Full suite must be green (all 9 entries, all `schema_valid: true`)
- **Max feedback latency:** ~2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 0 | REF-01, REF-02, REF-03 | smoke | `npm run verify-reference` | ❌ Wave 0 | ⬜ pending |
| 04-01-02 | 01 | 0 | REF-01, REF-02, REF-03 | smoke | `npm run verify-reference` | ❌ Wave 0 | ⬜ pending |
| 04-02-01 | 02 | 1 | REF-01, REF-02 | smoke | `npm run verify-reference` | ❌ Wave 0 | ⬜ pending |
| 04-02-02 | 02 | 1 | REF-01, REF-02, REF-03 | smoke | `npm run verify-reference` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/verify-reference.ts` — covers REF-01, REF-02, REF-03 (primary verification artifact)
- [ ] `scripts/run-reference.ts` — orchestrator that produces the reference artifacts
- [ ] `package.json` entries: `"reference"` and `"verify-reference"` scripts

*These Wave 0 artifacts ARE the phase deliverables — the scripts don't test themselves, but `verify-reference.ts` verifies the output of `run-reference.ts` end-to-end.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `docs/judge-prompt.md` content matches what eval engine reads | REF-03 | File content comparison — judge-prompt.md was written in Phase 1 and is injected at runtime | Run one benchmark, capture the judge prompt sent (add debug log), diff against `docs/judge-prompt.md` |
| Summary table accuracy | REF-01, REF-02 | Human review of composite scores and cost figures | After all 9 runs complete, review the summary table printed by run-reference.ts |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
