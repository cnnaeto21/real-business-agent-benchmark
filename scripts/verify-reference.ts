// scripts/verify-reference.ts
// Standalone verifier for reference run results.
// Checks: exactly 9 entries in index.json, all schema_valid: true,
// all 3 harnesses × 3 models present, docs/judge-prompt.md exists.
//
// Used as:
//   npm run verify-reference   — standalone invocation
//   import { verifyReference } — called from run-reference.ts at end of orchestration

import { readFile, access, constants } from "fs/promises";
import { join } from "path";
import type { IndexEntry } from "../src/eval.ts";

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
  "openai/gpt-4o-mini",
  "google/gemini-3.1-flash-lite-preview",
];

// ---------------------------------------------------------------------------
// verifyReference
// ---------------------------------------------------------------------------

/**
 * Verify the reference run results against expected criteria.
 *
 * Checks:
 * 1. index.json has exactly 9 entries
 * 2. All entries have schema_valid: true
 * 3. All 9 harness × model combinations are present
 * 4. docs/judge-prompt.md exists (REF-03)
 *
 * @param indexPath - Absolute path to results/index.json
 */
export async function verifyReference(
  indexPath: string
): Promise<{ pass: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Read and parse index.json
  let index: IndexEntry[];
  try {
    const raw = await readFile(indexPath, "utf-8");
    index = JSON.parse(raw) as IndexEntry[];
  } catch (err) {
    errors.push(
      `Failed to read index.json: ${err instanceof Error ? err.message : String(err)}`
    );
    return { pass: false, errors };
  }

  // 1. Check entry count
  if (index.length !== 9) {
    errors.push(`Expected 9 entries, found ${index.length}`);
  }

  // 2. Check schema_valid on each entry
  for (const entry of index) {
    if (!entry.schema_valid) {
      errors.push(`schema_valid: false for ${entry.harness} × ${entry.model}`);
    }
  }

  // 3. Check all 9 harness × model combinations are present
  const EXPECTED_COMBINATIONS = HARNESSES.flatMap((h) =>
    MODELS.map((m) => `${h}|${m}`)
  );
  const found = new Set(index.map((e) => `${e.harness}|${e.model}`));

  for (const combo of EXPECTED_COMBINATIONS) {
    if (!found.has(combo)) {
      const [harness, model] = combo.split("|");
      errors.push(`Missing combination: ${harness} × ${model}`);
    }
  }

  // 4. Check docs/judge-prompt.md exists (REF-03)
  const judgePromptPath = join(process.cwd(), "docs", "judge-prompt.md");
  try {
    await access(judgePromptPath, constants.F_OK);
  } catch {
    errors.push(`docs/judge-prompt.md not found at ${judgePromptPath}`);
  }

  return { pass: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const indexPath = join(process.cwd(), "results", "index.json");
  const { pass, errors } = await verifyReference(indexPath);

  if (pass) {
    console.log("PASS: All 9 reference runs verified");
    for (const harness of HARNESSES) {
      for (const model of MODELS) {
        console.log(`  OK ${harness} × ${model}`);
      }
    }
  } else {
    for (const error of errors) {
      console.error(`  FAIL: ${error}`);
    }
    process.exit(1);
  }
}

// Only run main() when invoked directly (not when imported as a module)
// ESM guard: import.meta.url matches process.argv[1] when run directly via tsx
const isMain = process.argv[1]?.endsWith("verify-reference.ts") ||
  process.argv[1]?.endsWith("verify-reference.js");

if (isMain) {
  try {
    await main();
  } catch (err) {
    console.error("verify-reference error:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
