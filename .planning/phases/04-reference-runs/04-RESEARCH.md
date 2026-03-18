# Phase 4: Reference Runs - Research

**Researched:** 2026-03-17
**Domain:** Node.js script orchestration, child_process spawning, LLM provider API reliability
**Confidence:** HIGH

## Summary

Phase 4 is a pure execution phase — no new architectural components. The full benchmark pipeline (harness loader, three provider adapters, eval engine, index writer) is already built and validated by Phases 1-3. The deliverable is two new scripts (`scripts/run-reference.ts` and `scripts/verify-reference.ts`) that wrap the existing CLI, plus the nine committed result artifacts they produce.

The primary implementation challenge is safe orchestration: clearing existing test results, sequencing nine subprocess invocations without hitting provider rate limits, retrying once on failure, gating the git commit on full verification, and providing a pre-run cost estimate with confirmation. All these patterns are straightforward with Node.js built-ins (`child_process.spawn`, `fs/promises`, `readline`).

The secondary challenge is model ID currency: `gpt-4o` and `gemini-1.5-pro` are the currently configured provider strings in `harness.yaml` (verified in the existing harness definitions). The `calculateCost` price table in `src/cost.ts` includes entries for all three reference models at the same model strings.

**Primary recommendation:** Follow the `scripts/re-eval.ts` + `scripts/validate-schemas.ts` patterns exactly — `tsx` invocation, `fs/promises` for file ops, no external dependencies, top-level await with `process.exit(1)` on failure.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Clear `results/*/` and reset `index.json` to `[]` before starting reference runs
- The existing test run (inventory-optimization + Claude Sonnet) is NOT a reference run — delete it
- All 9 reference run folders + final `index.json` committed to git in a single atomic commit after all runs complete
- Reference runs are the only entries in `index.json` when committed
- Node.js script at `scripts/run-reference.ts`, invoked via `npm run reference`
- Follows existing `npm run validate` / `npm run benchmark` pattern — discoverable, consistent
- Script handles: clear results/ → run 9 sequentially → verify → print summary
- Sequential execution (not parallel) — avoids rate limits; ~7 minutes total at ~45s/run
- Script uses `child_process` to spawn the existing `benchmark` CLI as subprocesses
- `scripts/verify-reference.ts` is a separate script for standalone verification
  - Invoked as `npm run verify-reference` (or called internally from run-reference.ts at the end)
  - Checks: exactly 9 entries in index.json, all 9 have `schema_valid: true`, covers all 3 harnesses x 3 models
- On API error / non-zero exit: log the failure, continue with remaining runs
- Automatic retry: retry once on failure before logging as failed and continuing
- End-of-run summary table printed regardless: harness | model | status (OK/FAILED/RETRY) | composite score | cost USD
- If any run fails after retry: batch completes with summary, no commit attempted (user investigates)
- No minimum composite score — all scores are valid benchmark data (a low Gemini score is legitimate evidence)
- Schema validity is the only hard gate: `schema_valid: false` = unacceptable, must not be committed
- Schema failures: retry once automatically; if second attempt also fails → abort that run, log it
- Pre-commit verification (`verify-reference.ts`) blocks commit if any entry has `schema_valid: false`
- Verification also checks exactly 9 entries exist covering all harness x model combinations
- Script estimates total cost (9 subject model calls + 9 judge calls) using existing `calculateCost` logic before starting
- Prints estimated total USD and prompts `Proceed? (y/N)` — user confirms before any API calls
- `--dry-run` flag: validates all 3 harnesses load + all 3 provider env vars are set, without calling any LLM

### Claude's Discretion

