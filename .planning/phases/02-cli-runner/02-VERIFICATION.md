---
phase: 02-cli-runner
verified: 2026-03-16T15:30:00Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Phase 2: CLI Runner Verification Report

**Phase Goal:** A working `benchmark` CLI that loads a harness, renders a prompt with real data, calls one LLM provider, and writes raw output to disk
**Verified:** 2026-03-16T15:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Running `benchmark --harness inventory-optimization --model anthropic/claude-sonnet-4-6` completes without error and writes a file to `results/<run-id>/raw/<model-slug>.json` | VERIFIED | Run `e84a55fa-d8fd-4134-b46a-6420bf27bf0f` exists; `results/e84a55fa-d8fd-4134-b46a-6420bf27bf0f/raw/anthropic--claude-sonnet-4-6.json` confirmed present with valid JSON output (`summary`, `recommendations`, `data_gaps` top-level keys) |
| 2 | The run manifest at `results/<run-id>/meta.json` contains: model id, provider API version, temperature, max_tokens, input tokens, output tokens, cost USD, latency ms | VERIFIED | `meta.json` confirmed to contain all 12 required fields: `run_id`, `harness`, `harness_version`, `model`, `provider_api_version`, `temperature`, `max_tokens`, `input_tokens`, `output_tokens`, `cost_usd`, `latency_ms`, `run_date` |
| 3 | The runner uses the provider's native structured output mechanism (Anthropic tool use for the Anthropic provider) | VERIFIED | `src/providers/anthropic.ts` line 21: `tool_choice: { type: "tool", name: "structured_output" }` — forced tool use, not `output_config.format`. OpenAI uses `zodResponseFormat` + `beta.chat.completions.parse`. Google uses `responseMimeType: "application/json"` with `responseJsonSchema`. |
| 4 | The prompt rendered by the runner is deterministic — running the same harness twice produces identical prompt text | VERIFIED | Programmatic test: two sequential calls to `loadHarness('inventory-optimization')` return identical `renderedPrompt` strings. CSV files are read with `readFileSync` and injected via deterministic `string.replace()`. |

