---
phase: 03-eval-engine
verified: 2026-03-17T13:15:00Z
status: passed
score: 4/4 success criteria verified
re_verification: true
  previous_status: gaps_found
  previous_score: 3/4
  gaps_closed:
    - "Eval engine can score any existing raw output directory without re-running the LLM (rubric re-application to old runs)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Verify --skip-eval produces no scored/ directory"
    expected: "Running `benchmark --harness inventory-optimization --model anthropic/claude-sonnet-4-6 --skip-eval` writes raw/ and meta.json but no scored/ directory is created for that run."
    why_human: "Requires live CLI invocation with a real harness run. Cannot verify without ANTHROPIC_API_KEY and a live provider call."
  - test: "Verify judge API failure exits 0 with raw output preserved"
    expected: "When ANTHROPIC_API_KEY is invalid or judge call fails, CLI exits 0, raw/ directory exists, scored/ does not exist, stderr contains 'Judge scoring failed:'"
    why_human: "Requires controlled failure injection (invalid API key) against a live CLI run."
  - test: "Verify scripts/re-eval.ts against a live existing run"
    expected: "Running `tsx scripts/re-eval.ts --run-id <valid-id>` prints 'Re-scoring run ...', calls judge, prints inline scores, updates results/index.json with refreshed scored result."
    why_human: "Requires ANTHROPIC_API_KEY and a pre-existing run directory. Disk-read and runEval wiring verified programmatically; judge API call and scored/ output require live execution."
---

# Phase 3: Eval Engine Verification Report

**Phase Goal:** A decoupled eval engine that scores any existing raw output directory without re-running the LLM — enabling rubric changes to be re-applied to old runs
**Verified:** 2026-03-17T13:15:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (03-04-PLAN.md, commit `26e218c`)

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Running eval validates raw output against Zod schema, rejecting malformed outputs at the first gate | VERIFIED | `src/eval.ts:252` — `zodSchema.safeParse(rawOutput)` gates judge call; failure path produces zero-score ScoredResult with `schema_valid: false`, `validation_error` set. All 4 schema-failure assertions pass in test-eval.ts. |
| 2 | Valid outputs are scored by Claude Sonnet (temperature 0) on three dimensions (1-5 each with rationale) | VERIFIED | `src/eval.ts:107-152` — `callJudge` calls `client.messages.create` in plain text mode (no tool_choice), temperature: 0. `JudgeResponse` Zod schema enforces 3 dimensions each with score (int, min:1, max:5) and rationale (string, min:1). 5 JudgeResponse assertions pass. Live run at commit `31ef007` confirmed. |
| 3 | Scored result written to `results/<run-id>/scored/<model-slug>.json`, `results/index.json` updated with deduplication | VERIFIED | `src/eval.ts:162-203` — `writeScored` creates scored/ directory and file. `upsertIndex` implements read-modify-write with run_id filter-then-push deduplication. 5 integration assertions pass (writeScored 2, upsertIndex 3). Actual file confirmed at `results/7cdfe713-.../scored/anthropic--claude-sonnet-4-6.json`. |
| 4 | Eval engine can score any existing raw output directory without re-running the LLM (rubric re-application to old runs) | VERIFIED | `scripts/re-eval.ts` (commit `26e218c`, 101 lines): reads `meta.json` from disk (line 47), reads `raw/<model-slug>.json` from disk (line 71), calls `loadHarness()` fresh for current spec (line 81), delegates to `runEval` (line 89). Usage gate: exit 1 + message when `--run-id` omitted (confirmed). Bad-run-id gate: `"Error: Run directory not found: results/<id>"` exit 1 (confirmed). `loadHarness` called at re-eval time (not frozen spec) — rubric changes are picked up. |

