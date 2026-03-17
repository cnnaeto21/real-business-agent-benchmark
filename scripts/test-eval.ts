// scripts/test-eval.ts
// Wave 0 test scaffold for the eval engine (src/eval.ts).
// Tests are RED until Plan 02 creates src/eval.ts.
// Run: npx tsx scripts/test-eval.ts

import assert from "node:assert/strict";
import { mkdir, rm, readFile, writeFile } from "fs/promises";
import { join } from "path";

import {
  computeComposite,
  JudgeResponse,
  writeScored,
  upsertIndex,
} from "../src/eval.ts";

// ---------------------------------------------------------------------------
// Types mirroring what src/eval.ts will define (used in integration tests)
// ---------------------------------------------------------------------------

interface ScoreDimension {
  score: number;
  rationale: string;
}

interface ScoredResult {
  schema_valid: boolean;
  composite_score: number;
  validation_error?: string;
  scores: {
    actionability: ScoreDimension;
    reasoning_transparency: ScoreDimension;
    completeness: ScoreDimension;
  };
}

interface IndexEntry {
  run_id: string;
  harness: string;
  harness_version: string;
  model: string;
  composite_score: number;
  scores: {
    actionability: ScoreDimension;
    reasoning_transparency: ScoreDimension;
    completeness: ScoreDimension;
  };
  schema_valid: boolean;
  cost_usd: number;
  latency_ms: number;
  run_date: string;
}

// ---------------------------------------------------------------------------
// Helper: build a zero-score result for schema validation failures
// This mirrors what runEval will do when safeParse fails — tests the shape
// contract without needing a full runEval call.
// ---------------------------------------------------------------------------

function buildZeroScoreResult(validationError: string): ScoredResult {
  return {
    schema_valid: false,
    composite_score: 0,
    validation_error: validationError,
    scores: {
      actionability: { score: 0, rationale: "" },
      reasoning_transparency: { score: 0, rationale: "" },
      completeness: { score: 0, rationale: "" },
    },
  };
}

// ---------------------------------------------------------------------------
// Test runner helper
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

async function run(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    if (err instanceof Error) {
      console.error(`        ${err.message}`);
    }
    failed++;
  }
}

// ---------------------------------------------------------------------------
// SECTION 1: computeComposite unit tests (EVAL-03, EVAL-05)
// Formula: (actionability + reasoning_transparency + completeness) / 3 * 20
// Range: 20-100 (scores 1-5 per dimension)
// ---------------------------------------------------------------------------

console.log("\ncomputeComposite unit tests:");

await run("all-5 → 100", () => {
  const result = computeComposite({
    actionability: { score: 5, rationale: "excellent" },
    reasoning_transparency: { score: 5, rationale: "excellent" },
    completeness: { score: 5, rationale: "excellent" },
  });
  assert.strictEqual(result, 100);
});

await run("all-1 → 20", () => {
  const result = computeComposite({
    actionability: { score: 1, rationale: "poor" },
    reasoning_transparency: { score: 1, rationale: "poor" },
    completeness: { score: 1, rationale: "poor" },
  });
  assert.strictEqual(result, 20);
});

await run("(4+3+5)/3*20 → 80", () => {
  // 4+3+5=12, 12/3=4, 4*20=80
  const result = computeComposite({
    actionability: { score: 4, rationale: "good" },
    reasoning_transparency: { score: 3, rationale: "ok" },
    completeness: { score: 5, rationale: "thorough" },
  });
  assert.strictEqual(result, 80);
});

await run("(3+3+4)/3*20 → Math.round(10/3*20) rounding", () => {
  // 3+3+4=10, 10/3=3.333..., 3.333...*20=66.666..., rounds to 67
  const result = computeComposite({
    actionability: { score: 3, rationale: "adequate" },
    reasoning_transparency: { score: 3, rationale: "adequate" },
    completeness: { score: 4, rationale: "good" },
  });
  assert.strictEqual(result, Math.round((10 / 3) * 20));
});

// ---------------------------------------------------------------------------
// SECTION 2: JudgeResponse Zod schema unit tests (EVAL-04)
// Score valid range: 1-5 (0 is NOT a valid judge score — reserved for schema failures)
// ---------------------------------------------------------------------------

console.log("\nJudgeResponse Zod schema unit tests:");

await run("valid judge JSON parses successfully", () => {
  const parsed = JudgeResponse.safeParse({
    actionability: { score: 4, rationale: "good" },
    reasoning_transparency: { score: 3, rationale: "ok" },
    completeness: { score: 5, rationale: "thorough" },
  });
  assert.ok(parsed.success, "valid judge JSON should parse successfully");
});