- Exact model ID strings to use for GPT-4o and Gemini 1.5 Pro (use whatever is current at run time)
- Whether to use a `--confirm` flag or interactive readline prompt for cost confirmation
- How to present the summary table (console.table vs. manual formatting)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REF-01 | Nine reference runs exist and are committed to git: 3 harnesses × 3 models (Claude Sonnet, GPT-4o, Gemini 1.5 Pro) | `run-reference.ts` orchestrates sequential spawning with retry; verification gate before commit |
| REF-02 | All reference runs include full run manifest (model version, date, temperature, tokens, cost) | `src/output.ts` `writeResults()` already writes all 12 fields to `meta.json`; no changes needed to core code |
| REF-03 | Judge prompt used for all reference runs is published in the repo at `docs/judge-prompt.md` | `docs/judge-prompt.md` already committed (Phase 1); `verify-reference.ts` checks file exists at verification time |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `child_process` (Node built-in) | Node 18+ | Spawn `benchmark` CLI subprocesses | No dependency; gives full stdout/stderr capture and exit code |
| `fs/promises` (Node built-in) | Node 18+ | Clear results/, reset index.json, read scored JSON | Already used throughout codebase (`output.ts`, `eval.ts`, `re-eval.ts`) |
| `readline` (Node built-in) | Node 18+ | Interactive `Proceed? (y/N)` prompt | No dependency; established pattern for CLI confirmation flows |
| `tsx` | 4.15.0 (devDep) | Run TypeScript scripts directly | Already used for all scripts in `package.json`; avoids compile step |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `path` (Node built-in) | Node 18+ | Resolve results/, harnesses/ paths | Absolute path construction |
| `process.argv` | Node built-in | Parse `--dry-run` flag | Manual argv parsing (no Commander) — consistent with `re-eval.ts` pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `child_process.spawn` | `execa` (npm) | `execa` offers nicer async API but adds a dep; `spawn` is sufficient for 9 sequential calls |
| `readline` for confirmation | `--confirm` CLI flag | Flag is non-interactive (good for CI); readline requires TTY. Either works — use readline since this is a local-only script |
| Manual summary table | `console.table` | `console.table` is less portable across Node versions and truncates columns; manual formatting is more predictable |

**Installation:**
```bash
# No new dependencies required — all tools are Node built-ins or already in devDependencies
```

---

## Architecture Patterns

### Recommended Project Structure
```
scripts/
├── run-reference.ts       # NEW: main orchestrator (clear → run 9 → verify → summary)
├── verify-reference.ts    # NEW: standalone verifier (reads index.json, checks 9 valid entries)
├── re-eval.ts             # EXISTING: single-run re-scorer (prior art pattern)
├── validate-schemas.ts    # EXISTING: prior art for standalone verification scripts
└── test-*.ts              # EXISTING: Wave 0 test scripts

results/                   # Cleared before reference runs, then populated
├── <run-id>/
│   ├── meta.json
│   ├── raw/<model-slug>.json
│   └── scored/<model-slug>.json
└── index.json             # Reset to [] before runs, populated with 9 entries
```

### Pattern 1: Sequential Subprocess Orchestration
**What:** For each of 9 combinations (harness × model), spawn `tsx src/bin.ts --harness X --model Y` as a child process and await its completion before starting the next.
**When to use:** Sequential is required here (rate limit avoidance; 9 calls is small).
**Example:**
```typescript
// Source: Node.js built-in child_process — spawn with promise wrapper
import { spawn } from "child_process";

function runBenchmarkProcess(harness: string, model: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn("tsx", ["src/bin.ts", "--harness", harness, "--model", model], {
      stdio: "inherit",   // pass stdout/stderr through to terminal
      env: process.env,
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}
```

### Pattern 2: Retry Once on Non-Zero Exit
**What:** If a subprocess exits non-zero, wait briefly and retry once. If the retry also fails, record the run as FAILED and continue.
**When to use:** Rate limit or transient API errors produce non-zero exit codes; one retry catches most transient failures.
**Example:**
```typescript
async function runWithRetry(harness: string, model: string): Promise<"OK" | "RETRY" | "FAILED"> {
  const firstCode = await runBenchmarkProcess(harness, model);
  if (firstCode === 0) return "OK";

  console.log(`  First attempt failed (exit ${firstCode}), retrying...`);
  const secondCode = await runBenchmarkProcess(harness, model);
  if (secondCode === 0) return "RETRY";

  console.error(`  Both attempts failed for ${harness} × ${model}`);
  return "FAILED";
}
```

