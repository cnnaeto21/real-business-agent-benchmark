# Phase 2: CLI Runner - Research

**Researched:** 2026-03-15
**Domain:** CLI tooling, multi-provider LLM SDKs, structured output APIs, cost tracking, file I/O
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RUN-01 | User can execute `benchmark --harness <name> --model <provider/model-id>` as a single command | Commander.js v14 — declarative flag definition, bin field in package.json, tsx shebang entry point |
| RUN-02 | Runner loads harness spec, injects CSV data into prompt template, and calls the specified LLM provider | js-yaml for harness.yaml parsing; fs.readFile for CSV + prompt; `{{variable}}` string replacement for deterministic injection |
| RUN-03 | Runner supports three providers: Anthropic (`anthropic/`), OpenAI (`openai/`), Google (`google/`) | @anthropic-ai/sdk, openai, @google/genai — all verified; provider routing by prefix |
| RUN-04 | Runner uses each provider's native structured output mechanism | Anthropic: tool use with `tool_choice: {type: "tool"}` + `z.toJSONSchema()`; OpenAI: `zodResponseFormat` in `beta.chat.completions.parse`; Google: `responseMimeType: "application/json"` + `responseSchema` |
| RUN-05 | Runner writes raw output to `results/<run-id>/raw/<model-slug>.json` | Node.js `fs/promises` mkdirSync + writeFile; run-id via `crypto.randomUUID()` (Node built-in); model-slug from CLI arg |
| RUN-06 | Runner writes run manifest to `results/<run-id>/meta.json` including: model id, provider API version, temperature, max_tokens, input tokens, output tokens, cost USD, latency ms | Token counts from SDK response usage objects; cost from hardcoded price table; latency from `Date.now()` diff; provider API version from request header constant |

</phase_requirements>

---

## Summary

Phase 2 builds the CLI executable that a user invokes with `benchmark --harness inventory-optimization --model anthropic/claude-sonnet-4-6`. The runner has five distinct responsibilities: (1) parse the CLI arguments, (2) load and validate the harness spec, (3) render the prompt by injecting CSV data into the template, (4) call the correct LLM provider using its native structured output mechanism, and (5) write the raw output and run manifest to disk.

The three provider SDKs each have distinct structured output APIs that cannot be unified behind a single interface without complexity. Anthropic uses tool use with a forced `tool_choice`; OpenAI uses `zodResponseFormat` with `beta.chat.completions.parse`; Google uses `responseMimeType` + `responseSchema`. The runner should implement a thin provider adapter pattern: one file per provider, a shared interface, and a dispatcher that routes by the `provider/` prefix in the model string.

**Important SDK note:** The `@google/generative-ai` package is legacy as of August 31, 2025. Use `@google/genai` (the unified SDK) instead. The `zod-to-json-schema` package (confirmed EOL) should not be used — the project already uses Zod v4 with `z.toJSONSchema()` natively.

