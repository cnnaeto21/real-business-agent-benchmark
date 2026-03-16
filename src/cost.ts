// src/cost.ts
// Hardcoded price table and cost calculation.
//
// Prices verified 2026-03-15 from official pricing pages:
// Anthropic: https://platform.claude.com/docs/en/about-claude/pricing
// OpenAI: https://openai.com/api/pricing/
// Google: https://ai.google.dev/gemini-api/docs/pricing
//
// Note: Re-verify prices before committing reference runs in Phase 4.
// Prices are correct as of 2026-03-15 but may change.

const PRICE_TABLE: Record<string, { inputPerMTok: number; outputPerMTok: number }> = {
  "anthropic/claude-sonnet-4-6": { inputPerMTok: 3.00, outputPerMTok: 15.00 },
  "openai/gpt-4o":               { inputPerMTok: 2.50, outputPerMTok: 10.00 },
  "google/gemini-1.5-pro":       { inputPerMTok: 1.25, outputPerMTok: 5.00 },
};

/**
 * Calculate cost in USD for a given model and token usage.
 *
 * Returns -1 as a sentinel value if the model is not in the price table.
 * Callers should handle -1 (e.g. log "unknown model — cost not calculated").
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const prices = PRICE_TABLE[model];
  if (!prices) return -1; // Unknown model — flag with sentinel value
  return (inputTokens / 1_000_000) * prices.inputPerMTok
       + (outputTokens / 1_000_000) * prices.outputPerMTok;
}