### Pattern 3: Clear results/ Before Starting
**What:** Delete all UUID subdirectories under `results/` and reset `index.json` to `[]`.
**When to use:** Mandatory before reference runs to ensure a clean committed state.
**Example:**
```typescript
import { readdir, rm, writeFile } from "fs/promises";
import { join } from "path";

async function clearResults(resultsDir: string): Promise<void> {
  const entries = await readdir(resultsDir);
  for (const entry of entries) {
    if (entry === "index.json") continue;   // handled separately
    await rm(join(resultsDir, entry), { recursive: true, force: true });
  }
  await writeFile(join(resultsDir, "index.json"), "[]", "utf-8");
}
```

### Pattern 4: Cost Estimation Before Running
**What:** Use `calculateCost` from `src/cost.ts` with representative token counts to estimate total spend before any API calls.
**When to use:** Always — user confirmed this as a hard requirement.
**Token reference data (from actual test runs in `results/`):**
- `inventory-optimization + anthropic/claude-sonnet-4-6`: ~2359 input / ~3340 output tokens
- Judge call: ~512 output tokens per run (judge `max_tokens` is 512 per `eval.ts`)
- Estimate input tokens for judge: ~3500 (judge prompt template ~1KB + model output ~2KB + rubric ~0.5KB)
- Use these as conservative representative estimates; actual will vary by harness and model

**Cost estimate formula:**
```typescript
import { calculateCost } from "../src/cost.ts";

const HARNESSES = ["inventory-optimization", "pricing-strategy", "financial-forecasting"];
const MODELS = [
  "anthropic/claude-sonnet-4-6",
  "openai/gpt-4o",
  "google/gemini-1.5-pro",
];

// Representative token estimates (from real runs)
const EST_INPUT = 2500;
const EST_OUTPUT = 3000;
const JUDGE_MODEL = "anthropic/claude-sonnet-4-6";
const JUDGE_EST_INPUT = 3500;
const JUDGE_EST_OUTPUT = 512;

let totalEstimate = 0;
for (const model of MODELS) {
  for (let i = 0; i < HARNESSES.length; i++) {
    const subjectCost = calculateCost(model, EST_INPUT, EST_OUTPUT);
    const judgeCost = calculateCost(JUDGE_MODEL, JUDGE_EST_INPUT, JUDGE_EST_OUTPUT);
    if (subjectCost !== -1) totalEstimate += subjectCost;
    if (judgeCost !== -1) totalEstimate += judgeCost;
  }
}
console.log(`Estimated total cost: $${totalEstimate.toFixed(4)} USD`);
```

### Pattern 5: Interactive Confirmation via readline
**What:** Prompt user `Proceed? (y/N)` using Node.js `readline` before making any API calls.
**Example:**
```typescript
import { createInterface } from "readline";

async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}
```

### Pattern 6: verify-reference.ts Structure
**What:** Read `results/index.json`, validate entry count, all `schema_valid: true`, all 9 harness × model combinations present.
**When to use:** Both as standalone `npm run verify-reference` AND called from end of `run-reference.ts`.

```typescript
const EXPECTED_COMBINATIONS = HARNESSES.flatMap((h) => MODELS.map((m) => `${h}|${m}`));

export async function verifyReference(indexPath: string): Promise<{ pass: boolean; errors: string[] }> {
  const errors: string[] = [];
  const index = JSON.parse(await readFile(indexPath, "utf-8")) as IndexEntry[];

  if (index.length !== 9) {
    errors.push(`Expected 9 entries, found ${index.length}`);
  }

  for (const entry of index) {
    if (!entry.schema_valid) {
      errors.push(`schema_valid: false for ${entry.harness} × ${entry.model}`);
    }
  }

  const found = new Set(index.map((e) => `${e.harness}|${e.model}`));
  for (const combo of EXPECTED_COMBINATIONS) {
    if (!found.has(combo)) errors.push(`Missing combination: ${combo}`);
  }

  return { pass: errors.length === 0, errors };
}
```

