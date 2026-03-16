// src/output.ts
// Writes benchmark run results to disk.
//
// Directory structure created per run:
//   results/<runId>/
//     raw/<modelSlug>.json    — rawOutput serialized as pretty JSON
//     meta.json               — run manifest with all 12 required fields (RUN-06)

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { calculateCost } from "./cost.ts";

/**
 * Write raw output and run manifest to results/<runId>/.
 *
 * modelSlug must have "/" replaced with "--" before being passed here
 * (e.g. "anthropic--claude-sonnet-4-6") to avoid illegal filename characters.
 *
 * Returns { runDir } so the caller can log the output path.
 */
export async function writeResults(opts: {
  runId: string;
  modelSlug: string;       // "/" replaced by "--" (e.g. "anthropic--claude-sonnet-4-6")
  model: string;           // original model string (e.g. "anthropic/claude-sonnet-4-6")
  harnessName: string;
  harnessVersion: string;
  rawOutput: unknown;
  inputTokens: number;
  outputTokens: number;
  providerApiVersion: string;
  temperature: number;
  maxTokens: number;
  latencyMs: number;
}): Promise<{ runDir: string }> {
  const runDir = join("results", opts.runId);
  const rawDir = join(runDir, "raw");

  // Create directory hierarchy — recursive: true prevents errors if already exists
  await mkdir(rawDir, { recursive: true });

  // Write raw model output as pretty JSON
  await writeFile(
    join(rawDir, `${opts.modelSlug}.json`),
    JSON.stringify(opts.rawOutput, null, 2),
    "utf-8"
  );

  // Write run manifest (RUN-06) — exactly 12 required fields
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

  return { runDir };
}