await run("score out of range (6) fails parse", () => {
  const parsed = JudgeResponse.safeParse({
    actionability: { score: 6, rationale: "out of range" },
    reasoning_transparency: { score: 3, rationale: "ok" },
    completeness: { score: 5, rationale: "good" },
  });
  assert.ok(!parsed.success, "score 6 should fail Zod parse (max is 5)");
});

await run("score 0 fails parse (min is 1)", () => {
  // 0 is only for schema validation failures — not a valid judge score
  const parsed = JudgeResponse.safeParse({
    actionability: { score: 0, rationale: "zero not valid" },
    reasoning_transparency: { score: 3, rationale: "ok" },
    completeness: { score: 5, rationale: "good" },
  });
  assert.ok(!parsed.success, "score 0 should fail Zod parse (min is 1)");
});

await run("missing rationale fails parse", () => {
  const parsed = JudgeResponse.safeParse({
    actionability: { score: 4 },
    reasoning_transparency: { score: 3, rationale: "ok" },
    completeness: { score: 5, rationale: "good" },
  });
  assert.ok(!parsed.success, "missing rationale should fail Zod parse");
});

await run("missing dimension key fails parse", () => {
  const parsed = JudgeResponse.safeParse({
    actionability: { score: 4, rationale: "good" },
    // reasoning_transparency missing
    completeness: { score: 5, rationale: "good" },
  });
  assert.ok(!parsed.success, "missing dimension key should fail Zod parse");
});

// ---------------------------------------------------------------------------
// SECTION 3: Integration — writeScored (EVAL-06)
// ---------------------------------------------------------------------------

console.log("\nwriteScored integration tests:");

const tmpRunId = `test-eval-tmp-${Date.now()}`;
const tmpRunDir = join("results", tmpRunId);

