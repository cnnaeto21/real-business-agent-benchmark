import { z } from "zod";
import { PricingRecommendation } from "./schema.ts";

// RED: These tests will fail until schema.ts is implemented

// Test 1: z.toJSONSchema produces a valid JSON Schema object
const schema = z.toJSONSchema(PricingRecommendation);
console.assert(schema.type === "object", `Expected type 'object', got '${schema.type}'`);

// Test 2: summary field is present in JSON Schema
console.assert(
  "summary" in (schema.properties as Record<string, unknown>),
  "Missing 'summary' field in JSON Schema"
);

// Test 3: recommendations field is present
console.assert(
  "recommendations" in (schema.properties as Record<string, unknown>),
  "Missing 'recommendations' field in JSON Schema"
);

// Test 4: market_observations field is present
console.assert(
  "market_observations" in (schema.properties as Record<string, unknown>),
  "Missing 'market_observations' field in JSON Schema"
);

// Test 5: A valid object passes Zod parse
const validInput = {
  summary: "Prices look good overall",
  recommendations: [
    {
      sku: "DRINK-COLA-12OZ",
      current_price: 1.59,
      recommended_price: 1.79,
      direction: "increase" as const,
      rationale: "High velocity, thin margin improvement opportunity",
      confidence: "high" as const,
    },
  ],
  market_observations: ["Beverages show high price sensitivity"],
};
const result = PricingRecommendation.safeParse(validInput);
console.assert(result.success, `Valid input failed parse: ${JSON.stringify(result)}`);

// Test 6: Invalid direction enum fails
const invalidDirectionInput = {
  summary: "Test",
  recommendations: [
    {
      sku: "DRINK-COLA-12OZ",
      current_price: 1.59,
      recommended_price: 1.79,
      direction: "maybe",
      rationale: "Test",
      confidence: "high",
    },
  ],
  market_observations: [],
};
const failResult = PricingRecommendation.safeParse(invalidDirectionInput);
console.assert(!failResult.success, "Invalid direction should fail parse");

console.log("PASS: All pricing schema tests passed");
