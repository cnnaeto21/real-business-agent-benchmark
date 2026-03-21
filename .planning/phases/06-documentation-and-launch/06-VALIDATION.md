---
phase: 6
slug: documentation-and-launch
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual file existence checks + link verification |
| **Config file** | none |
| **Quick run command** | `ls README.md LIMITATIONS.md docs/harness-spec.md docs/scoring.md` |
| **Full suite command** | `npm run validate && ls README.md LIMITATIONS.md docs/harness-spec.md docs/scoring.md docs/running.md docs/judge-prompt.md` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `ls README.md LIMITATIONS.md docs/harness-spec.md docs/scoring.md`
- **After every plan wave:** Run `npm run validate && ls README.md LIMITATIONS.md docs/harness-spec.md docs/scoring.md docs/running.md docs/judge-prompt.md`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | DOCS-04 | file-exists | `ls docs/scoring.md` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | DOCS-02 | file-exists | `ls docs/harness-spec.md` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | DOCS-05 | file-exists | `ls LIMITATIONS.md` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | DOCS-01 | file-exists | `ls README.md` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 2 | DOCS-01 | manual | See manual verifications | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] No test framework needed — phase is documentation-only
- [ ] All verification is file-existence checks (automated) + content spot-checks (manual)

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| README clean-clone flow works | DOCS-01 | Requires a clean environment and real API key | Follow README from scratch in a temp directory; verify `benchmark` command completes |
| All required limitations present | DOCS-05 | Content check, not file existence | Open LIMITATIONS.md, confirm all 4 limitations (single-domain scope, no ground truth, single-pass judge, training data leakage risk) are present with implications |
| harness-spec.md covers all required files | DOCS-02 | Content check | Verify harness.yaml, data/*.csv, prompt.md, schema.ts, rubric.md are all documented |
| scoring.md includes score anchors + formula | DOCS-04 | Content check | Verify composite formula is present, score anchors per dimension are present, representative JSON example included |
| Dashboard URL links resolve | DOCS-01 | External URL | Click dashboard URL in README and confirm it loads |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
