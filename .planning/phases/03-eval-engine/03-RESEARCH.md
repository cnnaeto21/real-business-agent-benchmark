# Phase 3: Eval Engine - Research

**Researched:** 2026-03-16
**Domain:** LLM-as-judge evaluation pipeline, Zod schema validation, file-based index management, Anthropic SDK direct text calls
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Eval runs automatically at the end of every `benchmark` CLI run — no separate command
- If judge API call fails: write raw output and meta.json successfully, log scoring error to stderr, exit code 0. Raw/ directory exists without scored/. Preserves the expensive model API call.
- CLI prints scores inline after a successful scored run:
  ```
  Scores: Actionability 4/5 · Reasoning 3/5 · Completeness 5/5
  Composite: 80/100
  ```
- `--no-eval` flag skips scoring for the run (useful for smoke tests / debugging without burning judge credits). Raw output and meta.json still written.
- Zod `safeParse` failure → score 0 across all dimensions, composite 0/100
- Written to `results/<run-id>/scored/<model-slug>.json` like a normal result (no special status field)
- `validation_error` field included in scored output with the Zod error message
- `schema_valid: false` flag set in scored output and index.json entry
- If judge returns malformed JSON (not matching score schema): retry once, then treat as judge API failure (raw saved, scored/ not written)
- index.json is a flat array, deduplicated by run_id (re-scoring replaces existing entry)
- Each index entry shape:
  ```json
  {
    "run_id": "...",
    "harness": "inventory-optimization",
    "harness_version": "1.0.0",
    "model": "anthropic/claude-sonnet-4-6",
    "composite_score": 80,
    "scores": {
      "actionability": { "score": 4, "rationale": "..." },
      "reasoning_transparency": { "score": 3, "rationale": "..." },
      "completeness": { "score": 5, "rationale": "..." }
    },
    "schema_valid": true,
    "cost_usd": 0.057537,
    "latency_ms": 45215,
    "run_date": "2026-03-16T14:50:26.544Z"
  }
  ```
- Rationale strings included per dimension in index.json (enables dashboard hover tooltips without second file read)
- `harness_version` included for traceability
- Replace existing entry when same run_id is re-scored (deduplicated, not append)
- Judge prompt at `docs/judge-prompt.md` with `{{model_output}}` and `{{rubric}}` placeholders
- Composite formula: `(actionability + reasoning_transparency + completeness) / 3 * 20` → 0-100
- Judge model: `anthropic/claude-sonnet-4-6` at temperature 0

### Claude's Discretion

- How the judge is called (direct Anthropic SDK call vs. reusing the provider adapter — note: provider adapter uses tool use, judge needs plain text JSON response, so likely a direct call)
- File locking strategy for concurrent index.json writes
- Exact Zod schema for validating the judge's response (score + rationale per dimension)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EVAL-01 | Eval engine validates raw output against the harness output schema (Zod safeParse) — first scoring gate | Zod `safeParse` pattern confirmed; `zodSchema` is already loaded in `cli.ts` and can be passed through |
| EVAL-03 | Judge scores on 3 dimensions: actionability, reasoning transparency, completeness (each 1-5) | Judge prompt already locks this contract in `docs/judge-prompt.md` |
| EVAL-04 | Judge returns structured JSON with score + rationale per dimension | Direct Anthropic text-mode call pattern identified; Zod schema for judge response documented |
| EVAL-05 | Eval engine computes composite score (unweighted average, normalized 0-100) | Formula locked: `(a + rt + c) / 3 * 20` |
| EVAL-06 | Eval engine writes scored result to `results/<run-id>/scored/<model-slug>.json` | `writeResults` pattern from `src/output.ts` confirmed; `mkdir({ recursive: true })` + `writeFile` |
| EVAL-07 | Eval engine updates `results/index.json` after each run | Read-modify-write with deduplication by `run_id`; file locking strategy documented below |
</phase_requirements>

---

## Summary

Phase 3 adds a scoring layer that runs immediately after `writeResults` in `src/cli.ts`. The pipeline is linear: (1) validate raw output with Zod `safeParse`, (2) call the Anthropic judge with a direct `messages.create` call (no tool use — plain text response expected), (3) parse and validate the judge's JSON response with a second Zod schema, (4) compute composite score, (5) write `results/<run-id>/scored/<model-slug>.json`, and (6) upsert `results/index.json`.