### Pattern 7: --dry-run Flag
**What:** Parse `process.argv` for `--dry-run`; if set, validate harnesses load and env vars are set without making any LLM calls. Print validation summary and exit 0.
**Example:**
```typescript
const DRY_RUN = process.argv.includes("--dry-run");

if (DRY_RUN) {
  // Validate harnesses load
  for (const harness of HARNESSES) {
    loadHarness(harness); // throws on missing files
    console.log(`  PASS harness: ${harness}`);
  }

  // Validate env vars
  const envVars = {
    "anthropic/claude-sonnet-4-6": "ANTHROPIC_API_KEY",
    "openai/gpt-4o": "OPENAI_API_KEY",
    "google/gemini-1.5-pro": "GOOGLE_API_KEY",
  };
  for (const [model, envVar] of Object.entries(envVars)) {
    if (!process.env[envVar]) {
      console.error(`  MISSING env var: ${envVar} (required for ${model})`);
    } else {
      console.log(`  PASS env var: ${envVar} set`);
    }
  }
  process.exit(0);
}
```

### Anti-Patterns to Avoid
- **Parallel subprocess execution:** Running multiple `benchmark` calls concurrently risks rate limit errors across three providers simultaneously. Sequential is mandatory.
- **Committing partial results:** Never attempt the git commit if `verifyReference()` returns `pass: false`. The commit must be atomic — all 9 results or none.
- **Importing from `src/bin.ts` directly:** `bin.ts` calls `program.parse()` on import, which would parse the script's own argv. Always invoke via subprocess.
- **Using `execa` or `shelljs`:** No new npm dependencies. All orchestration uses built-in `child_process`.
- **Skipping index.json reset:** If old test runs remain in index.json, verification will see more than 9 entries. Reset to `[]` before starting.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LLM provider calls | Custom HTTP clients | Existing `src/providers/*.ts` + `src/cli.ts` via subprocess | Already battle-tested through Phases 2-3; spawning avoids re-testing provider integration |
| Schema validation | Custom JSON validators | `src/eval.ts` `runEval()` (called by benchmark CLI automatically) | Already handles Zod safeParse, zero-score on failure, index upsert |
| Cost calculation | Arithmetic in scripts | `calculateCost()` from `src/cost.ts` | Has sentinel `-1` handling for unknown models; price table already verified |
| results/ index management | Custom write logic | `upsertIndex()` from `src/eval.ts` (called by benchmark CLI) | Handles dedup by run_id; already correct |
| Git commit | Shell `exec("git commit")` | `child_process.spawnSync("git", [...])` or document as manual step | Atomic commit with all 9 files is 3-4 git commands; could be done by script or documented clearly |

**Key insight:** The benchmark CLI already handles the entire pipeline — harness loading, provider call, raw write, meta write, eval, index upsert. `run-reference.ts` is purely an orchestrator that spawns the CLI 9 times.

---

## Common Pitfalls

### Pitfall 1: `schema_valid: false` Committed Silently
**What goes wrong:** A model produces structurally invalid output; the CLI writes a zero-score result with `schema_valid: false` to index.json; without a verification gate, this gets committed.
**Why it happens:** The eval engine deliberately continues on schema failure (it writes the failure result and moves on). Nothing in the existing code prevents committing bad results.
**How to avoid:** `verify-reference.ts` must check every entry for `schema_valid: true` before the commit is allowed. This is the only hard gate.
**Warning signs:** `composite_score: 0` and `schema_valid: false` in the summary table output.

### Pitfall 2: Test Runs Polluting index.json
**What goes wrong:** The 4 existing test runs (all `inventory-optimization + anthropic/claude-sonnet-4-6`) remain in index.json after the reference run batch. Verification sees 13 entries instead of 9.
**Why it happens:** `clearResults()` deletes result directories but if index.json reset is missed, old entries persist.
**How to avoid:** Explicitly write `[]` to `results/index.json` in the clear step before any benchmark spawns. The benchmark CLI uses `upsertIndex()` which reads the current file; starting from `[]` ensures a clean slate.
**Warning signs:** `index.json` has more than 9 entries after verification.

### Pitfall 3: Subprocess inherits Wrong cwd
**What goes wrong:** The spawned `tsx src/bin.ts` subprocess resolves `harnesses/` and `results/` relative to its working directory. If `cwd` is not set to the project root, file paths fail.
**Why it happens:** `child_process.spawn` inherits the parent's cwd by default. This is usually correct but must be explicit.
**How to avoid:** Pass `cwd: process.cwd()` explicitly in spawn options, or use `import.meta.url` to derive the project root path.
**Warning signs:** `ENOENT` errors on harness files in subprocess output.

