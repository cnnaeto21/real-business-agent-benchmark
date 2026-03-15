---
phase: 1
slug: harness-definitions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — Phase 1 is pure authoring (no runtime code) |
| **Config file** | none — Wave 0 installs Zod v4 for schema validation |
| **Quick run command** | `node -e "import('./harnesses/inventory-optimization/schema.js').then(m => console.log(m.schema.parse ? 'ok' : 'fail'))"` |
| **Full suite command** | `node scripts/validate-schemas.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick schema parse check for modified harness
- **After every plan wave:** Run `node scripts/validate-schemas.js` (full schema validation)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-xx-01 | varies | 1 | HRNS-01 | file-exists | `ls harnesses/inventory-optimization/harness.yaml` | ❌ W0 | ⬜ pending |
| 1-xx-02 | varies | 1 | HRNS-02 | file-exists | `ls harnesses/pricing-strategy/harness.yaml` | ❌ W0 | ⬜ pending |
| 1-xx-03 | varies | 1 | HRNS-02 | file-exists | `ls harnesses/financial-forecasting/harness.yaml` | ❌ W0 | ⬜ pending |
| 1-xx-04 | varies | 1 | HRNS-04 | schema-parse | `node scripts/validate-schemas.js inventory-optimization` | ❌ W0 | ⬜ pending |
| 1-xx-05 | varies | 1 | HRNS-04 | schema-parse | `node scripts/validate-schemas.js pricing-strategy` | ❌ W0 | ⬜ pending |
| 1-xx-06 | varies | 1 | HRNS-04 | schema-parse | `node scripts/validate-schemas.js financial-forecasting` | ❌ W0 | ⬜ pending |
| 1-xx-07 | varies | 2 | EVAL-02 | file-exists | `ls docs/judge-prompt.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/validate-schemas.js` — node script that imports each harness schema and runs `z.toJSONSchema()`, exits non-zero if any fail
- [ ] `package.json` with `"zod": "^4.3.6"` and `"typescript": "^5.4.0"` — if no existing package.json
- [ ] `harnesses/` directory structure scaffolded — three subdirectories

*Note: Phase 1 produces no runtime logic, so test infrastructure is minimal — schema validation scripts are the primary automated check.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rubric score anchors are behaviorally concrete | HRNS-05 | Requires human judgment — "Score 5 means X" must be specific, not circular | Read each rubric dimension; verify Score 5 and Score 1 anchors cite specific behaviors, not abstract qualities |
| Anti-verbosity instruction is present and unambiguous | HRNS-06 | Textual content review | Confirm `rubric.md` in each harness contains explicit instruction penalizing length without specificity |
| CSV data is properly anonymized | HRNS-03 | No automated way to detect real location names or dollar amounts | Review CSVs for real location names (e.g. "Location A" not "Main St Subway") and dollar amounts scrubbed |
| Judge prompt structure covers all five required sections | EVAL-02 | Content review | Verify `docs/judge-prompt.md` has: role, subject output placeholder, rubric placeholder, anti-bias instructions, JSON output format |
| harness.yaml fields are complete and valid YAML | HRNS-02 | Schema for harness.yaml not formalized until Phase 2 runner | Manually inspect each harness.yaml for required fields: version, data_files, prompt_template, schema_path, rubric_path, judge_model, providers |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
