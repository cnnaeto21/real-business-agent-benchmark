import { writeResults } from "../src/output.ts";
import { readFileSync, existsSync, rmSync } from "fs";
import { join } from "path";
import assert from "assert";

const runId = "test-run-output-" + Date.now();
const modelSlug = "anthropic--claude-sonnet-4-6";

await writeResults({
  runId,
  modelSlug,
  model: "anthropic/claude-sonnet-4-6",
  harnessName: "inventory-optimization",
  harnessVersion: "1.0.0",
  rawOutput: { test: "data", recommendations: [] },
  inputTokens: 1000,
  outputTokens: 500,
  providerApiVersion: "2023-06-01",
  temperature: 0,
  maxTokens: 4096,
  latencyMs: 2500,
});

// Verify directory structure
const rawFile = join("results", runId, "raw", modelSlug + ".json");
const metaFile = join("results", runId, "meta.json");

assert.ok(existsSync(rawFile), "raw file missing: " + rawFile);
assert.ok(existsSync(metaFile), "meta.json missing: " + metaFile);

// Verify raw file content
const raw = JSON.parse(readFileSync(rawFile, "utf-8"));
assert.strictEqual(raw.test, "data", "raw file content wrong");

// Verify meta.json fields
const meta = JSON.parse(readFileSync(metaFile, "utf-8"));
const requiredFields = [
  "run_id", "harness", "harness_version", "model", "provider_api_version",
  "temperature", "max_tokens", "input_tokens", "output_tokens",
  "cost_usd", "latency_ms", "run_date",
];
for (const f of requiredFields) {
  assert.ok(f in meta, "Missing meta field: " + f);
}
assert.ok(meta.cost_usd > 0, "cost_usd should be positive for known model");

// Also verify that recursive mkdir doesn't throw when dir already exists
await writeResults({
  runId,
  modelSlug: "openai--gpt-4o",
  model: "openai/gpt-4o",
  harnessName: "inventory-optimization",
  harnessVersion: "1.0.0",
  rawOutput: { another: "run" },
  inputTokens: 500,
  outputTokens: 200,
  providerApiVersion: "openai-chat-completions-v1",
  temperature: 0.5,
  maxTokens: 2048,
  latencyMs: 1200,
});

// Cleanup test run
rmSync(join("results", runId), { recursive: true });

console.log("test-output: PASS — writeResults creates correct directory structure with raw JSON and meta.json");
console.log("  All 12 required meta fields present");
console.log("  mkdir recursive: no error when directory already exists");