The key architectural distinction from Phase 2 provider adapters is that the judge call must use a **plain text** Anthropic request (no `tools` / `tool_choice`) and parse `response.content[0].text` as JSON. The provider adapters use tool use to force structured output; the judge prompt instructs the model to return JSON inline in text, which is how the judge was designed (`docs/judge-prompt.md` says "Return valid JSON only. Do not add any text before or after the JSON object.").

All decisions are tightly specified in CONTEXT.md. The implementation fits cleanly into existing patterns. The primary discretionary choices are: (a) how to call the judge (direct SDK, confirmed as the right approach), (b) file locking for concurrent `index.json` writes (discussed below), and (c) the Zod schema validating the judge's response.

**Primary recommendation:** Create `src/eval.ts` as the eval engine module, called from `src/cli.ts` after `writeResults`. The `--no-eval` flag threads through `BenchmarkOptions` to `bin.ts`. The judge is called via a dedicated `callJudge` function that uses direct `client.messages.create` without tools.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | 0.78.0 (already installed) | Direct judge API call | Already in use; plain `messages.create` for text-mode response |
| `zod` | 4.3.6 (already installed) | Validate harness raw output + validate judge JSON response | Already used throughout project; `safeParse` is the correct gate |
| `fs/promises` | Node built-in | Write scored/ files and read/write index.json | Already used in `src/output.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `path` (Node built-in) | - | Path construction for scored/ and index.json | Same pattern as `src/output.ts` |
| `crypto` (Node built-in) | - | Not needed in eval — `runId` already generated in `cli.ts` | - |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct `client.messages.create` (plain text) | Reuse provider adapter + tool use | Provider adapter forces tool_choice; judge prompt returns inline JSON — tool use would break the judge's output contract |
| Read-modify-write `index.json` (in-process) | SQLite, file DB | Over-engineered for single-writer benchmark runs; no concurrent writes in Phase 3 scope |
| `proper-lockfile` npm package | Manual lock file | For Phase 3 (sequential single-process runs) a try/catch read-modify-write is sufficient; lockfile library is a Phase 4+ concern if parallel ref runs are added |

**Installation:** No new dependencies required. All needed libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── eval.ts          # NEW: eval engine module (runEval, callJudge, writeScored, upsertIndex)
├── cli.ts           # MODIFIED: import runEval, call after writeResults, add --no-eval threading
├── bin.ts           # MODIFIED: add --no-eval Commander option
├── types.ts         # MODIFIED: add noEval to BenchmarkOptions; add EvalResult type
├── output.ts        # UNCHANGED
├── harness.ts       # UNCHANGED
├── cost.ts          # UNCHANGED
└── providers/       # UNCHANGED
```

### Pattern 1: Judge Call — Direct Anthropic Text Mode

**What:** Call `client.messages.create` without `tools` / `tool_choice`. The model responds with text content containing raw JSON. Extract `response.content[0].text` and JSON.parse it.

**When to use:** Any time the judge prompt instructs the model to return JSON in the message body (not via tool use). The existing provider adapters use tool use for structured output — the judge is different because the prompt itself defines the output format contract.

**Example:**
```typescript
// Source: @anthropic-ai/sdk v0.78.0, src/providers/anthropic.ts (modified for text mode)
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const response = await client.messages.create({
  model: "claude-sonnet-4-6",     // modelId without prefix
  max_tokens: 512,                 // judge response is small; 512 is sufficient
  temperature: 0,
  messages: [{ role: "user", content: judgePrompt }],
  // NO tools, NO tool_choice — judge returns inline JSON text
});

const textBlock = response.content.find((b) => b.type === "text");
if (!textBlock || textBlock.type !== "text") {
  throw new Error("Judge response did not contain text block");
}
const rawJson = textBlock.text;
```

**Key difference from provider adapters:** Provider adapters use `tool_choice: { type: "tool", name: "structured_output" }` and extract `toolBlock.input`. The judge call has no `tools` field and reads `textBlock.text`.

### Pattern 2: Judge Response Zod Schema

**What:** Define a Zod schema to validate the parsed judge JSON. `safeParse` the judge response — if it fails, attempt a retry (once), then treat as judge failure.

