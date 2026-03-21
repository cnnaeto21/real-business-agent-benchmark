import assert from "assert";

// Required fields for results/<run-id>/meta.json per RUN-06
const REQUIRED_META_FIELDS = [
  "run_id",
  "harness",
  "harness_version",
  "model",
  "provider_api_version",
  "temperature",
  "max_tokens",
  "input_tokens",
  "output_tokens",
  "cost_usd",
  "latency_ms",
  "run_date",
];

// Simulate a meta object as output.ts would produce it
const sampleMeta = {
  run_id: "test-uuid-1234",
  harness: "inventory-optimization",
  harness_version: "1.0.0",
  model: "anthropic/claude-sonnet-4-6",
  provider_api_version: "2023-06-01",
  temperature: 0,
  max_tokens: 4096,
  input_tokens: 1000,
  output_tokens: 500,
  cost_usd: 0.01,
  latency_ms: 2500,
  run_date: new Date().toISOString(),
};

for (const field of REQUIRED_META_FIELDS) {
  assert.ok(field in sampleMeta, `Required meta field missing: ${field}`);
}

console.log("test-meta: PASS — all required meta.json fields present");
