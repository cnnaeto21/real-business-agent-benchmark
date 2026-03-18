// scripts/run-reference.ts
// Main orchestrator for Phase 4 reference runs.
//
// Usage:
//   npm run reference            — interactive run with cost confirmation
//   npm run reference --dry-run  — validate harnesses and env vars, no LLM calls
//
// Pipeline:
//   1. Parse flags (--dry-run)
//   2. --dry-run: validate harness loading + env vars, exit 0
//   3. Clear results/ and reset index.json to []
//   4. Estimate total cost, prompt "Proceed? (y/N)"
//   5. Run 9 combinations sequentially (with one automatic retry on failure)
//   6. Print summary table
//   7. Exit non-zero if any run failed after retry
//   8. Call verifyReference — exit non-zero if verification fails
//   9. Print commit instructions

import { readdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { createInterface } from "readline";
import { spawn } from "child_process";
import { calculateCost } from "../src/cost.ts";
import { loadHarness } from "../src/harness.ts";
import { verifyReference } from "./verify-reference.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HARNESSES = [
  "inventory-optimization",
  "pricing-strategy",
  "financial-forecasting",
];

const MODELS = [
  "anthropic/claude-sonnet-4-6",
  "openai/gpt-4o",
  "google/gemini-1.5-pro",
];

const JUDGE_MODEL = "anthropic/claude-sonnet-4-6";
const EST_INPUT = 2500;       // representative subject tokens in
const EST_OUTPUT = 3400;      // representative subject tokens out
const JUDGE_EST_INPUT = 3500;
const JUDGE_EST_OUTPUT = 512;

const ENV_VAR_MAP: Record<string, string> = {
  "anthropic/claude-sonnet-4-6": "ANTHROPIC_API_KEY",
  "openai/gpt-4o": "OPENAI_API_KEY",
  "google/gemini-1.5-pro": "GOOGLE_API_KEY",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RunStatus = "OK" | "RETRY" | "FAILED";

interface RunResult {
  harness: string;
  model: string;
  status: RunStatus;
  compositeScore?: number;
  costUsd?: number;
}

// ---------------------------------------------------------------------------
// clearResults
// ---------------------------------------------------------------------------

async function clearResults(): Promise<void> {
  const resultsDir = join(process.cwd(), "results");
  const entries = await readdir(resultsDir);

  for (const entry of entries) {
    if (entry === "index.json") continue;
    await rm(join(resultsDir, entry), { recursive: true, force: true });
  }

  await writeFile(
    join(resultsDir, "index.json"),
    JSON.stringify([], null, 2),
    "utf-8"
  );

  console.log("Cleared results/ and reset index.json to []");
}

// ---------------------------------------------------------------------------
// runBenchmarkProcess
// ---------------------------------------------------------------------------

/**
 * Spawn `tsx src/bin.ts --harness <harness> --model <model>` and resolve
 * with the exit code. Resolves 1 on spawn error.
 */
function runBenchmarkProcess(harness: string, model: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(
      "tsx",
      ["src/bin.ts", "--harness", harness, "--model", model],
      {
        stdio: "inherit",
        env: process.env,
        cwd: process.cwd(),
      }
    );

    child.on("close", (code) => {
      resolve(code ?? 1);
    });

    child.on("error", (err) => {
      console.error(`Spawn error: ${err.message}`);
      resolve(1);
    });
  });
}

// ---------------------------------------------------------------------------
// runWithRetry
// ---------------------------------------------------------------------------

async function runWithRetry(
  harness: string,
  model: string
): Promise<RunStatus> {
  const code1 = await runBenchmarkProcess(harness, model);
  if (code1 === 0) return "OK";

  console.log(
    `  First attempt failed (exit ${code1}), retrying after 5s...`
  );
  await new Promise((r) => setTimeout(r, 5000));

  const code2 = await runBenchmarkProcess(harness, model);
  if (code2 === 0) return "RETRY";

  console.log(`  Both attempts failed for ${harness} × ${model}`);
  return "FAILED";
}

// ---------------------------------------------------------------------------
// readLatestEntry
// ---------------------------------------------------------------------------

/**
 * Read the most recent entry from results/index.json matching the given
 * harness and model. Returns undefined if not found.
 */