try {
  await mkdir(tmpRunDir, { recursive: true });

  await run("creates results/<tmp-run-id>/scored/<slug>.json", async () => {
    const scoredResult: ScoredResult = {
      schema_valid: true,
      composite_score: 80,
      scores: {
        actionability: { score: 4, rationale: "good" },
        reasoning_transparency: { score: 3, rationale: "ok" },
        completeness: { score: 5, rationale: "thorough" },
      },
    };

    await writeScored({
      runDir: tmpRunDir,
      modelSlug: "anthropic--claude-sonnet-4-6",
      scoredResult,
    });

    const expectedPath = join(tmpRunDir, "scored", "anthropic--claude-sonnet-4-6.json");
    const content = await readFile(expectedPath, "utf-8");
    const parsed = JSON.parse(content);

    assert.ok(parsed, "scored file must be valid JSON");
  });

  await run("scored file has expected shape (schema_valid, composite_score, scores with 3 dimensions)", async () => {
    const scoredResult: ScoredResult = {
      schema_valid: true,
      composite_score: 80,
      scores: {
        actionability: { score: 4, rationale: "good" },
        reasoning_transparency: { score: 3, rationale: "ok" },
        completeness: { score: 5, rationale: "thorough" },
      },
    };

    await writeScored({
      runDir: tmpRunDir,
      modelSlug: "test--model",
      scoredResult,
    });

    const filePath = join(tmpRunDir, "scored", "test--model.json");
    const content = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(content);

    assert.ok("schema_valid" in parsed, "scored result must have schema_valid");
    assert.ok("composite_score" in parsed, "scored result must have composite_score");
    assert.ok("scores" in parsed, "scored result must have scores");
    assert.ok("actionability" in parsed.scores, "scores must have actionability");
    assert.ok("reasoning_transparency" in parsed.scores, "scores must have reasoning_transparency");
    assert.ok("completeness" in parsed.scores, "scores must have completeness");
    assert.strictEqual(parsed.schema_valid, true);
    assert.strictEqual(parsed.composite_score, 80);
  });
} finally {
  await rm(tmpRunDir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// SECTION 4: Integration — upsertIndex (EVAL-06, EVAL-07)
// ---------------------------------------------------------------------------

console.log("\nupsertIndex integration tests:");

const tmpIndexRunId = `test-eval-idx-${Date.now()}`;
const tmpIndexDir = join("results", tmpIndexRunId);

try {
  await mkdir(tmpIndexDir, { recursive: true });

  const indexPath = join(tmpIndexDir, "index.json");

  const entry1: IndexEntry = {
    run_id: "run-abc-001",
    harness: "inventory-optimization",
    harness_version: "1.0.0",
    model: "anthropic/claude-sonnet-4-6",
    composite_score: 80,
    scores: {
      actionability: { score: 4, rationale: "good" },
      reasoning_transparency: { score: 3, rationale: "ok" },
      completeness: { score: 5, rationale: "thorough" },
    },
    schema_valid: true,
    cost_usd: 0.05,
    latency_ms: 3000,
    run_date: "2026-03-16T14:50:26.544Z",
  };

  await run("creates index.json when it does not exist (first entry)", async () => {
    await upsertIndex({ indexPath, entry: entry1 });

    const content = await readFile(indexPath, "utf-8");
    const index = JSON.parse(content);

    assert.ok(Array.isArray(index), "index.json must be a JSON array");
    assert.strictEqual(index.length, 1, "should have exactly 1 entry");
    assert.strictEqual(index[0].run_id, "run-abc-001");
  });

  const entry2: IndexEntry = {
    run_id: "run-abc-002",
    harness: "inventory-optimization",
    harness_version: "1.0.0",
    model: "openai/gpt-4o",
    composite_score: 60,
    scores: {
      actionability: { score: 3, rationale: "adequate" },
      reasoning_transparency: { score: 3, rationale: "ok" },
      completeness: { score: 3, rationale: "partial" },
    },
    schema_valid: true,
    cost_usd: 0.03,
    latency_ms: 2000,
    run_date: "2026-03-16T15:10:00.000Z",
  };

  await run("appends new entry when run_id is different (2 entries total)", async () => {
    await upsertIndex({ indexPath, entry: entry2 });

    const content = await readFile(indexPath, "utf-8");
    const index = JSON.parse(content);

    assert.strictEqual(index.length, 2, "should have exactly 2 entries after second different run_id");
    assert.ok(
      index.some((e: IndexEntry) => e.run_id === "run-abc-001"),
      "entry1 should still be present"
    );
    assert.ok(
      index.some((e: IndexEntry) => e.run_id === "run-abc-002"),
      "entry2 should be present"
    );
  });

  const entry1Updated: IndexEntry = {
    ...entry1,
    composite_score: 90,
    scores: {
      actionability: { score: 5, rationale: "updated" },
      reasoning_transparency: { score: 4, rationale: "updated" },
      completeness: { score: 5, rationale: "updated" },
    },
  };

  await run("replaces existing entry when same run_id is re-scored (still 2 entries, updated values)", async () => {
    await upsertIndex({ indexPath, entry: entry1Updated });

    const content = await readFile(indexPath, "utf-8");
    const index = JSON.parse(content);

    assert.strictEqual(index.length, 2, "should still have 2 entries (no duplicate appended)");
    const updated = index.find((e: IndexEntry) => e.run_id === "run-abc-001");
    assert.ok(updated, "updated entry should exist");
    assert.strictEqual(updated.composite_score, 90, "composite_score should reflect updated value");
  });
} finally {
  await rm(tmpIndexDir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// SECTION 5: Schema validation failure path unit tests (EVAL-01)
// Tests the contract shape without needing a live runEval call.
// ---------------------------------------------------------------------------

console.log("\nSchema validation failure path unit tests:");

await run("buildZeroScoreResult: composite_score is 0", () => {
  const result = buildZeroScoreResult("recommendations[2].quantity: expected number, received string");
  assert.strictEqual(result.composite_score, 0);
});

await run("buildZeroScoreResult: schema_valid is false", () => {
  const result = buildZeroScoreResult("some.field: invalid");
  assert.strictEqual(result.schema_valid, false);
});

await run("buildZeroScoreResult: validation_error is a non-empty string", () => {
  const errorMsg = "recommendations[2].quantity: expected number, received string";
  const result = buildZeroScoreResult(errorMsg);
  assert.ok(
    typeof result.validation_error === "string" && result.validation_error.length > 0,
    "validation_error must be a non-empty string"
  );
  assert.strictEqual(result.validation_error, errorMsg);
});

await run("buildZeroScoreResult: all dimension scores are 0", () => {
  const result = buildZeroScoreResult("field: invalid");
  assert.strictEqual(result.scores.actionability.score, 0);
  assert.strictEqual(result.scores.reasoning_transparency.score, 0);
  assert.strictEqual(result.scores.completeness.score, 0);
});

// ---------------------------------------------------------------------------
// Final summary
// ---------------------------------------------------------------------------

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

console.log("All test-eval tests passed");