**Primary recommendation:** Use Commander.js for CLI parsing, one adapter file per provider, `crypto.randomUUID()` for run IDs (no extra dependency), and `fs/promises` for all disk writes. Keep cost calculation in a hardcoded price table — it is a configuration concern, not a library problem.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `commander` | ^14.0.0 | CLI flag parsing | 119K npm dependents; built-in TypeScript types; declarative `.option()` API; zero runtime dependencies |
| `@anthropic-ai/sdk` | latest | Anthropic API client | Official SDK; exposes `usage.input_tokens`, `usage.output_tokens`, and `model` on every response |
| `openai` | latest | OpenAI API client | Official SDK; `zodResponseFormat` helper; `beta.chat.completions.parse` for structured output; `usage.prompt_tokens` + `usage.completion_tokens` |
| `@google/genai` | ^1.45.0 | Google Gemini API client | Official unified SDK (replaces legacy `@google/generative-ai`); `responseMimeType` + `responseSchema` structured output; `usageMetadata` for token counts |
| `js-yaml` | ^4.1.0 | YAML parsing | Parses `harness.yaml`; handles YAML edge cases (multiline strings, booleans, octal); already anticipated in Phase 1 research |
| `zod` | ^4.3.6 | Schema → JSON Schema | Already installed; `z.toJSONSchema()` generates `input_schema` for Anthropic tool use and `responseSchema` for Google |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tsx` | ^4.15.0 | Execute TypeScript entrypoint | Already installed; used for the `benchmark` bin shebang; enables `import` of `.ts` schema files |
| Node built-in `crypto` | N/A | Run ID generation | `crypto.randomUUID()` — no package needed; available since Node 14.17; produces RFC 4122 v4 UUIDs |
| Node built-in `fs/promises` | N/A | Async disk I/O | `mkdir`, `writeFile`; already available; no extra package |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `commander` | `yargs`, `minimist` | Commander has better TypeScript support and simpler API for this use case; minimist requires hand-rolling validation |
| `crypto.randomUUID()` | `nanoid`, `uuid` | Built-in Node crypto module is sufficient; no extra dependency for a simple run-ID |
| `@google/genai` | `@google/generative-ai` | The legacy package is EOL August 31, 2025 — do not use it |
| Hardcoded price table | External pricing API | Prices change rarely; hardcoded table with a comment citing the source date is simpler and offline-capable |

**Installation:**
```bash
npm install commander @anthropic-ai/sdk openai @google/genai js-yaml
npm install --save-dev @types/js-yaml
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli.ts              # Entry point: Commander setup, arg parse, orchestration
├── harness.ts          # harness.yaml loader + validator, CSV reader, prompt renderer
├── providers/
│   ├── index.ts        # Dispatcher: routes by "provider/" prefix to adapter
│   ├── anthropic.ts    # Anthropic adapter: tool use structured output
│   ├── openai.ts       # OpenAI adapter: zodResponseFormat structured output
│   └── google.ts       # Google adapter: responseMimeType structured output
├── output.ts           # Writes results/<run-id>/raw/ and meta.json
└── cost.ts             # Provider price table + cost calculation
results/                # Written at runtime — gitignored except reference runs
```

### Pattern 1: CLI Entry Point with Commander
**What:** Single command `benchmark` with `--harness` and `--model` flags, wired to a `tsx` shebang.
**When to use:** This is the only CLI entry point; all orchestration lives here.

```typescript
// Source: https://github.com/tj/commander.js/ (Commander.js v14 official README)
#!/usr/bin/env node
import { Command } from "commander";
import { runBenchmark } from "./cli.js";

const program = new Command();

program
  .name("benchmark")
  .description("Run a benchmark harness against an LLM provider")
  .requiredOption("--harness <name>", "Harness name (e.g. inventory-optimization)")
  .requiredOption("--model <provider/model-id>", "Model string (e.g. anthropic/claude-sonnet-4-6)")
  .option("--temperature <number>", "Sampling temperature", "0")
  .option("--max-tokens <number>", "Max output tokens", "4096")
  .action(async (options) => {
    await runBenchmark({
      harness: options.harness,
      model: options.model,
      temperature: parseFloat(options.temperature),
      maxTokens: parseInt(options.maxTokens),
    });
  });