**Score: 4/4 truths verified**

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types.ts` | Shared TypeScript contracts (HarnessSpec, RunOptions, RunResult, BenchmarkOptions) | VERIFIED | All 4 interfaces exported. Imported by `harness.ts`, `providers/index.ts`, `providers/anthropic.ts`, `providers/openai.ts`, `providers/google.ts`, `cli.ts`. |
| `src/harness.ts` | YAML loader, CSV injector, prompt renderer, system/user splitter | VERIFIED | Exports `loadHarness` and `splitPrompt`. Uses `js-yaml` for YAML parsing, `readFileSync` for CSV injection, validates no remaining `{{` placeholders, asserts separator present. |
| `src/cost.ts` | Hardcoded price table and cost calculation | VERIFIED | Exports `calculateCost`. Correct values: anthropic=18.00, openai=12.50, google=6.25, unknown=-1 (sentinel). Confirmed by live execution. |
| `src/output.ts` | Writes raw output and meta.json to `results/<run-id>/` | VERIFIED | Exports `writeResults`. Creates `results/<runId>/raw/<modelSlug>.json` and `results/<runId>/meta.json`. Imports and uses `calculateCost` from `./cost.ts`. |
| `src/providers/index.ts` | Provider dispatcher: routes by model prefix, exports `runProvider` | VERIFIED | Exports `runProvider`. Routes `anthropic/` → `runAnthropic`, `openai/` → `runOpenAI`, `google/` → `runGoogle`. Throws for unknown prefix. Uses dynamic `import()`. |
| `src/providers/anthropic.ts` | Anthropic adapter using tool use structured output | VERIFIED | Exports `runAnthropic`. Uses `client.messages.create` with `tools` array and `tool_choice: { type: "tool", name: "structured_output" }`. Returns `RunResult`. |
| `src/providers/openai.ts` | OpenAI adapter using zodResponseFormat | VERIFIED | Exports `runOpenAI`. Uses `client.beta.chat.completions.parse` with `zodResponseFormat`. Returns `RunResult`. |
| `src/providers/google.ts` | Google adapter using @google/genai responseMimeType | VERIFIED | Exports `runGoogle`. Uses `GoogleGenAI` from `@google/genai`. Sets `responseMimeType: "application/json"` and `responseJsonSchema`. Uses `responseJsonSchema` (not `responseSchema`) per @google/genai v1.9.0+ API. |
| `src/cli.ts` | runBenchmark orchestration: harness load, schema import, provider call, output write | VERIFIED | Exports `runBenchmark`. Sequences: loadHarness → splitPrompt → dynamic schema import → runProvider → writeResults. All 6 pipeline steps present and wired. |
| `src/bin.ts` | Commander CLI entry point with shebang | VERIFIED | Shebang `#!/usr/bin/env node` present. `--harness` and `--model` are `requiredOption`. Imports and calls `runBenchmark`. `npx tsx src/bin.ts --help` confirms usage output. |
| `scripts/test-render.ts` | RUN-02 unit test — prompt renderer | VERIFIED | Exit 0 confirmed. Tests no `{{` placeholders remain and separator present. |
| `scripts/test-routing.ts` | RUN-03 unit test — provider routing | VERIFIED | Exit 0 confirmed. Tests all 3 provider prefixes and unknown-prefix throw. |
| `scripts/test-meta.ts` | RUN-06 unit test — meta.json field presence | VERIFIED | Exit 0 confirmed. Tests all 12 required fields. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/bin.ts` | `src/cli.ts` | `import { runBenchmark }` | WIRED | Line 3: `import { runBenchmark } from "./cli.ts"`. Used in `.action()` handler. |
| `src/cli.ts` | `src/harness.ts` | `loadHarness + splitPrompt` | WIRED | Line 4: `import { loadHarness, splitPrompt } from "./harness.ts"`. Both used in `runBenchmark`. |
| `src/cli.ts` | `src/providers/index.ts` | `runProvider` | WIRED | Line 5: `import { runProvider } from "./providers/index.ts"`. Called with full model string and RunOptions. |
| `src/cli.ts` | `src/output.ts` | `writeResults` | WIRED | Line 6: `import { writeResults } from "./output.ts"`. Called with all 12 required fields. |
| `src/cli.ts` | `harnesses/*/schema.ts` | dynamic `import()` + `z.toJSONSchema()` | WIRED | `loadHarnessSchema` uses `await import(schemaPath)`, finds first `z.ZodType` export, calls `z.toJSONSchema()`. |
| `src/output.ts` | `src/cost.ts` | `calculateCost` import | WIRED | Line 11: `import { calculateCost } from "./cost.ts"`. Used in `meta.cost_usd` field. |
| `src/harness.ts` | `harnesses/*/harness.yaml` | `yaml.load()` + `readFileSync` | WIRED | Uses `yaml.load(readFileSync(..., "utf-8"))`. Confirmed working: smoke test run resolved inventory-optimization harness. |
| `src/providers/index.ts` | `src/providers/anthropic.ts` | dynamic `import("./anthropic.js")` | WIRED | Line 7: `await import("./anthropic.js")`. Routes `anthropic/` prefix. |
| `src/providers/index.ts` | `src/providers/openai.ts` | dynamic `import("./openai.js")` | WIRED | Line 10: `await import("./openai.js")`. Routes `openai/` prefix. |
| `src/providers/index.ts` | `src/providers/google.ts` | dynamic `import("./google.js")` | WIRED | Line 13: `await import("./google.js")`. Routes `google/` prefix. |
| All providers | `src/types.ts` | TypeScript imports | WIRED | `RunOptions`, `RunResult` imported in all 3 adapter files. `HarnessSpec` imported in `harness.ts`. `BenchmarkOptions` imported in `cli.ts`. |

---

## Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|----------|
| RUN-01 | 02-01, 02-04 | User can execute `benchmark --harness <name> --model <provider/model-id>` as a single command | SATISFIED | `src/bin.ts` uses Commander with `requiredOption` for both flags. Smoke test run confirmed exit 0. `package.json` has `"benchmark": "tsx src/bin.ts"` script and `bin.benchmark` entry. |
| RUN-02 | 02-01, 02-02, 02-04 | Runner loads harness spec, injects CSV data into prompt template, and calls the specified LLM provider | SATISFIED | `loadHarness()` in `src/harness.ts` reads `harness.yaml`, injects CSV content via `{{inject_as}}` replacement. `splitPrompt()` splits system/user. Full pipeline verified in smoke test. |
| RUN-03 | 02-01, 02-03, 02-04 | Runner supports three providers: Anthropic, OpenAI, Google | SATISFIED | `src/providers/index.ts` routes by prefix. All three adapter files exist and compile. `test-routing.ts` exits 0. |
| RUN-04 | 02-03 | Runner uses each provider's native structured output mechanism | SATISFIED | Anthropic: `tool_choice: { type: "tool" }` forced tool use. OpenAI: `zodResponseFormat` + `beta.chat.completions.parse`. Google: `responseMimeType: "application/json"` + `responseJsonSchema`. |
| RUN-05 | 02-02, 02-04 | Runner writes raw output to `results/<run-id>/raw/<model-slug>.json` | SATISFIED | `src/output.ts` creates `results/<runId>/raw/<modelSlug>.json`. Confirmed: `results/e84a55fa-d8fd-4134-b46a-6420bf27bf0f/raw/anthropic--claude-sonnet-4-6.json` exists. |
| RUN-06 | 02-01, 02-02, 02-04 | Runner writes run manifest to `results/<run-id>/meta.json` with all required fields | SATISFIED | `src/output.ts` writes 12-field manifest. Live `meta.json` confirms: `run_id`, `harness`, `harness_version`, `model`, `provider_api_version`, `temperature`, `max_tokens`, `input_tokens`, `output_tokens`, `cost_usd`, `latency_ms`, `run_date`. |

**Orphaned requirements check:** REQUIREMENTS.md maps RUN-01 through RUN-06 to Phase 2 only. All 6 are claimed by Phase 2 plans and verified above. No orphaned requirements.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | No anti-patterns detected |

Notes:
- The word "placeholder" appears in `src/harness.ts` comments and error messages but refers to the `{{variable}}` template syntax the harness uses — this is intentional domain language, not a stub indicator.
- No `TODO`, `FIXME`, `XXX`, or `HACK` comments in any source file.
- No `return null`, `return {}`, or `return []` stub patterns.
- No `console.log`-only implementations in provider files.

---

## Human Verification Required

### 1. OpenAI and Google Provider Live Runs

**Test:** Run `npx tsx src/bin.ts --harness inventory-optimization --model openai/gpt-4o` and `npx tsx src/bin.ts --harness inventory-optimization --model google/gemini-1.5-pro`
**Expected:** Both complete exit 0, write `results/<run-id>/raw/<model-slug>.json` and `results/<run-id>/meta.json`, raw output JSON contains `summary`, `recommendations`, `data_gaps` top-level keys
**Why human:** RUN-03 and RUN-04 are verified structurally (code reads correctly) but live execution against OpenAI and Google APIs was not confirmed in Phase 2. The Anthropic smoke test confirmed the pipeline end-to-end; OpenAI and Google adapters were not smoke-tested in Plan 02-04 (only Anthropic was). Structural verification confirms the code is correct, but live API behavior needs a human to validate.

---

## Gaps Summary

No gaps. All 4 success criteria from ROADMAP.md are verified. All 6 requirements (RUN-01 through RUN-06) are satisfied with implementation evidence. All artifacts exist, are substantive (real implementations, not stubs), and are wired. The phase goal is achieved.

The single human verification item (OpenAI and Google live runs) is noted but does not block the phase goal, which specifies "calls one LLM provider" — Anthropic was the confirmed provider in the smoke test.

---

## Commit Verification

Commits documented in summaries confirmed in git log:
- `df2ee17` — chore(02-01): install dependencies
- `f8eac64` — feat(02-01): src/types.ts
- `67edd23` — test(02-01): Wave 0 test scripts
- `1a8633f` — feat(02-cli-runner-02): src/harness.ts
- `5fc9561` — feat(02-cli-runner-02): src/cost.ts and src/output.ts
- `4778e78` — feat(02-03): src/providers/index.ts
- `0e0aa4a` — feat(02-03): provider adapters (anthropic, openai, google)
- `7ebb9db` — feat(02-cli-runner-04): src/cli.ts and src/bin.ts
- `947990c` — feat(02-cli-runner-04): end-to-end smoke test verified

---

_Verified: 2026-03-16T15:30:00Z_
_Verifier: Claude (gsd-verifier)_
