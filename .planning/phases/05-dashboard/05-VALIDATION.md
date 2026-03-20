---
phase: 5
slug: dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Next.js build + ESLint (no separate test runner) |
| **Config file** | `web/next.config.ts` — Wave 0 creates |
| **Quick run command** | `cd web && npm run build` |
| **Full suite command** | `cd web && npm run build && npm run lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd web && npm run build`
- **After every plan wave:** Run `cd web && npm run build && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green + manual Vercel deployment URL check
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | DASH-01 | build smoke | `cd web && npm run build` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | DASH-02 | build smoke | `cd web && npm run build` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | DASH-03 | build smoke | `cd web && npm run build` | ❌ W0 | ⬜ pending |
| 05-01-04 | 01 | 1 | DASH-04 | unit | `node scripts/verify-dashboard-data.ts` | ❌ W0 | ⬜ pending |
| 05-01-05 | 01 | 1 | DASH-05 | build smoke | `cd web && npm run build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `web/` directory — scaffold via `create-next-app` with App Router + Tailwind
- [ ] `web/package.json` — needs `recharts` dependency
- [ ] `scripts/verify-dashboard-data.ts` — checks all 9 entries in index.json have run_id, harness, model, composite_score, scores, cost_usd, latency_ms, run_date; and that all 9 meta.json files exist with temperature field

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard URL publicly accessible | DASH-01 | Requires live Vercel deployment | Open deployment URL in browser, confirm HTTP 200, no error page |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