program.parse();
```

**package.json bin field:**
```json
{
  "bin": {
    "benchmark": "./src/bin.ts"
  },
  "scripts": {
    "benchmark": "tsx src/bin.ts"
  }
}
```

After `npm install`, run with: `npx tsx src/bin.ts --harness inventory-optimization --model anthropic/claude-sonnet-4-6`
After `npm link` or global install: `benchmark --harness inventory-optimization --model anthropic/claude-sonnet-4-6`

### Pattern 2: Harness Loader and Prompt Renderer
**What:** Load `harness.yaml`, read CSV files, inject into prompt template using `{{variable}}` replacement.
**When to use:** Every run begins here. Determinism is guaranteed by string replacement (no randomness involved).

```typescript
// Source: project harness.yaml spec (Phase 1) + js-yaml npm
import { readFileSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";

interface HarnessSpec {
  name: string;
  version: string;
  data: Array<{ file: string; inject_as: string }>;
  prompt: { template: string };
  output: { schema: string };
  eval: { rubric: string; judge_model: string; judge_temperature: number };
}

export function loadHarness(harnessName: string): { spec: HarnessSpec; renderedPrompt: string } {
  const harnessDir = join("harnesses", harnessName);
  const spec = yaml.load(readFileSync(join(harnessDir, "harness.yaml"), "utf-8")) as HarnessSpec;

  let template = readFileSync(join(harnessDir, spec.prompt.template), "utf-8");

  // Inject each CSV file as a raw string — deterministic, no CSV parsing
  for (const dataFile of spec.data) {
    const csvContent = readFileSync(join(harnessDir, dataFile.file), "utf-8");
    template = template.replace(`{{${dataFile.inject_as}}}`, csvContent);
  }

  return { spec, renderedPrompt: template };
}
```

**Determinism guarantee:** `{{variable}}` string replacement is pure — same harness files always produce identical prompt text. No timestamps, no randomness injected into the prompt itself.

### Pattern 3: Provider Adapter Interface
**What:** Each provider implements the same `ProviderAdapter` interface. The dispatcher selects the adapter by the prefix of the model string.
**When to use:** Any time a new provider is added.

```typescript
// src/providers/index.ts
export interface RunResult {
  rawOutput: unknown;          // The parsed structured output object
  inputTokens: number;
  outputTokens: number;
  providerApiVersion: string;  // e.g. "2023-06-01" for Anthropic
}

export interface RunOptions {
  modelId: string;             // e.g. "claude-sonnet-4-6"
  systemPrompt: string;
  userMessage: string;
  jsonSchema: object;          // z.toJSONSchema() output
  temperature: number;
  maxTokens: number;
}

export async function runProvider(model: string, options: RunOptions): Promise<RunResult> {
  if (model.startsWith("anthropic/")) {
    const { runAnthropic } = await import("./anthropic.js");
    return runAnthropic(model.slice("anthropic/".length), options);
  } else if (model.startsWith("openai/")) {
    const { runOpenAI } = await import("./openai.js");
    return runOpenAI(model.slice("openai/".length), options);
  } else if (model.startsWith("google/")) {
    const { runGoogle } = await import("./google.js");
    return runGoogle(model.slice("google/".length), options);
  }
  throw new Error(`Unknown provider prefix in model: ${model}`);
}
```

### Pattern 4: Anthropic Provider — Tool Use Structured Output
**What:** Force Claude to return structured JSON by defining a single tool whose `input_schema` matches the harness output schema, then force its use with `tool_choice: { type: "tool", name: "..." }`.
**When to use:** All Anthropic calls. This is RUN-04's "native structured output mechanism" for Anthropic.

```typescript
// Source: https://platform.claude.com/docs/en/build-with-claude/tool-use
// Source: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
import Anthropic from "@anthropic-ai/sdk";
import type { RunOptions, RunResult } from "./index.js";

const ANTHROPIC_API_VERSION = "2023-06-01"; // Stable version per official docs

export async function runAnthropic(modelId: string, opts: RunOptions): Promise<RunResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Split system/user from the rendered prompt
  // Convention: text above "# User Message Template" is system; below is user
  const [systemPart, userPart] = splitPrompt(opts.systemPrompt);

  const response = await client.messages.create({
    model: modelId,
    max_tokens: opts.maxTokens,
    temperature: opts.temperature,
    system: systemPart,
    tools: [{
      name: "structured_output",
      description: "Return your analysis in the required structured format",
      input_schema: opts.jsonSchema as Anthropic.Tool["input_schema"],
    }],
    tool_choice: { type: "tool", name: "structured_output" },
    messages: [{ role: "user", content: userPart }],
  });

  // Extract tool use block — guaranteed by tool_choice forcing
  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Anthropic response did not contain tool_use block");
  }

  return {
    rawOutput: toolBlock.input,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    providerApiVersion: ANTHROPIC_API_VERSION,
  };
}
```

### Pattern 5: OpenAI Provider — zodResponseFormat Structured Output
**What:** Use `openai.beta.chat.completions.parse()` with `zodResponseFormat` to get guaranteed JSON conformance.
**When to use:** All OpenAI calls (RUN-04).

```typescript
// Source: https://platform.openai.com/docs/guides/structured-outputs (OpenAI official docs)
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { RunOptions, RunResult } from "./index.js";

export async function runOpenAI(modelId: string, opts: RunOptions): Promise<RunResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // zodResponseFormat requires a Zod schema object, not a JSON Schema.
  // The harness schema.ts must be dynamically imported to get the Zod object.
  // NOTE: opts.zodSchema must be passed alongside opts.jsonSchema for OpenAI.
  const completion = await client.beta.chat.completions.parse({
    model: modelId,
    max_tokens: opts.maxTokens,
    temperature: opts.temperature,
    messages: [
      { role: "system", content: opts.systemPrompt },
      { role: "user", content: opts.userMessage },
    ],
    response_format: zodResponseFormat(opts.zodSchema as z.ZodType, "structured_output"),
  });

  const parsed = completion.choices[0].message.parsed;
  if (!parsed) throw new Error("OpenAI response parsing failed");

  return {
    rawOutput: parsed,
    inputTokens: completion.usage?.prompt_tokens ?? 0,
    outputTokens: completion.usage?.completion_tokens ?? 0,
    providerApiVersion: "openai-chat-completions-v1", // Chat Completions API version
  };
}
```

**Critical OpenAI note:** `zodResponseFormat` requires the Zod schema object directly (not the JSON Schema output of `z.toJSONSchema()`). The harness schema.ts exports the Zod object — import it dynamically alongside `z.toJSONSchema()` output.

### Pattern 6: Google Provider — responseMimeType Structured Output
**What:** Use `@google/genai` with `responseMimeType: "application/json"` and `responseSchema` in generation config.
**When to use:** All Google calls (RUN-04).

```typescript
// Source: https://ai.google.dev/gemini-api/docs/structured-output
// Source: @google/genai npm package (v1.45.0, 2025)
import { GoogleGenAI } from "@google/genai";
import type { RunOptions, RunResult } from "./index.js";

