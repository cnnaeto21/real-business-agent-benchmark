import { randomUUID } from "crypto";
import { join } from "path";
import { z } from "zod";
import { loadHarness, splitPrompt } from "./harness.ts";
import { runProvider } from "./providers/index.ts";
import { writeResults } from "./output.ts";
import type { BenchmarkOptions } from "./types.ts";

async function loadHarnessSchema(harnessName: string): Promise<{ zodSchema: z.ZodType; jsonSchema: object }> {
  const schemaPath = join(process.cwd(), "harnesses", harnessName, "schema.ts");
  const schemaModule = await import(schemaPath);

  // Convention: each schema.ts exports a named Zod schema as the first ZodType export
  const zodSchema = Object.values(schemaModule).find(
    (v): v is z.ZodType => v instanceof z.ZodType
  );
  if (!zodSchema) throw new Error(`No ZodType export found in harnesses/${harnessName}/schema.ts`);

  const jsonSchema = z.toJSONSchema(zodSchema) as object;
  return { zodSchema, jsonSchema };
}

export async function runBenchmark(opts: BenchmarkOptions): Promise<void> {
  const startMs = Date.now();
  const runId = randomUUID();

  console.log(`Starting benchmark run ${runId}`);
  console.log(`  Harness: ${opts.harness}`);
  console.log(`  Model:   ${opts.model}`);

  // 1. Load harness spec and render prompt
  const { spec, renderedPrompt } = loadHarness(opts.harness);

  // 2. Split rendered prompt into system and user parts
  const [systemPrompt, userMessage] = splitPrompt(renderedPrompt);

  // 3. Load Zod schema (provides both zodSchema for OpenAI and jsonSchema for Anthropic/Google)
  const { zodSchema, jsonSchema } = await loadHarnessSchema(opts.harness);

  // 4. Call provider (routes by "provider/" prefix)
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

  // 5. Sanitize model string for use as filename — "/" is illegal in filenames
  const modelSlug = opts.model.replace(/\//g, "--");

  // 6. Write raw output and meta manifest
  const { runDir } = await writeResults({
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

  console.log(`\nRun complete: ${runDir}`);
  console.log(`  Tokens:  ${result.inputTokens} in / ${result.outputTokens} out`);
  console.log(`  Latency: ${latencyMs}ms`);
}