### Pitfall 4: `calculateCost` Returns -1 for Unknown Models
**What goes wrong:** If the model string passed to the cost estimate doesn't exactly match a key in `PRICE_TABLE`, `calculateCost` returns `-1`. Adding `-1` to the estimate produces a nonsensical negative or incorrect total.
**Why it happens:** The price table uses exact model strings: `"anthropic/claude-sonnet-4-6"`, `"openai/gpt-4o"`, `"google/gemini-1.5-pro"`. Any variation (e.g. `"openai/gpt-4o-2024-11-20"`) returns -1.
**How to avoid:** Use the exact model strings from `harness.yaml` `providers` list. Check for -1 sentinel in cost estimate and warn rather than silently adding.
**Warning signs:** Estimate shows $0 or negative cost; `calculateCost` returns -1 for one of the models.

### Pitfall 5: Rate Limit After First Provider's 3 Runs
**What goes wrong:** After running 3 Anthropic calls back-to-back (all 3 harnesses), the 4th call (first OpenAI) may succeed but the 4th Anthropic judge call may hit rate limits since the judge always uses Anthropic.
**Why it happens:** The judge model is always `anthropic/claude-sonnet-4-6` regardless of the subject model. 9 runs = 9 judge calls, all hitting Anthropic API.
**How to avoid:** Sequential execution with natural delays between runs (~45s per run) provides sufficient spacing. No artificial sleep needed. Monitor Anthropic rate limit errors in retry logic.
**Warning signs:** Judge calls consistently failing for runs 4-9; subject model calls succeed but eval fails.

### Pitfall 6: readline Blocking on Non-TTY Stdin
**What goes wrong:** If `run-reference.ts` is piped (e.g., `echo "y" | npm run reference`) or called from CI, the readline prompt may hang.
**Why it happens:** readline's `question()` requires TTY input.
**How to avoid:** Check `process.stdin.isTTY` before using readline. If not TTY and `--dry-run` not set, either auto-proceed or exit with error.
**Warning signs:** Script hangs without output in automated environments.

### Pitfall 7: `@google/generative-ai` vs `@google/genai`
**What goes wrong:** Code that imports from `@google/generative-ai` fails — that package is EOL as of August 31, 2025.
**Why it happens:** Search results and tutorials still reference the old package name.
**How to avoid:** The project already uses `@google/genai` correctly. In `run-reference.ts`, there are no direct Google SDK calls (everything goes through subprocess), but document this for any env var validation in `--dry-run`.
**Warning signs:** Import errors referencing `@google/generative-ai`.

---

## Code Examples

Verified patterns from existing codebase:

### Spawning the benchmark CLI (from re-eval.ts pattern)
```typescript
// Source: Node.js child_process built-in
import { spawn } from "child_process";

// Invoke tsx src/bin.ts the same way package.json "benchmark" script does
function runBenchmarkProcess(harness: string, model: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(
      "tsx",
      ["src/bin.ts", "--harness", harness, "--model", model],
      { stdio: "inherit", env: process.env, cwd: process.cwd() }
    );
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", (err) => {
      console.error(`Spawn error: ${err.message}`);
      resolve(1);
    });
  });
}
```

### Clearing results/ (following fs/promises pattern from eval.ts)
```typescript
// Source: fs/promises — same module used in eval.ts and output.ts
import { readdir, rm, writeFile } from "fs/promises";
import { join } from "path";

async function clearResults(): Promise<void> {
  const resultsDir = join(process.cwd(), "results");
  const entries = await readdir(resultsDir);
  for (const entry of entries) {
    if (entry === "index.json") continue;
    await rm(join(resultsDir, entry), { recursive: true, force: true });
  }
  await writeFile(join(resultsDir, "index.json"), JSON.stringify([], null, 2), "utf-8");
  console.log("Cleared results/ and reset index.json");
}
```

### Reading index.json for verification (from eval.ts upsertIndex pattern)
```typescript
// Source: eval.ts upsertIndex() — same read pattern
import { readFile } from "fs/promises";
import type { IndexEntry } from "../src/eval.ts";

async function readIndex(indexPath: string): Promise<IndexEntry[]> {
  const raw = await readFile(indexPath, "utf-8");
  return JSON.parse(raw) as IndexEntry[];
}
```

