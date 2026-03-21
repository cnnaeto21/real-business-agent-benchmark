// src/types.ts
// Shared contracts for the benchmark CLI runner (Phase 2).
// All provider adapters, harness loader, and output writer import from here.

export interface HarnessSpec {
  name: string;
  version: string;
  data: Array<{ file: string; inject_as: string }>;
  prompt: { template: string };
  output: { schema: string };
  eval: { rubric: string; judge_model: string; judge_temperature: number };
  providers: string[];
}

/**
 * Options passed to every provider adapter.
 * jsonSchema: z.toJSONSchema() output — used by Anthropic (input_schema) and Google (responseSchema).
 * zodSchema: raw Zod object — required by OpenAI zodResponseFormat (cannot accept plain JSON Schema).
 */
export interface RunOptions {
  modelId: string;           // e.g. "claude-sonnet-4-6" (prefix stripped)
  systemPrompt: string;
  userMessage: string;
  jsonSchema: object;        // z.toJSONSchema() output
  zodSchema: unknown;        // z.ZodType — typed as unknown here to avoid zod import in types.ts
  temperature: number;
  maxTokens: number;
}

/**
 * Returned by every provider adapter.
 */
export interface RunResult {
  rawOutput: unknown;          // Parsed structured output object
  inputTokens: number;
  outputTokens: number;
  providerApiVersion: string;  // e.g. "2023-06-01" for Anthropic
}

/**
 * CLI entry options parsed from Commander.
 */
export interface BenchmarkOptions {
  harness: string;    // e.g. "inventory-optimization"
  model: string;      // e.g. "anthropic/claude-sonnet-4-6"
  temperature: number;
  maxTokens: number;
  noEval?: boolean;   // if true, skip eval scoring for this run
}