**Example:**
```typescript
// Source: Zod v4 native API, confirmed in project (Phase 1 decision)
import { z } from "zod";

const DimensionScore = z.object({
  score: z.number().int().min(1).max(5),
  rationale: z.string().min(1),
});

const JudgeResponse = z.object({
  actionability: DimensionScore,
  reasoning_transparency: DimensionScore,
  completeness: DimensionScore,
});

export type JudgeResponseType = z.infer<typeof JudgeResponse>;
```

**Note:** The judge prompt uses `reasoning_transparency` (with underscore). Confirm this matches the key in `docs/judge-prompt.md` (it does — checked line 57: `"reasoning_transparency": {...}`).

### Pattern 3: Composite Score Formula

**What:** Normalize three 1-5 dimension scores to 0-100.

```typescript
// Source: CONTEXT.md "Composite formula locked"
function computeComposite(scores: JudgeResponseType): number {
  const avg = (scores.actionability.score + scores.reasoning_transparency.score + scores.completeness.score) / 3;
  return Math.round(avg * 20);
}
// Examples: all-5 → 100, all-3 → 60, all-1 → 20, mixed 4/3/5 → Math.round(4 * 20) = 80
```

### Pattern 4: index.json Read-Modify-Write with Deduplication

**What:** Read existing index.json (empty array if missing), filter out any entry with matching `run_id`, append new entry, write back.

```typescript
// Source: Node fs/promises pattern, established in src/output.ts
import { readFile, writeFile } from "fs/promises";

async function upsertIndex(indexPath: string, entry: IndexEntry): Promise<void> {
  let entries: IndexEntry[] = [];
  try {
    const raw = await readFile(indexPath, "utf-8");
    entries = JSON.parse(raw) as IndexEntry[];
  } catch {
    // File does not exist yet — start with empty array
  }
  // Deduplicate: remove existing entry with same run_id
  entries = entries.filter((e) => e.run_id !== entry.run_id);
  entries.push(entry);
  await writeFile(indexPath, JSON.stringify(entries, null, 2), "utf-8");
}
```

**File locking:** Phase 3 runs are sequential (single CLI process per invocation). Concurrent writes are not a realistic concern in Phase 3. The simple read-modify-write is sufficient. If Phase 4 introduces parallel reference runs as parallel processes, a `proper-lockfile` or advisory lock can be added then.

### Pattern 5: Schema Validation Failure → Zero Score

**What:** When Zod `safeParse` of the raw output returns `success: false`, skip the judge call and construct a zero-score result directly.

```typescript
const parseResult = zodSchema.safeParse(rawOutput);
if (!parseResult.success) {
  const validationError = parseResult.error.message;
  return {
    schema_valid: false,
    validation_error: validationError,
    scores: {
      actionability: { score: 0, rationale: "Schema validation failed" },
      reasoning_transparency: { score: 0, rationale: "Schema validation failed" },
      completeness: { score: 0, rationale: "Schema validation failed" },
    },
    composite_score: 0,
  };
}
```

**Note:** Scores of 0 are outside the 1-5 rubric range. This is intentional — a validation failure is not a scored run, it is a failed run. The JudgeResponse Zod schema enforces `min(1)` for judge-scored results, but the scored output file accepts 0 as a special value indicating schema failure.

### Pattern 6: CLI Integration — Threading --no-eval

**What:** Add `--no-eval` flag in `bin.ts`, pass through `BenchmarkOptions`, check in `cli.ts` before calling `runEval`.

```typescript
// bin.ts addition
.option("--no-eval", "Skip scoring (raw output and meta.json still written)")

// BenchmarkOptions in types.ts addition
noEval?: boolean;

// cli.ts — after writeResults
if (!opts.noEval) {
  await runEval({ runDir, runId, harnessName, rawOutput, modelSlug, spec, meta });
}
```

**Commander note:** `--no-eval` uses Commander's boolean negation convention. Commander automatically sets `options.eval = false` when `--no-eval` is passed, but since we want explicit opt-out, use `options.noEval` by naming the option `--no-eval` without a corresponding positive `--eval`. Alternatively, use `--skip-eval` to avoid Commander's negation behavior. Verify which naming works cleanly in Commander v14.

### Anti-Patterns to Avoid