export async function runGoogle(modelId: string, opts: RunOptions): Promise<RunResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

  const response = await ai.models.generateContent({
    model: modelId,
    contents: opts.userMessage,
    config: {
      systemInstruction: opts.systemPrompt,
      responseMimeType: "application/json",
      responseSchema: opts.jsonSchema,  // JSON Schema (z.toJSONSchema() output)
      temperature: opts.temperature,
      maxOutputTokens: opts.maxTokens,
    },
  });

  const rawText = response.text;
  if (!rawText) throw new Error("Google response contained no text");

  return {
    rawOutput: JSON.parse(rawText),
    inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    providerApiVersion: "gemini-api-v1beta",
  };
}
```

### Pattern 7: Output Writer and Meta Manifest
**What:** Write raw output and meta.json to `results/<run-id>/raw/<model-slug>.json` and `results/<run-id>/meta.json`.
**When to use:** Always — after every successful provider call.

```typescript
// Source: Node.js fs/promises official docs
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { calculateCost } from "./cost.js";

export async function writeResults(opts: {
  runId: string;
  modelSlug: string;
  model: string;
  harnessName: string;
  harnessVersion: string;
  rawOutput: unknown;
  inputTokens: number;
  outputTokens: number;
  providerApiVersion: string;
  temperature: number;
  maxTokens: number;
  latencyMs: number;
}) {
  const runDir = join("results", opts.runId);
  const rawDir = join(runDir, "raw");
  await mkdir(rawDir, { recursive: true });

  // Write raw model output
  await writeFile(
    join(rawDir, `${opts.modelSlug}.json`),
    JSON.stringify(opts.rawOutput, null, 2),
    "utf-8"
  );

  // Write run manifest (RUN-06)
  const meta = {
    run_id: opts.runId,
    harness: opts.harnessName,
    harness_version: opts.harnessVersion,
    model: opts.model,
    provider_api_version: opts.providerApiVersion,
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
    input_tokens: opts.inputTokens,
    output_tokens: opts.outputTokens,
    cost_usd: calculateCost(opts.model, opts.inputTokens, opts.outputTokens),
    latency_ms: opts.latencyMs,
    run_date: new Date().toISOString(),
  };

  await writeFile(join(runDir, "meta.json"), JSON.stringify(meta, null, 2), "utf-8");
}
```

### Pattern 8: Cost Calculation Table
**What:** Hardcoded price table per model, with cost formula `(inputTokens/1e6 * inputPrice) + (outputTokens/1e6 * outputPrice)`.
**When to use:** Every run — called in `writeResults`.

```typescript
// Prices verified 2026-03-15 from official pricing pages
// Anthropic: https://platform.claude.com/docs/en/about-claude/pricing
// OpenAI: https://openai.com/api/pricing/
// Google: https://ai.google.dev/gemini-api/docs/pricing

const PRICE_TABLE: Record<string, { inputPerMTok: number; outputPerMTok: number }> = {
  "anthropic/claude-sonnet-4-6": { inputPerMTok: 3.00, outputPerMTok: 15.00 },
  "openai/gpt-4o":               { inputPerMTok: 2.50, outputPerMTok: 10.00 },
  "google/gemini-1.5-pro":       { inputPerMTok: 1.25, outputPerMTok: 5.00 },
};

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const prices = PRICE_TABLE[model];
  if (!prices) return -1; // Unknown model — flag with sentinel
  return (inputTokens / 1_000_000) * prices.inputPerMTok
       + (outputTokens / 1_000_000) * prices.outputPerMTok;
}
```

### Pattern 9: Prompt Split Convention
**What:** The prompt template has a `# User Message Template` separator. Everything above is the system prompt; everything below is the user message.
**When to use:** All providers require system/user split. The template format (from Phase 1) uses this heading.

```typescript
function splitPrompt(renderedTemplate: string): [string, string] {
  const SEPARATOR = "# User Message Template";
  const idx = renderedTemplate.indexOf(SEPARATOR);
  if (idx === -1) {
    // No separator — treat entire template as user message
    return ["", renderedTemplate.trim()];
  }
  return [
    renderedTemplate.slice(0, idx).trim(),
    renderedTemplate.slice(idx + SEPARATOR.length).trim(),
  ];
}
```

