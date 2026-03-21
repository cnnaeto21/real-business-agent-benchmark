// src/eval.ts
// Eval engine — validation gate, judge call, score computation, and file writes.
//
// Pipeline:
//   1. Validate rawOutput against harness Zod schema (safeParse)
//   2. If invalid: write zero-score ScoredResult to scored/, upsert index, return
//   3. If valid: inject judge prompt, call Anthropic judge in plain text mode
//   4. Parse judge response with JudgeResponse Zod schema (retry once if malformed)
//   5. Compute composite score, write ScoredResult to scored/, upsert index
//   6. Print inline scores to stdout
//
// Called from cli.ts after writeResults() succeeds.

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { mkdir, writeFile, readFile } from "fs/promises";
import { join } from "path";
import type { HarnessSpec } from "./types.ts";

// ---------------------------------------------------------------------------
// Zod schema for judge response
// ---------------------------------------------------------------------------

const DimensionScore = z.object({
  score: z.number().int().min(1).max(5),
  rationale: z.string().min(1),
});

export const JudgeResponse = z.object({
  actionability: DimensionScore,
  reasoning_transparency: DimensionScore,
  completeness: DimensionScore,
});

export type JudgeResponseType = z.infer<typeof JudgeResponse>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The full scored result written to results/<run-id>/scored/<model-slug>.json
 */
export interface ScoredResult {
  run_id: string;
  harness: string;
  harness_version: string;
  model: string;
  composite_score: number;
  scores: {
    actionability: { score: number; rationale: string };
    reasoning_transparency: { score: number; rationale: string };
    completeness: { score: number; rationale: string };
  };
  schema_valid: boolean;
  validation_error?: string;
  cost_usd: number;
  latency_ms: number;
  run_date: string;
}

/**
 * The shape of each entry in results/index.json
 */
export interface IndexEntry {
  run_id: string;
  harness: string;
  harness_version: string;
  model: string;
  composite_score: number;
  scores: {
    actionability: { score: number; rationale: string };
    reasoning_transparency: { score: number; rationale: string };
    completeness: { score: number; rationale: string };
  };
  schema_valid: boolean;
  cost_usd: number;
  latency_ms: number;
  run_date: string;
}

// ---------------------------------------------------------------------------
// computeComposite
// ---------------------------------------------------------------------------

/**
 * Compute the composite score from judge dimension scores.
 * Formula: (actionability + reasoning_transparency + completeness) / 3 * 20
 * Range: 20-100 (when all scores are valid 1-5 judge scores)
 * Returns 0 when called with all-zero schema validation failure scores.
 */
export function computeComposite(scores: JudgeResponseType): number {
  return Math.round(
    ((scores.actionability.score + scores.reasoning_transparency.score + scores.completeness.score) / 3) * 20
  );
}

// ---------------------------------------------------------------------------
// callJudge (internal — not exported)
// ---------------------------------------------------------------------------

/**
 * Call the Anthropic API in plain text mode (no tool use) with the judge prompt.
 * Retries once if the response is malformed JSON or fails JudgeResponse validation.
 * Throws Error("Judge returned malformed JSON after retry") if both attempts fail.
 */
async function callJudge(judgePrompt: string, judgeModel: string): Promise<JudgeResponseType> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Strip provider prefix from model string (e.g. "anthropic/claude-sonnet-4-6" → "claude-sonnet-4-6")
  const modelId = judgeModel.includes("/") ? judgeModel.split("/").slice(1).join("/") : judgeModel;

  async function attempt(): Promise<JudgeResponseType | null> {
    const response = await client.messages.create({
      model: modelId,
      max_tokens: 512,
      temperature: 0,
      messages: [{ role: "user", content: judgePrompt }],
      // NO tools, NO tool_choice — plain text JSON response from judge
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return null;
    }

    let parsed: unknown;
    try {
      // Strip markdown code fences that models sometimes wrap JSON in
      const text = textBlock.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      parsed = JSON.parse(text);
    } catch {
      return null;
    }

    const result = JudgeResponse.safeParse(parsed);
    if (!result.success) {
      return null;
    }

    return result.data;
  }

  const first = await attempt();
  if (first !== null) return first;

  // Retry once
  const second = await attempt();
  if (second !== null) return second;

  throw new Error("Judge returned malformed JSON after retry");
}

// ---------------------------------------------------------------------------
// writeScored
// ---------------------------------------------------------------------------

/**
 * Write a scored result to results/<run-id>/scored/<model-slug>.json.
 * Creates the scored/ directory if it does not exist.
 */
export async function writeScored(opts: {
  runDir: string;
  modelSlug: string;
  scoredResult: unknown;
}): Promise<void> {
  const scoredDir = join(opts.runDir, "scored");
  await mkdir(scoredDir, { recursive: true });
  await writeFile(
    join(scoredDir, `${opts.modelSlug}.json`),
    JSON.stringify(opts.scoredResult, null, 2),
    "utf-8"
  );
}

// ---------------------------------------------------------------------------
// upsertIndex
// ---------------------------------------------------------------------------

/**
 * Read-modify-write results/index.json, deduplicating by run_id.
 * If the file does not exist, starts from an empty array.
 * If an entry with the same run_id exists, it is replaced.
 */