- **Using tool use for the judge call:** The provider adapters use tool use, but the judge prompt returns inline JSON text. Mixing them would require a different output_schema and would override the judge's carefully designed prompt format.
- **Throwing on judge failure:** Judge failures should be caught, logged to stderr, and the run exits 0. The expensive subject model call has already completed — don't lose it.
- **Appending to index.json without deduplication:** Re-scoring a run must replace the existing entry. Always filter by `run_id` before pushing.
- **Storing judge prompt path hardcoded in eval.ts:** The judge prompt path (`docs/judge-prompt.md`) should be a constant or derived from `process.cwd()`, not hardcoded as an absolute path.
- **Blocking the composite on individual score out-of-range:** Zod validates 1-5 for judge-returned scores. If a judge response has a score of 0 or 6, it should fail the Zod parse and trigger the retry/failure path — don't silently clip it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON parsing with error recovery | Custom try/catch JSON parser | Native `JSON.parse` + Zod `safeParse` | JSON.parse handles all valid JSON; Zod validates structure |
| Retrying judge on failure | Custom retry loop with backoff | Single retry (once) per CONTEXT.md spec — no backoff needed in Phase 3 | The spec says retry once; full backoff adds complexity without spec requirement |
| Token counting for judge | Custom tokenizer | Use `response.usage.input_tokens` / `output_tokens` from SDK response | The SDK provides accurate counts |
| File locking | Custom lock file mechanism | None needed for Phase 3 (sequential runs) | Premature optimization; add `proper-lockfile` only if Phase 4 requires parallel runs |

---

## Common Pitfalls

### Pitfall 1: Commander --no-eval Negation Behavior

**What goes wrong:** Commander v14 treats `--no-X` as a boolean negation of `--X`. If you declare `.option("--no-eval", ...)`, Commander sets `options.eval = false` (not `options.noEval`). This can cause the option to not thread through as expected.

**Why it happens:** Commander has built-in boolean-flag negation conventions.

**How to avoid:** Use `--skip-eval` to avoid the negation behavior, OR check that `options.eval` (not `options.noEval`) carries the value when using `--no-eval`. Verify in a quick test before implementing the full integration.

**Warning signs:** `opts.noEval` is always `undefined`; the flag appears to have no effect.

### Pitfall 2: Judge Response as Text vs. Tool Input

**What goes wrong:** Copying the Anthropic provider adapter pattern (which reads `toolBlock.input`) for the judge call. The judge call has no tool use — `response.content` will contain a `TextBlock`, not a `ToolUseBlock`.

**Why it happens:** The adapter pattern is prominent in the codebase and the reflex is to reuse it.

**How to avoid:** In the judge call, use `.find((b) => b.type === "text")` and read `.text` property. No `input_schema`, no `tool_choice`.

**Warning signs:** `toolBlock` is `undefined`; the judge function throws "Judge response did not contain expected tool_use block".

### Pitfall 3: Zod v4 Error Message Format

**What goes wrong:** Calling `.message` on a Zod v4 parse error and getting an unexpected format or undefined.

**Why it happens:** Zod v4 `safeParse` returns `error.issues` (array) not a single `.message` string. The human-readable string requires `error.message` which Zod v4 still supports on the `ZodError` object, but the format changed between v3 and v4.

**How to avoid:** Use `parseResult.error.message` (string) for the `validation_error` field stored in the scored output. Alternatively use `JSON.stringify(parseResult.error.issues)` for maximum detail. Confirm with the existing `validate-schemas.ts` script which approach is used.

**Warning signs:** `validation_error` field is `"[object Object]"` in scored output.

### Pitfall 4: index.json Corruption on Concurrent Writes

**What goes wrong:** Two benchmark runs started in the same second (e.g., during Phase 4 parallel reference runs) both read the same `index.json`, both modify in memory, both write — one write wins, one is lost.

**Why it happens:** Read-modify-write is not atomic.

**How to avoid:** For Phase 3 (sequential single-process runs), this is not an issue. Document it as a known limitation. If Phase 4 runs benchmarks in parallel (even in a shell loop), use `proper-lockfile` or serialize the index updates.

**Warning signs:** index.json has fewer entries than expected after running multiple benchmarks.

### Pitfall 5: rubric.md Path Resolution