### Anti-Patterns to Avoid
- **Unified provider client:** Do not abstract the three SDKs behind a single wrapper class — the APIs are different enough that the abstraction leaks. Thin adapter functions per provider are cleaner.
- **Parsing CSV into data structures before injection:** The prompt template expects raw CSV text, not JSON or a table. Inject the raw file content directly.
- **Using `@google/generative-ai` (legacy):** This package is EOL August 31, 2025. Use `@google/genai`.
- **Using `zod-to-json-schema`:** EOL November 2025. Already excluded from this project.
- **Generating run-id from timestamp:** Timestamps can collide in rapid successive runs. Use `crypto.randomUUID()`.
- **Injecting randomness into the rendered prompt:** The prompt must be deterministic (RUN-04 success criterion). Never include timestamps, random seeds, or anything non-deterministic in the prompt text itself.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CLI argument parsing | Custom `process.argv` parser | `commander` | Edge cases: `=` syntax, negation flags, required vs optional, help text generation |
| YAML parsing | Custom string parser | `js-yaml` | YAML has 12+ known edge cases (booleans `yes`/`no`, multiline strings, octal numbers, anchor references) |
| Anthropic structured output | Custom JSON extraction from text | Tool use with `tool_choice: {type: "tool"}` | Text extraction is fragile; tool use is guaranteed by the API |
| OpenAI JSON conformance | JSON mode (`response_format: {type: "json_object"}`) | `zodResponseFormat` + `beta.chat.completions.parse` | JSON mode does not enforce schema structure; `zodResponseFormat` does |
| Google JSON conformance | Prompt engineering ("respond in JSON") | `responseMimeType: "application/json"` + `responseSchema` | Grammar-constrained generation is more reliable than prompting |
| Run ID generation | Timestamp + random suffix | `crypto.randomUUID()` | UUID v4 guarantees global uniqueness; already in Node.js |
| Cost calculation | Fetching a pricing API at runtime | Hardcoded price table | Pricing APIs don't exist from providers; hardcoded table is simpler and works offline |

**Key insight:** All three providers have stable, documented structured output APIs. Use them. The temptation is to rely on prompt engineering ("respond only in JSON") — resist it. The native APIs are more reliable and produce tokens that cannot violate the schema.

---

## Common Pitfalls

### Pitfall 1: OpenAI zodResponseFormat Needs Zod Schema Object, Not JSON Schema
**What goes wrong:** The harness loader calls `z.toJSONSchema(schema)` to get a plain JSON Schema object. Passing this JSON Schema object to `zodResponseFormat()` throws a type error — `zodResponseFormat` expects the Zod schema object (the `z.object(...)` instance), not the serialized JSON Schema.

**Why it happens:** The provider dispatcher passes `opts.jsonSchema` (JSON Schema object) to all providers. OpenAI needs the original Zod object as well.

**How to avoid:** Import the harness `schema.ts` dynamically to get both the Zod object (for OpenAI) and call `z.toJSONSchema()` on it (for Anthropic tool input_schema and Google responseSchema). Pass both in `RunOptions`:
```typescript
interface RunOptions {
  jsonSchema: object;      // z.toJSONSchema() output — for Anthropic + Google
  zodSchema: z.ZodType;   // raw Zod object — for OpenAI zodResponseFormat
  // ...
}
```

**Warning signs:** `TypeError: Expected ZodType, got object` at runtime when calling OpenAI.

### Pitfall 2: Anthropic Tool Use Adds Overhead Tokens to Input Token Count
**What goes wrong:** When using tool use, Anthropic adds a system prompt for tool use support (~346 tokens for `tool_choice: {type: "tool"}` with Sonnet 4.6). The `usage.input_tokens` in the response already includes these overhead tokens — no manual adjustment needed.

**Why it happens:** Misreading the token count documentation leads to thinking you must subtract overhead.

**How to avoid:** Use `response.usage.input_tokens` and `response.usage.output_tokens` directly from the SDK response — Anthropic includes all tokens (including tool overhead) in the usage object. Document this in the cost comment.

**Warning signs:** Cost calculations appearing lower than expected when checked against the Anthropic console.

### Pitfall 3: Google API Key vs. Gemini API Key Confusion
**What goes wrong:** `@google/genai` uses `GOOGLE_API_KEY` (Gemini Developer API) by default. If the developer has a Google Cloud service account key (for Vertex AI), it will not work with the Developer API endpoint.

**Why it happens:** Google has two Gemini access paths: the Gemini Developer API (simple API key) and Vertex AI (service accounts, project IDs). The two are not interchangeable.