**Score: 4/4 success criteria verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/test-eval.ts` | Behavioral contract for eval engine — 18 assertions covering all EVAL requirements | VERIFIED | 365 lines. 18/18 assertions pass (confirmed by `npx tsx scripts/test-eval.ts` exit 0): 4 computeComposite, 5 JudgeResponse schema, 2 writeScored, 3 upsertIndex, 4 schema-failure path. Commit `0442ca0`. |
| `src/eval.ts` | Eval engine — JudgeResponse, computeComposite, writeScored, upsertIndex, runEval | VERIFIED | 357 lines. All 5 exports present. Two-gate pipeline (safeParse + judge call). Markdown code-fence stripping added in commit `31ef007`. Commit `c8bbe1f`. |
| `src/cli.ts` | Calls runEval after writeResults when noEval is not set | VERIFIED | Line 79: `if (!opts.noEval) { await runEval({...}) }`. Imports `runEval` from `./eval.ts` (line 7) and `calculateCost` from `./cost.ts` (line 8). Commit `b0b8b4b`. |
| `src/bin.ts` | `--skip-eval` Commander option | VERIFIED | Line 14: `.option("--skip-eval", "Skip scoring (raw output and meta.json still written)")`. Line 22: `noEval: !!options.skipEval`. Commit `b0b8b4b`. |
| `src/types.ts` | `noEval?: boolean` field in BenchmarkOptions | VERIFIED | Line 48: `noEval?: boolean;` added to `BenchmarkOptions`. Commit `b0b8b4b`. |
| `scripts/re-eval.ts` | Standalone re-eval entry point — reads run from disk, calls runEval without LLM | VERIFIED | 101 lines, commit `26e218c`. Imports `loadHarness` and `runEval`. Reads `meta.json` and `raw/<slug>.json` from disk. Exits 1 with usage message when `--run-id` absent (confirmed). Exits 1 with `"Error: Run directory not found: results/<id>"` for invalid run-id (confirmed). No duplicated scoring logic — delegates entirely to `runEval`. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scripts/test-eval.ts` | `src/eval.ts` | `import { computeComposite, JudgeResponse, writeScored, upsertIndex } from "../src/eval.ts"` | WIRED | Lines 10-15. All 4 exports imported and exercised in assertions. |
| `src/eval.ts` | `docs/judge-prompt.md` | `readFile(join(process.cwd(), 'docs', 'judge-prompt.md'))` | WIRED | Line 229-232. File exists at 73 lines with `{{model_output}}` and `{{rubric}}` placeholders. |
| `src/eval.ts` | `@anthropic-ai/sdk client.messages.create` | Plain text mode (no tools field) | WIRED | Lines 114-120. `messages.create` called with no `tools`, no `tool_choice`. `temperature: 0`. |
| `src/eval.ts` | `results/index.json` | `upsertIndex` — read-modify-write with run_id deduplication | WIRED | Lines 276, 335 — both schema-failure and success paths call `upsertIndex`. |
| `src/bin.ts` | `src/cli.ts BenchmarkOptions.noEval` | `options.skipEval → noEval: !!options.skipEval` | WIRED | `bin.ts` line 22 passes `noEval: !!options.skipEval`. `cli.ts` line 79 checks `!opts.noEval`. |
| `src/cli.ts` | `src/eval.ts runEval` | `if (!opts.noEval) await runEval(...)` | WIRED | Lines 79-93. Full `runEval` opts object passed including `meta` with `calculateCost`. |
| `src/cli.ts runEval call` | `meta object from writeResults` | `calculateCost(opts.model, result.inputTokens, result.outputTokens)` | WIRED | Line 88. `calculateCost` imported from `./cost.ts` (line 8). `latencyMs` and `new Date().toISOString()` also passed. |
| `scripts/re-eval.ts` | `src/eval.ts runEval` | `import { runEval } from "../src/eval.ts"` and direct call | WIRED | Line 18 imports `runEval`. Line 89 calls `runEval({runDir, runId, harnessName, rawOutput, modelSlug, spec, meta})`. |
| `scripts/re-eval.ts` | `results/<run-id>/meta.json` | `readFile(metaPath, "utf-8")` | WIRED | `metaPath = join(runDir, "meta.json")` (line 41). `readFile(metaPath, "utf-8")` called line 47. Parsed as `{ harness, model, cost_usd, latency_ms, run_date }`. |
| `scripts/re-eval.ts` | `results/<run-id>/raw/<model-slug>.json` | `readFile(rawOutputPath, "utf-8")` | WIRED | `rawOutputPath = join(rawDir, \`${modelSlug}.json\`)` (line 68). `readFile(rawOutputPath, "utf-8")` called line 71. Parsed as `rawOutput: unknown`. |
| `scripts/re-eval.ts` | `src/harness.ts loadHarness` | `loadHarness(harness)` called at re-eval time (not frozen spec) | WIRED | Line 17 imports `loadHarness`. Line 81: `const { spec } = loadHarness(harness)`. Fresh call ensures rubric changes are applied. |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| EVAL-01 | 03-01, 03-02, 03-03, 03-04 | Eval engine validates raw output against harness output schema (Zod safeParse) — first scoring gate | SATISFIED | `src/eval.ts:252` — `zodSchema.safeParse(rawOutput)`. Zero-score path on failure. 4 schema-failure assertions in test-eval.ts pass. `re-eval.ts` feeds `rawOutput` from disk into same `runEval` path. |
| EVAL-03 | 03-01, 03-02, 03-03, 03-04 | Judge scores on 3 dimensions: actionability, reasoning transparency, completeness (each 1-5) | SATISFIED | `JudgeResponse` Zod schema at lines 24-33. `DimensionScore` enforces `score: z.number().int().min(1).max(5)`. Dimension names match. |
| EVAL-04 | 03-01, 03-02, 03-03, 03-04 | Judge returns structured JSON with score + rationale per dimension | SATISFIED | `JudgeResponse` requires `rationale: z.string().min(1)` per dimension. Judge called in plain text mode; response parsed with Zod. |
| EVAL-05 | 03-01, 03-02, 03-03, 03-04 | Eval engine computes composite score (unweighted average of dimension scores, normalized 0-100) | SATISFIED | `computeComposite` at line 92: `Math.round((a + rt + c) / 3 * 20)`. Verified: all-5→100, all-1→20, 4/3/5→80, rounding case→67. |
| EVAL-06 | 03-01, 03-02, 03-03, 03-04 | Eval engine writes scored result to `results/<run-id>/scored/<model-slug>.json` | SATISFIED | `writeScored` at lines 162-174. Creates `scored/` dir + `<modelSlug>.json`. Real file confirmed at `results/7cdfe713-.../scored/`. Re-eval invokes same `writeScored` via `runEval`. |
| EVAL-07 | 03-01, 03-02, 03-03, 03-04 | Eval engine updates `results/index.json` after each run | SATISFIED | `upsertIndex` at lines 185-204. Both pipeline paths (schema fail + success) call `upsertIndex`. Deduplication by `run_id` verified. Re-eval invokes same `upsertIndex` via `runEval`. |
| EVAL-02 | Not in Phase 3 plans | Eval engine calls Claude Sonnet (temperature 0) as fixed judge | OUT OF SCOPE — Phase 1 | REQUIREMENTS.md assigns EVAL-02 to Phase 1 (judge prompt design). Not claimed by any 03-xx-PLAN.md. Not verified here. |

