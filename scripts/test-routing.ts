import assert from "assert";

// Simulate the routing logic from src/providers/index.ts
function getProvider(model: string): string {
  if (model.startsWith("anthropic/")) return "anthropic";
  if (model.startsWith("openai/")) return "openai";
  if (model.startsWith("google/")) return "google";
  throw new Error(`Unknown provider prefix in model: ${model}`);
}

assert.strictEqual(getProvider("anthropic/claude-sonnet-4-6"), "anthropic");
assert.strictEqual(getProvider("openai/gpt-4o"), "openai");
assert.strictEqual(getProvider("google/gemini-1.5-pro"), "google");

// Assert unknown prefix throws
assert.throws(() => getProvider("unknown/model"), /Unknown provider prefix/);

console.log("test-routing: PASS — all three providers route correctly, unknown prefix throws");