### Script shebang/invocation (from validate-schemas.ts pattern)
```typescript
// Source: scripts/validate-schemas.ts — top-level await, no Commander, process.exit(1) on failure
// No shebang needed — invoked via "tsx scripts/run-reference.ts"
// Script-level try/catch at bottom:
try {
  await main();
} catch (err) {
  console.error("Reference run failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}
```

### package.json script entries (following existing pattern)
```json
{
  "scripts": {
    "validate": "tsx scripts/validate-schemas.ts",
    "benchmark": "tsx src/bin.ts",
    "reference": "tsx scripts/run-reference.ts",
    "verify-reference": "tsx scripts/verify-reference.ts"
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@google/generative-ai` | `@google/genai` | EOL August 31, 2025 | Already using correct package; no action needed |
| `zod-to-json-schema` | `z.toJSONSchema()` (Zod v4 native) | November 2025 (Zod v4 GA) | Already using Zod v4 native; no action needed |
| `responseSchema` for Google structured output | `responseJsonSchema` | `@google/genai` v1.9.0 | Already using `responseJsonSchema`; no action needed |

**Deprecated/outdated:**
- `@google/generative-ai`: EOL August 31, 2025 — do not import this; project already uses `@google/genai`
- `zod-to-json-schema` npm package: EOL November 2025 — project already uses `z.toJSONSchema()`

---

## Model ID Reference

These are the model strings registered in `harness.yaml` `providers` list and in `src/cost.ts` `PRICE_TABLE`. Use these exact strings for the 9 reference runs:

| Reference Label | Model String | Price Table Entry |
|----------------|--------------|------------------|
| Claude Sonnet | `anthropic/claude-sonnet-4-6` | `inputPerMTok: 3.00, outputPerMTok: 15.00` |
| GPT-4o | `openai/gpt-4o` | `inputPerMTok: 2.50, outputPerMTok: 10.00` |
| Gemini 1.5 Pro | `google/gemini-1.5-pro` | `inputPerMTok: 1.25, outputPerMTok: 5.00` |

**Cost note from `src/cost.ts`:** "Re-verify prices before committing reference runs in Phase 4. Prices are correct as of 2026-03-15 but may change." The planner should include a task to re-verify current prices against official pricing pages before running. The price table lives in `src/cost.ts` and is the single source of truth.

**Real token data from test runs (inventory-optimization + Claude Sonnet):**
- Input: 2359 tokens (consistent across all 4 test runs)
- Output: 3324-3449 tokens
- Latency: 42-46 seconds per run
- Cost per subject call: ~$0.057

**Estimated cost for all 9 reference runs (18 total calls = 9 subject + 9 judge):**
- Subject models: 3 harnesses × ~2500 in / ~3400 out
  - Anthropic (3 runs): 3 × ($0.0075 + $0.0765) = ~$0.252
  - OpenAI (3 runs): 3 × ($0.00625 + $0.034) = ~$0.121
  - Google (3 runs): 3 × ($0.003125 + $0.017) = ~$0.061
- Judge calls (9 × Anthropic Claude Sonnet): ~3500 in / 512 out × 9 = ~$0.117
- **Total estimate: ~$0.55 USD** (actual will vary by harness prompt length and model verbosity)

---

## Validation Architecture

nyquist_validation is enabled (`.planning/config.json` `workflow.nyquist_validation: true`).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `assert` (no framework — consistent with Phase 2-3 Wave 0 scripts) |
| Config file | None — scripts follow `tsx scripts/test-*.ts` convention |
| Quick run command | `tsx scripts/test-reference.ts` |
| Full suite command | `npm run verify-reference` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REF-01 | Nine result directories exist with scored JSON | smoke | `npm run verify-reference` | ❌ Wave 0 |
| REF-02 | Every meta.json contains all required manifest fields | smoke | `npm run verify-reference` | ❌ Wave 0 |
| REF-03 | `docs/judge-prompt.md` exists and matches eval engine usage | smoke | `npm run verify-reference` | ❌ Wave 0 |