**How to avoid:** Document in the README that `GOOGLE_API_KEY` must be a Gemini Developer API key from `aistudio.google.com`, not a Google Cloud service account JSON.

**Warning signs:** `401 Unauthorized` or `403 Forbidden` from the Google API despite having a valid-looking API key.

### Pitfall 4: Model Slug Sanitization for Filenames
**What goes wrong:** The model string `anthropic/claude-sonnet-4-6` contains a `/` which is an illegal filename character on all platforms. Writing `results/<run-id>/raw/anthropic/claude-sonnet-4-6.json` creates an unintended subdirectory.

**Why it happens:** The model string is used directly as the filename without sanitization.

**How to avoid:** Sanitize the model string for use as a filename slug by replacing `/` with `--` or `_`: `model.replace(/\//g, "--")`. Example: `anthropic--claude-sonnet-4-6.json`.

**Warning signs:** `ENOENT: no such file or directory` when writing the raw output file, or unexpected subdirectory creation.

### Pitfall 5: Prompt Template Separator Not Found
**What goes wrong:** The `splitPrompt` function looks for `# User Message Template` in the prompt. If the harness prompt.md uses a slightly different heading (e.g., `## User Message Template` or `# User Template`), the split returns empty string for system and the full template as user — potentially including system instructions in the user message.

**Why it happens:** Harnesses are authored separately and the heading format may drift.

**How to avoid:** Add an assertion in `loadHarness` that validates the separator exists in the template before returning. Fail fast with a clear error message rather than silently producing a malformed prompt.

**Warning signs:** All three providers produce unexpected output; manual inspection of the API request shows the system prompt is empty.

### Pitfall 6: Google Legacy SDK Import
**What goes wrong:** Developer installs `@google/generative-ai` (legacy) instead of `@google/genai`. The API shape is different — `getGenerativeModel()` vs `ai.models.generateContent()`. Code written for the new SDK will not compile against the old one.

**Why it happens:** Web search results and tutorials from 2024 and early 2025 reference the legacy package by name. It is still downloadable from npm.

**How to avoid:** Install `@google/genai` (not `@google/generative-ai`). Add a `// @google/generative-ai is LEGACY — do not use` comment in the Google adapter. The legacy package was last published 10 months ago; use the unified SDK.

**Warning signs:** Import errors: `Module '"@google/genai"' has no exported member 'GoogleGenerativeAI'` (that is the legacy class name).

### Pitfall 7: Missing `results/` in .gitignore
**What goes wrong:** Generated benchmark results are committed to git, bloating the repo. This is especially bad if reference run JSON files from Phase 4 become interleaved with dev run files.

**Why it happens:** `results/` directory is created at runtime; developers forget to gitignore it.

**How to avoid:** Add `results/` to `.gitignore` immediately in Wave 0. Phase 4 will selectively commit the nine reference runs by adding explicit paths, not by un-ignoring the entire directory.

---

## Code Examples

### Dynamic Schema Import for Provider Dispatch
```typescript
// Dynamically import the Zod schema from harness schema.ts
// This gives both the Zod object (for OpenAI) and JSON Schema (for Anthropic/Google)
import { z } from "zod";
import { join } from "path";

async function loadHarnessSchema(harnessName: string) {
  const schemaPath = join(process.cwd(), "harnesses", harnessName, "schema.ts");
  // tsx/ts-node resolves .ts imports at runtime
  const schemaModule = await import(schemaPath);

  // Convention: each schema.ts exports a named Zod schema as the first export
  // (e.g., InventoryRecommendation, PricingRecommendation, FinancialForecast)
  const zodSchema = Object.values(schemaModule).find(
    (v) => v instanceof z.ZodType
  ) as z.ZodType;

  const jsonSchema = z.toJSONSchema(zodSchema);
  return { zodSchema, jsonSchema };
}
```

### Run Orchestration (cli.ts main flow)
```typescript
export async function runBenchmark(opts: BenchmarkOptions) {
  const startMs = Date.now();
  const runId = crypto.randomUUID();

  // 1. Load harness
  const { spec, renderedPrompt } = loadHarness(opts.harness);

  // 2. Load schema (both Zod object and JSON Schema)
  const { zodSchema, jsonSchema } = await loadHarnessSchema(opts.harness);

  // 3. Split prompt into system + user parts
  const [systemPrompt, userMessage] = splitPrompt(renderedPrompt);

  // 4. Call provider
  const result = await runProvider(opts.model, {
    modelId: opts.model.split("/").slice(1).join("/"),
    systemPrompt,
    userMessage,
    jsonSchema,
    zodSchema,
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
  });

  const latencyMs = Date.now() - startMs;

  // 5. Write output
  const modelSlug = opts.model.replace(/\//g, "--");
  await writeResults({
    runId,
    modelSlug,
    model: opts.model,
    harnessName: spec.name,
    harnessVersion: spec.version,
    rawOutput: result.rawOutput,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    providerApiVersion: result.providerApiVersion,
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
    latencyMs,
  });

  console.log(`Run complete: results/${runId}/`);
  console.log(`  Input tokens: ${result.inputTokens}, Output tokens: ${result.outputTokens}`);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@google/generative-ai` | `@google/genai` | EOL August 31, 2025 | Must use new package; API shape is different |