export async function upsertIndex(opts: {
  indexPath: string;
  entry: IndexEntry;
}): Promise<void> {
  let existing: IndexEntry[] = [];

  try {
    const raw = await readFile(opts.indexPath, "utf-8");
    existing = JSON.parse(raw) as IndexEntry[];
  } catch {
    // File does not exist or is not valid JSON — start fresh
    existing = [];
  }

  // Filter out any existing entry with the same run_id, then append new entry
  const updated = existing.filter((e) => e.run_id !== opts.entry.run_id);
  updated.push(opts.entry);

  await writeFile(opts.indexPath, JSON.stringify(updated, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// runEval
// ---------------------------------------------------------------------------

/**
 * Main eval orchestrator — called from cli.ts after writeResults().
 *
 * On safeParse failure: writes zero-score result, upserts index, returns.
 * On judge API failure: logs to stderr, returns without writing scored/ or updating index.
 * On success: writes scored result, upserts index, prints inline scores to stdout.
 */
export async function runEval(opts: {
  runDir: string;
  runId: string;
  harnessName: string;
  rawOutput: unknown;
  modelSlug: string;
  spec: HarnessSpec;
  meta: { cost_usd: number; latency_ms: number; run_date: string };
}): Promise<void> {
  const { runDir, runId, harnessName, rawOutput, modelSlug, spec, meta } = opts;

  // 1. Load judge prompt template
  const judgePromptTemplate = await readFile(
    join(process.cwd(), "docs", "judge-prompt.md"),
    "utf-8"
  );

  // 2. Load rubric for this harness
  const rubric = await readFile(
    join(process.cwd(), "harnesses", harnessName, spec.eval.rubric),
    "utf-8"
  );

  // 3. Load harness Zod schema dynamically
  const schemaPath = join(process.cwd(), "harnesses", harnessName, "schema.ts");
  const schemaModule = await import(schemaPath);

  const zodSchema = Object.values(schemaModule).find(
    (v): v is z.ZodType => v instanceof z.ZodType
  );
  if (!zodSchema) {
    throw new Error(`No ZodType export found in harnesses/${harnessName}/schema.ts`);
  }

  // 4. Validate rawOutput against harness schema
  const parseResult = zodSchema.safeParse(rawOutput);

  if (!parseResult.success) {
    // Schema validation failure path — zero-score result
    const scoredResult: ScoredResult = {
      run_id: runId,
      harness: spec.name,
      harness_version: spec.version,
      model: modelSlug.replace(/--/g, "/"),
      composite_score: 0,
      scores: {
        actionability: { score: 0, rationale: "" },
        reasoning_transparency: { score: 0, rationale: "" },
        completeness: { score: 0, rationale: "" },
      },
      schema_valid: false,
      validation_error: parseResult.error.message,
      cost_usd: meta.cost_usd,
      latency_ms: meta.latency_ms,
      run_date: meta.run_date,
    };

    await writeScored({ runDir, modelSlug, scoredResult });

    const indexPath = join(process.cwd(), "results", "index.json");
    const indexEntry: IndexEntry = {
      run_id: runId,
      harness: spec.name,
      harness_version: spec.version,
      model: scoredResult.model,
      composite_score: 0,
      scores: scoredResult.scores,
      schema_valid: false,
      cost_usd: meta.cost_usd,
      latency_ms: meta.latency_ms,
      run_date: meta.run_date,
    };
    await upsertIndex({ indexPath, entry: indexEntry });

    return;
  }

  // 5. Schema valid — inject placeholders and call judge
  const judgePrompt = judgePromptTemplate
    .replace("{{model_output}}", JSON.stringify(rawOutput, null, 2))
    .replace("{{rubric}}", rubric);

  let judgeScores: JudgeResponseType;
  try {
    judgeScores = await callJudge(judgePrompt, spec.eval.judge_model);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Judge scoring failed:", msg);
    // Raw output and meta.json already written by caller — exit normally
    return;
  }

  // 6. Compute composite score
  const composite = computeComposite(judgeScores);

  // 7. Build full ScoredResult
  const modelString = modelSlug.replace(/--/g, "/");
  const scoredResult: ScoredResult = {
    run_id: runId,
    harness: spec.name,
    harness_version: spec.version,
    model: modelString,
    composite_score: composite,
    scores: {
      actionability: judgeScores.actionability,
      reasoning_transparency: judgeScores.reasoning_transparency,
      completeness: judgeScores.completeness,
    },
    schema_valid: true,
    cost_usd: meta.cost_usd,
    latency_ms: meta.latency_ms,
    run_date: meta.run_date,
  };

  // 8. Write scored file
  await writeScored({ runDir, modelSlug, scoredResult });

  // 9. Upsert index.json
  const indexPath = join(process.cwd(), "results", "index.json");
  const indexEntry: IndexEntry = {
    run_id: runId,
    harness: spec.name,
    harness_version: spec.version,
    model: modelString,
    composite_score: composite,
    scores: scoredResult.scores,
    schema_valid: true,
    cost_usd: meta.cost_usd,
    latency_ms: meta.latency_ms,
    run_date: meta.run_date,
  };
  await upsertIndex({ indexPath, entry: indexEntry });

  // 10. Print inline scores to stdout (success path only)
  const s = judgeScores;
  console.log(
    `Scores: Actionability ${s.actionability.score}/5 · Reasoning ${s.reasoning_transparency.score}/5 · Completeness ${s.completeness.score}/5`
  );
  console.log(`Composite: ${composite}/100`);
}