**All six requirements claimed by Phase 3 plans (EVAL-01, EVAL-03 through EVAL-07) are satisfied.**
**EVAL-02 is correctly scoped to Phase 1 and not orphaned from Phase 3.**

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/eval.ts` | 124, 133, 138 | `return null` | Info | Inside `callJudge`'s inner `attempt()` function — intentional retry control flow. `null` signals a failed parse attempt; caller retries once then throws. Not a stub. |
| `src/eval.ts` | 294 | Comment includes word "placeholders" | Info | Comment reads "inject placeholders and call judge" — refers to template injection (`{{model_output}}`/`{{rubric}}`), not a placeholder implementation. |

No blocker or warning anti-patterns found in any file, including `scripts/re-eval.ts`.

---

### TypeScript Compilation Note

`npx tsc --noEmit` shows `TS5097` errors for `scripts/re-eval.ts` (lines 17-18: `.ts` extension in import paths). This is a pre-existing project-wide condition affecting `scripts/test-eval.ts`, `scripts/test-output.ts`, `src/output.ts`, and others — 7 total `TS5097` errors across the project, none unique to `re-eval.ts`. The only non-TS5097 error is `TS2307` in `harnesses/financial-forecasting/schema.test.ts` (pre-existing, unrelated to Phase 3). The `tsx` runtime handles `.ts` imports correctly; this is an intentional project pattern documented in the 03-04-SUMMARY.md.

---

### Human Verification Required

#### 1. --skip-eval flag skips scored output

**Test:** Run `set -a; source .env; set +a && npx tsx src/bin.ts --harness inventory-optimization --model anthropic/claude-sonnet-4-6 --skip-eval`
**Expected:** Run completes, `results/<run-id>/raw/` and `results/<run-id>/meta.json` exist, `results/<run-id>/scored/` does NOT exist.
**Why human:** Requires live API call to complete the full run path with a real harness.

#### 2. Judge API failure exits 0 with raw output preserved

**Test:** Set `ANTHROPIC_API_KEY=invalid` and run a full benchmark without `--skip-eval`.
**Expected:** CLI exits 0, `raw/` directory and `meta.json` written, `scored/` not created, stderr contains `"Judge scoring failed:"`.
**Why human:** Requires controlled failure injection with an invalid API key.

#### 3. re-eval.ts against a live existing run

**Test:** Run `set -a; source .env; set +a && npx tsx scripts/re-eval.ts --run-id e84a55fa-d8fd-4134-b46a-6420bf27bf0f`
**Expected:** Prints "Re-scoring run e84a55fa-...", calls judge (ANTHROPIC_API_KEY required), prints inline scores, updates `results/index.json` with refreshed scored result in `results/e84a55fa-.../scored/`.
**Why human:** Disk-read path and runEval wiring are verified programmatically. Judge API call and scored/ output write require live execution with ANTHROPIC_API_KEY.

---

### Gap Closure Summary

The single gap from the initial verification is now closed.

**What was missing:** No standalone entry point existed to re-score an existing run from disk. `runEval` only accepted in-memory `rawOutput` passed from `cli.ts` immediately after a live LLM call. There was no path to point at `results/<run-id>/raw/<model-slug>.json` and re-score it.

**What was added:** `scripts/re-eval.ts` (commit `26e218c`, 101 lines). The script:
1. Parses `--run-id <uuid>` from argv, exits 1 with usage message if absent
2. Reads `results/<run-id>/meta.json` to recover `harness`, `model`, `cost_usd`, `latency_ms`, `run_date`
3. Reads `results/<run-id>/raw/<model-slug>.json` as `rawOutput: unknown`
4. Calls `loadHarness(harness)` at re-eval time (not stored/frozen spec) — rubric or schema changes made since the original run will be applied
5. Delegates to `runEval` for all scoring logic — no duplicated eval code

This delivers the "re-apply rubric changes to old runs" capability that the ROADMAP goal explicitly calls out as the motivation for decoupling the eval engine.

**Automated verification of gap closure (no ANTHROPIC_API_KEY required):**
- `scripts/re-eval.ts` exists: confirmed
- Usage gate: `npx tsx scripts/re-eval.ts` → exits 1, prints `"Usage: tsx scripts/re-eval.ts --run-id <uuid>"` — confirmed
- Bad run-id gate: `npx tsx scripts/re-eval.ts --run-id does-not-exist` → exits 1, prints `"Error: Run directory not found: results/does-not-exist"` — confirmed
- `runEval` import and call wiring: confirmed (lines 18, 89)
- `loadHarness` import and fresh call: confirmed (lines 17, 81)
- `meta.json` read path: confirmed (lines 41, 47)
- `raw/<model-slug>.json` read path: confirmed (lines 68, 71)
- All 18 test-eval.ts assertions still pass: `npx tsx scripts/test-eval.ts` exits 0 — confirmed (no regressions)

---

_Verified: 2026-03-17T13:15:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: after gap closure via 03-04-PLAN.md_