**Note:** REF-01 through REF-03 are intrinsically integration/smoke requirements — they verify the results of real LLM runs. Unit tests (mocking subprocess calls) are impractical for the actual run orchestration. `verify-reference.ts` IS the test for all three requirements.

### Sampling Rate
- **Per task commit:** `npm run verify-reference` (smoke — confirms index.json state is valid)
- **Per wave merge:** `npm run verify-reference` + manual review of one scored JSON per harness
- **Phase gate:** Full 9-entry verification pass before any git commit

### Wave 0 Gaps
- [ ] `scripts/verify-reference.ts` — covers REF-01, REF-02, REF-03 (the primary verification artifact)
- [ ] `scripts/run-reference.ts` — orchestrator that produces the reference artifacts
- [ ] `package.json` entries: `"reference"` and `"verify-reference"` scripts

---

## Open Questions

1. **GPT-4o structured output compatibility with zodResponseFormat**
   - What we know: `src/providers/openai.ts` uses `client.beta.chat.completions.parse` with `zodResponseFormat`. This worked in Phase 2 testing.
   - What's unclear: Whether `gpt-4o` (latest alias) accepts all three harness schemas (especially the nested `financial-forecasting` schema with 6 sub-fields).
   - Recommendation: The `--dry-run` flag will validate harness loading but not provider compatibility. First real run should be `pricing-strategy + openai/gpt-4o` as a canary. If schema failure occurs, investigate schema complexity.

2. **Gemini 1.5 Pro `responseJsonSchema` behavior on nested schemas**
   - What we know: `src/providers/google.ts` uses `responseJsonSchema` (per `@google/genai` v1.9.0+). This is the correct API per the code comments and Phase 2 decisions.
   - What's unclear: Gemini 1.5 Pro may be less reliable on complex nested schemas vs. simpler flat schemas. A `schema_valid: false` result is possible for some harnesses.
   - Recommendation: This is expected and acceptable per the quality gate decision — no minimum score, only `schema_valid: true` is required. If Gemini fails schema validation after retry, it is logged as FAILED in the summary. Budget time for potential re-investigation.

3. **Cost table currency**
   - What we know: `src/cost.ts` notes prices were verified 2026-03-15 and recommends re-verification before Phase 4 runs.
   - What's unclear: Whether OpenAI GPT-4o or Gemini 1.5 Pro pricing has changed since March 2026-03-15.
   - Recommendation: Include a task to verify current prices from official pages before running. Update `src/cost.ts` if needed.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/cli.ts`, `src/bin.ts`, `src/eval.ts`, `src/output.ts`, `src/cost.ts`, `src/types.ts`, `src/providers/*.ts` — full understanding of existing pipeline
- Direct code inspection: `scripts/re-eval.ts`, `scripts/validate-schemas.ts` — prior art patterns for new scripts
- Direct file inspection: `results/index.json`, `results/*/meta.json` — actual token counts and cost data from real test runs
- Direct file inspection: `harnesses/inventory-optimization/harness.yaml` — confirmed model strings and judge model
- Direct file inspection: `docs/judge-prompt.md` — confirmed published, v1.0.0, covers REF-03
- Direct file inspection: `.planning/config.json` — confirmed `nyquist_validation: true`

### Secondary (MEDIUM confidence)
- `package.json` dependencies — confirmed tsx 4.15.0, no test framework present (validates Node built-in assert pattern)
- Node.js `child_process`, `readline`, `fs/promises` documentation — built-in APIs with stable interfaces

### Tertiary (LOW confidence)
- Token count estimates for pricing-strategy and financial-forecasting harnesses — extrapolated from inventory-optimization test runs; actual token counts will differ by harness complexity

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tooling is built-in Node.js or existing project deps
- Architecture: HIGH — directly derived from existing `re-eval.ts` and `validate-schemas.ts` patterns in the codebase
- Pitfalls: HIGH — identified from direct code inspection of eval.ts (schema_valid: false path), output.ts (index.json write), and provider adapters
- Cost estimates: MEDIUM — extrapolated from actual test run data; different harnesses will produce different token counts

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable Node.js APIs; model pricing may shift sooner — re-verify prices before running)