async function readLatestEntry(
  harness: string,
  model: string
): Promise<{ composite_score: number; cost_usd: number } | undefined> {
  try {
    const indexPath = join(process.cwd(), "results", "index.json");
    const raw = await import("fs/promises").then((fs) =>
      fs.readFile(indexPath, "utf-8")
    );
    const entries = JSON.parse(raw) as Array<{
      harness: string;
      model: string;
      composite_score: number;
      cost_usd: number;
    }>;

    // Find the most recent matching entry (last occurrence)
    const matching = entries.filter(
      (e) => e.harness === harness && e.model === model
    );
    return matching.length > 0 ? matching[matching.length - 1] : undefined;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// printSummaryTable
// ---------------------------------------------------------------------------

function printSummaryTable(results: RunResult[]): void {
  console.log("\n" + "─".repeat(90));
  console.log(
    "harness                    | model                            | status | score  | cost USD"
  );
  console.log("─".repeat(90));

  for (const r of results) {
    const harness = r.harness.padEnd(26);
    const model = r.model.padEnd(33);
    const status = r.status.padEnd(6);
    const score =
      r.compositeScore !== undefined
        ? r.compositeScore.toFixed(2).padStart(6)
        : "     -";
    const cost =
      r.costUsd !== undefined ? `$${r.costUsd.toFixed(4)}` : "     -";
    console.log(`${harness} | ${model} | ${status} | ${score} | ${cost}`);
  }

  console.log("─".repeat(90));
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // Step 1: Parse --dry-run flag
  const DRY_RUN = process.argv.includes("--dry-run");

  // Step 2: --dry-run branch
  if (DRY_RUN) {
    console.log("DRY RUN: Validating harnesses and environment variables...\n");

    let allPassed = true;

    // Check harness loading
    console.log("Harness validation:");
    for (const harness of HARNESSES) {
      try {
        loadHarness(harness);
        console.log(`  PASS harness: ${harness}`);
      } catch (err) {
        console.log(
          `  FAIL harness: ${harness}: ${(err as Error).message}`
        );
        allPassed = false;
      }
    }

    // Check env vars
    console.log("\nEnvironment variable validation:");
    for (const model of MODELS) {
      const envVar = ENV_VAR_MAP[model];
      if (process.env[envVar]) {
        console.log(`  PASS ${model} → ${envVar}`);
      } else {
        console.log(`  FAIL ${model} → ${envVar} is not set`);
        allPassed = false;
      }
    }

    console.log(
      allPassed
        ? "\nDry run PASSED — ready to execute reference runs."
        : "\nDry run completed with failures — fix above issues before running."
    );
    process.exit(0);
  }

  // Step 3: Clear results/
  console.log("Clearing results/...");
  await clearResults();

  // Step 4: Cost estimation
  let totalEstimate = 0;
  for (const model of MODELS) {
    for (let i = 0; i < HARNESSES.length; i++) {
      const subjectCost = calculateCost(model, EST_INPUT, EST_OUTPUT);
      const judgeCost = calculateCost(JUDGE_MODEL, JUDGE_EST_INPUT, JUDGE_EST_OUTPUT);

      if (subjectCost !== -1) {
        totalEstimate += subjectCost;
      } else {
        console.warn(`WARNING: unknown model for cost estimate: ${model}`);
      }

      if (judgeCost !== -1) {
        totalEstimate += judgeCost;
      }
    }
  }

  console.log(
    `\nEstimated total cost: ~$${totalEstimate.toFixed(4)} USD (18 API calls: 9 subject + 9 judge)`
  );

  // Step 5: Interactive confirmation
  if (!process.stdin.isTTY) {
    console.error(
      "Non-TTY stdin detected; pass --dry-run or run interactively"
    );
    process.exit(1);
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question("Proceed? (y/N): ", (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase());
    });
  });

  if (answer !== "y") {
    console.log("Aborted.");
    process.exit(0);
  }

  // Step 6 & 7: Run all 9 combinations sequentially
  console.log("\nStarting 9 reference runs...\n");
  const results: RunResult[] = [];

  for (const harness of HARNESSES) {
    for (const model of MODELS) {
      console.log(`Running: ${harness} × ${model}`);
      const status = await runWithRetry(harness, model);

      const result: RunResult = { harness, model, status };

      if (status === "OK" || status === "RETRY") {
        const entry = await readLatestEntry(harness, model);
        if (entry) {
          result.compositeScore = entry.composite_score;
          result.costUsd = entry.cost_usd;
        }
      }

      results.push(result);
    }
  }

  // Step 8: Print summary table
  printSummaryTable(results);

  // Step 9: Check for any FAILED runs
  const failedRuns = results.filter((r) => r.status === "FAILED");
  if (failedRuns.length > 0) {
    console.error(
      `\nERROR: ${failedRuns.length} run(s) failed after retry. Fix failures before committing. No commit attempted.`
    );
    process.exit(1);
  }

  // Step 10: Call verifyReference
  console.log("\nVerifying reference run results...");
  const { pass, errors } = await verifyReference(
    join(process.cwd(), "results", "index.json")
  );

  if (!pass) {
    for (const error of errors) {
      console.error(`  ${error}`);
    }
    console.error("Verification failed. Do not commit.");
    process.exit(1);
  }

  // Step 11: Print commit instructions
  console.log(
    "\nAll 9 reference runs verified. Commit with:\n" +
      "  git add results/ docs/judge-prompt.md\n" +
      '  git commit -m "data(04-reference-runs): add 9 reference run results"'
  );
}

try {
  await main();
} catch (err) {
  console.error(
    "run-reference error:",
    err instanceof Error ? err.message : String(err)
  );
  process.exit(1);
}