**What goes wrong:** `spec.eval.rubric` is a relative path (e.g., `rubric.md`) and resolving it against `process.cwd()` works, but only if the CLI is invoked from the repo root (which it always is via `npm run benchmark`). A direct `tsx src/bin.ts` invocation from a different directory would fail.

**Why it happens:** The same pattern exists in `loadHarness` — it also resolves relative to `process.cwd()`.

**How to avoid:** Resolve the rubric path the same way `loadHarness` resolves data files: `join(process.cwd(), "harnesses", harnessName, spec.eval.rubric)`. The eval engine already receives `harnessName` from the CLI integration context.

---

## Code Examples

Verified patterns from project source:

### Calling Anthropic in Text Mode (judge call)

```typescript
// Pattern: direct messages.create without tools
// Derived from src/providers/anthropic.ts — adapted for text-mode output
// SDK: @anthropic-ai/sdk v0.78.0
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 512,
  temperature: 0,
  messages: [{ role: "user", content: judgePrompt }],
  // No tools, no tool_choice
});

const textBlock = response.content.find((b) => b.type === "text");
if (!textBlock || textBlock.type !== "text") {
  throw new Error("Judge response missing text block");
}
const judgeText = textBlock.text; // This is the raw JSON string
```

### Writing the Scored File

```typescript
// Pattern from src/output.ts — mkdir + writeFile
// Path: results/<run-id>/scored/<model-slug>.json
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const scoredDir = join(runDir, "scored");
await mkdir(scoredDir, { recursive: true });
await writeFile(
  join(scoredDir, `${modelSlug}.json`),
  JSON.stringify(scoredResult, null, 2),
  "utf-8"
);
```

### Judge Prompt Template Injection

```typescript
// Pattern matches existing harness template injection in src/harness.ts
import { readFile } from "fs/promises";
import { join } from "path";

const judgePromptTemplate = await readFile(
  join(process.cwd(), "docs", "judge-prompt.md"),
  "utf-8"
);

const rubricContent = await readFile(
  join(process.cwd(), "harnesses", harnessName, spec.eval.rubric),
  "utf-8"
);

const judgePrompt = judgePromptTemplate
  .replace("{{model_output}}", JSON.stringify(rawOutput, null, 2))
  .replace("{{rubric}}", rubricContent);
```

### Console Output Format