| OpenAI JSON mode (`{type: "json_object"}`) | `zodResponseFormat` + `beta.chat.completions.parse` | GPT-4o-2024-08-06 launch | Schema compliance is guaranteed; no more post-hoc validation needed |
| Anthropic prompt engineering for JSON | Tool use with `tool_choice: {type: "tool"}` + native Structured Outputs (GA) | Native Structured Outputs GA 2025 | Two valid approaches; tool use is the original and most battle-tested |
| `zod-to-json-schema` npm package | `z.toJSONSchema()` (Zod v4 native) | EOL November 2025 | Already using Zod v4; no change needed |

**Deprecated/outdated:**
- `@google/generative-ai`: EOL August 31, 2025 — do not install
- OpenAI `response_format: {type: "json_object"}` (JSON mode): Deprecated in favor of `zodResponseFormat` for schema conformance
- Anthropic beta header `anthropic-beta: structured-outputs-2025-11-13`: No longer required — `output_config.format` is GA without beta header

---

## Open Questions

1. **Anthropic native Structured Outputs vs. tool use for RUN-04**
   - What we know: Anthropic now offers two structured output mechanisms: (a) tool use with forced `tool_choice`, and (b) native `output_config.format` with `zodOutputFormat()`. Both are GA. The REQUIREMENTS.md says "Anthropic tool use for the Anthropic provider."
   - What's unclear: The requirement was written before native Structured Outputs launched. The planner should decide whether to use the explicitly-specified tool use approach (honoring the requirement as written) or the newer `output_config.format` approach.
   - Recommendation: Honor the requirement as written — implement Anthropic using tool use. The tool use approach is more explicit, easier to debug, and the REQUIREMENTS.md is a locked spec. If the requirement is updated, that is a scope change.

2. **Harness schema dynamic import under tsx**
   - What we know: `tsx` can import `.ts` files at runtime. The schema path is known at harness load time. Dynamic `import()` with a `.ts` path works when running under `tsx`.
   - What's unclear: Whether `tsx` handles dynamic imports of `.ts` files at arbitrary absolute paths correctly in all Node versions in this project.
   - Recommendation: Test this in Wave 0 with a quick smoke test before building the full pipeline. If dynamic import fails, the fallback is to compile schemas to `.js` files (or use a loader approach).

3. **Google `responseMimeType` vs `responseJsonSchema` field name**
   - What we know: The older `@google/generative-ai` SDK used `responseSchema`. The new `@google/genai` SDK uses `responseJsonSchema` in some documentation examples and `responseSchema` in others. The field name may differ between Gemini Developer API and Vertex AI.
   - What's unclear: The exact field name in `@google/genai` v1.45.0 for the JSON Schema input.
   - Recommendation: The Google adapter should be verified against the installed `@google/genai` version's TypeScript types (not documentation) to confirm the correct field name. Wave 0 should include a smoke test for the Google provider.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None formally installed — Wave 0 gap; use `tsx` + `assert` for smoke tests |
| Config file | None yet |
| Quick run command | `npx tsx src/cli.ts --harness inventory-optimization --model anthropic/claude-sonnet-4-6` |
| Full suite command | Run all three providers; verify output files exist and are valid JSON |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RUN-01 | `benchmark --harness inventory-optimization --model anthropic/claude-sonnet-4-6` exits 0 | smoke | `npx tsx src/cli.ts --harness inventory-optimization --model anthropic/claude-sonnet-4-6` | Wave 0 |
| RUN-02 | Rendered prompt contains CSV data (no un-replaced `{{}}` placeholders) | unit | `npx tsx scripts/test-render.ts` — assert no `{{` in output | Wave 0 |
| RUN-03 | Provider routing: prefix `anthropic/` selects Anthropic adapter | unit | `npx tsx scripts/test-routing.ts` — mock adapters | Wave 0 |
| RUN-04 | Anthropic call uses tool use; OpenAI uses zodResponseFormat; Google uses responseMimeType | smoke | Full end-to-end run + inspect raw output for valid JSON matching schema | Phase run |
| RUN-05 | `results/<run-id>/raw/<model-slug>.json` exists after run | smoke | File existence check after RUN-01 smoke test | Phase run |
| RUN-06 | `results/<run-id>/meta.json` contains all required fields | unit | `npx tsx scripts/test-meta.ts` — parse meta.json and assert required keys present | Wave 0 |

