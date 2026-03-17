// scripts/re-eval.ts
// Standalone re-eval script — reads an existing run from disk and re-scores it
// using the current harness spec (picking up any rubric or schema changes).
//
// Usage:
//   tsx scripts/re-eval.ts --run-id <uuid>
//
// The script reads:
//   results/<run-id>/meta.json           — harness, model, cost_usd, latency_ms, run_date
//   results/<run-id>/raw/<model-slug>.json — rawOutput from the original LLM call
//
// It loads the current harness spec from harnesses/<harness>/harness.yaml (not the
// frozen spec from the run), which enables rubric changes to be re-applied to old runs.

import { join } from "path";
import { readFile } from "fs/promises";
import { loadHarness } from "../src/harness.ts";
import { runEval } from "../src/eval.ts";

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const runIdIdx = args.indexOf("--run-id");
const runId = runIdIdx !== -1 ? args[runIdIdx + 1] : undefined;

if (!runId) {
  console.error("Usage: tsx scripts/re-eval.ts --run-id <uuid>");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

try {
  // 1. Resolve paths
  const resultsDir = join(process.cwd(), "results");
  const runDir = join(resultsDir, runId);
  const metaPath = join(runDir, "meta.json");
  const rawDir = join(runDir, "raw");

  // 2. Read and parse meta.json
  let metaRaw: string;
  try {
    metaRaw = await readFile(metaPath, "utf-8");
  } catch {
    console.error(`Error: Run directory not found: results/${runId}`);
    console.error("  Check that the run-id is correct.");
    process.exit(1);
  }

  const meta = JSON.parse(metaRaw) as {
    harness: string;
    model: string;
    cost_usd: number;
    latency_ms: number;
    run_date: string;
  };

  const { harness, model, cost_usd, latency_ms, run_date } = meta;

  // 3. Derive model slug from model string
  const modelSlug = model.replace(/\//g, "--");

  // 4. Read raw output file
  const rawOutputPath = join(rawDir, `${modelSlug}.json`);
  let rawOutputRaw: string;
  try {
    rawOutputRaw = await readFile(rawOutputPath, "utf-8");
  } catch {
    console.error(`Error: Raw output not found: results/${runId}/raw/${modelSlug}.json`);
    console.error("  Run the benchmark first, or use --skip-eval to generate raw output.");
    process.exit(1);
  }

  const rawOutput: unknown = JSON.parse(rawOutputRaw);

  // 5. Load current harness spec (picks up any rubric/schema changes since original run)
  const { spec } = loadHarness(harness);

  // 6. Log intent before scoring
  console.log(`Re-scoring run ${runId}`);
  console.log(`  Harness: ${harness}`);
  console.log(`  Model:   ${model}`);

  // 7. Call runEval — handles judge failures, schema failures, writes scored/ and index.json
  await runEval({
    runDir,
    runId,
    harnessName: harness,
    rawOutput,
    modelSlug,
    spec,
    meta: { cost_usd, latency_ms, run_date },
  });
} catch (err) {
  console.error("Re-eval failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}