```typescript
// Inline score display — matches CONTEXT.md locked format
console.log(
  `\nScores: Actionability ${scores.actionability.score}/5 · ` +
  `Reasoning ${scores.reasoning_transparency.score}/5 · ` +
  `Completeness ${scores.completeness.score}/5`
);
console.log(`Composite: ${compositeScore}/100`);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `zod-to-json-schema` for JSON Schema | Zod v4 native `z.toJSONSchema()` | November 2025 (zod-to-json-schema EOL) | Already applied in Phase 2; don't import `zod-to-json-schema` |
| Tool use for all Anthropic structured output | Tool use for subject models; plain text for judge | Project decision | Judge prompt controls format contract — tool use not needed |

**Deprecated/outdated:**
- `zod-to-json-schema`: EOL November 2025. Project uses `z.toJSONSchema()` natively. Do not add this dependency.
- Anthropic `output_config.format` / `zodOutputFormat`: Not used in this project per Phase 2 decision. Eval engine follows the same constraint.

---

## Open Questions

1. **Commander --no-eval vs --skip-eval naming**
   - What we know: Commander v14 has boolean negation behavior for `--no-X` flags
   - What's unclear: Whether `--no-eval` with Commander v14.0.3 produces `options.eval = false` or `options.noEval = false`, and which needs to be threaded through `BenchmarkOptions`
   - Recommendation: Test with a quick `node -e` snippet during Wave 0 task. If Commander negation is awkward, use `--skip-eval` as the flag name instead (minor UX difference, avoids the negation issue).

2. **model_output injection format in judge prompt**
   - What we know: `{{model_output}}` is injected at runtime; `rawOutput` is the parsed JSON object from the provider
   - What's unclear: Whether to inject `JSON.stringify(rawOutput, null, 2)` (pretty) or `JSON.stringify(rawOutput)` (compact)
   - Recommendation: Use pretty-printed (`null, 2`) to maximize legibility for the judge model. The judge prompt wraps it in a code block anyway.

3. **Judge token cost tracking**
   - What we know: `meta.json` has `cost_usd` for the subject model run; index.json entry copies this value
   - What's unclear: Whether the judge's own token cost should be tracked separately
   - Recommendation: Not required in Phase 3 spec. The locked index.json shape does not include a judge cost field. Do not add it in Phase 3.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node built-in `assert` (no test framework — established in Phase 2) |
| Config file | none — scripts run directly with `tsx scripts/test-*.ts` |
| Quick run command | `tsx scripts/test-eval.ts` |
| Full suite command | `tsx scripts/test-meta.ts && tsx scripts/test-output.ts && tsx scripts/test-render.ts && tsx scripts/test-routing.ts && tsx scripts/test-eval.ts` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EVAL-01 | Zod `safeParse` returns `success: false` → composite 0, schema_valid false, validation_error set | unit | `tsx scripts/test-eval.ts` | ❌ Wave 0 |
| EVAL-03 | Judge scores 3 dimensions; all 3 present in scored output | unit (mock judge response) | `tsx scripts/test-eval.ts` | ❌ Wave 0 |
| EVAL-04 | Judge response parsed and validated by JudgeResponse Zod schema | unit (mock judge response) | `tsx scripts/test-eval.ts` | ❌ Wave 0 |
| EVAL-05 | Composite formula correct: (a+rt+c)/3*20 → expected values | unit | `tsx scripts/test-eval.ts` | ❌ Wave 0 |
| EVAL-06 | `results/<run-id>/scored/<model-slug>.json` created with correct shape | integration (filesystem) | `tsx scripts/test-eval.ts` | ❌ Wave 0 |
| EVAL-07 | `results/index.json` upserted: new entry added, re-score replaces existing | integration (filesystem) | `tsx scripts/test-eval.ts` | ❌ Wave 0 |

**Note on integration vs live API:** EVAL-03 and EVAL-04 should be tested with a mocked judge response (a hardcoded JSON string), not a live Anthropic API call. This keeps `test-eval.ts` fast and free. A live judge call can be exercised manually via the benchmark CLI but should not be required for the automated test suite.

### Sampling Rate
- **Per task commit:** `tsx scripts/test-eval.ts`
- **Per wave merge:** Full suite: all existing `test-*.ts` scripts plus `test-eval.ts`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `scripts/test-eval.ts` — covers EVAL-01, EVAL-03, EVAL-04, EVAL-05, EVAL-06, EVAL-07
  - Unit tests for `computeComposite`, schema validation failure path, JudgeResponse Zod schema parsing
  - Integration tests for `writeScored` (creates correct file) and `upsertIndex` (adds/replaces entries)
  - Uses mock judge JSON string — no live API call

---

## Sources

### Primary (HIGH confidence)
- `src/providers/anthropic.ts` (project source) — SDK call pattern, `content[0]` access, tool use shape
- `src/output.ts` (project source) — `mkdir({ recursive: true })` + `writeFile` pattern for result files
- `src/cli.ts` (project source) — integration point, `runBenchmark` structure, where eval hooks in
- `src/types.ts` (project source) — `HarnessSpec.eval` shape, `BenchmarkOptions` shape
- `docs/judge-prompt.md` (project source) — output contract: three dimensions, exact key names, JSON format
- `.planning/phases/03-eval-engine/03-CONTEXT.md` — all locked decisions
- `package.json` (project source) — `@anthropic-ai/sdk@0.78.0`, `zod@4.3.6`, no new deps needed
- `harnesses/inventory-optimization/harness.yaml` (project source) — `eval.rubric` relative path pattern

### Secondary (MEDIUM confidence)
- Phase 2 STATE.md decisions — `--no-eval` Commander option naming concern identified from Commander v14 behavior

### Tertiary (LOW confidence)
- None — all findings grounded in project source code

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already installed; no new dependencies
- Architecture: HIGH — integration points confirmed by reading actual source files
- Pitfalls: HIGH — most pitfalls derived directly from the existing codebase (tool use vs text mode, Commander negation, Zod v4 error format)
- Validation: HIGH — test patterns consistent with Phase 2 established approach (Node assert, tsx scripts/)

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (Anthropic SDK and Zod are stable; Commander v14 is stable)