### Sampling Rate
- **Per task commit:** Run the prompt renderer unit test (`npx tsx scripts/test-render.ts`) for fast feedback
- **Per wave merge:** Full Anthropic end-to-end smoke test against live API
- **Phase gate:** All three providers produce `results/<run-id>/raw/<model-slug>.json` and `results/<run-id>/meta.json` with all required fields

### Wave 0 Gaps
- [ ] `scripts/test-render.ts` — loads harness, renders prompt, asserts no `{{` placeholders remain; covers RUN-02
- [ ] `scripts/test-routing.ts` — verifies provider dispatch logic routes by prefix; covers RUN-03
- [ ] `scripts/test-meta.ts` — parses a sample meta.json and validates all required fields; covers RUN-06
- [ ] `.gitignore` entry for `results/` — prevent accidental commits of dev runs
- [ ] `results/` directory creation handled by runner with `mkdir({ recursive: true })`

---

## Sources

### Primary (HIGH confidence)
- [Anthropic Tool Use Docs](https://platform.claude.com/docs/en/docs/build-with-claude/tool-use) — TypeScript SDK tool use pattern, `tool_choice: {type: "tool"}`, `input_schema` structure; directly fetched
- [Anthropic Structured Outputs Docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) — `output_config.format`, `zodOutputFormat`, supported models (claude-sonnet-4-6 confirmed GA); directly fetched
- [Anthropic Pricing Page](https://platform.claude.com/docs/en/about-claude/pricing) — Claude Sonnet 4.6: $3/MTok input, $15/MTok output; directly fetched 2026-03-15
- [Anthropic API Versioning](https://docs.anthropic.com/en/api/versioning) — `anthropic-version: 2023-06-01` is the stable version sent by all SDK calls
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs) — `zodResponseFormat`, `beta.chat.completions.parse`, GPT-4o support; search + official page
- [@google/genai npm](https://www.npmjs.com/package/@google/genai) — v1.45.0 confirmed as current; unified SDK replaces legacy package
- [Commander.js GitHub](https://github.com/tj/commander.js/) — v14.0.3 current; `requiredOption`, `.action()` pattern; built-in TypeScript types
- [js-yaml npm](https://www.npmjs.com/package/js-yaml) — v4.1.0; `yaml.load()` for harness.yaml parsing
- Phase 1 RESEARCH.md — Zod v4 `z.toJSONSchema()` confirmed; stack decisions locked

### Secondary (MEDIUM confidence)
- [Google Gemini Structured Output Docs](https://ai.google.dev/gemini-api/docs/structured-output) — `responseMimeType: "application/json"`, `responseSchema` pattern; page returned 403, inferred from search result excerpts and cross-referenced examples
- [Google Gemini Pricing](https://ai.google.dev/gemini-api/docs/pricing) — Gemini 1.5 Pro: $1.25/MTok input, $5/MTok output (≤200K tokens); from search result excerpts
- [OpenAI Pricing](https://openai.com/api/pricing/) — GPT-4o: $2.50/MTok input, $10/MTok output; from search result excerpts
- Anthropic SDK GitHub README — `usage.input_tokens`, `usage.output_tokens` response shape; WebFetch verified

### Tertiary (LOW confidence)
- Google `usageMetadata.promptTokenCount` and `candidatesTokenCount` field names — inferred from search results; should be verified against `@google/genai` TypeScript type definitions at install time

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified from official sources; versions confirmed
- Architecture: HIGH — provider APIs verified from official docs; patterns are standard
- Pitfalls: HIGH — OpenAI/Anthropic pitfalls verified from official docs; Google legacy package EOL confirmed from npm search results
- Pricing table: MEDIUM — Anthropic verified directly; OpenAI and Google from search excerpts; prices are correct as of 2026-03-15 but should be re-verified before committing reference runs in Phase 4

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (provider SDK versions and pricing may update; re-verify before Phase 4 reference runs)

**Critical note for planner:** RUN-04 requirement says "Anthropic tool use for the Anthropic provider." Anthropic now also offers native Structured Outputs (GA) via `output_config.format`. The planner should honor the requirement as written (tool use) unless explicitly updated. The task description for the Anthropic provider adapter should cite this explicitly so the implementer does not inadvertently use the newer API.
