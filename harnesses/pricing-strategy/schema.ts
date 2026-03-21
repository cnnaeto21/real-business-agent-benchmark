import { z } from "zod";

export const PricingRecommendation = z.object({
  summary: z
    .string()
    .describe(
      "Executive summary of the overall pricing situation and highest-impact recommendations"
    ),
  recommendations: z
    .array(
      z.object({
        sku: z.string().describe("Product SKU identifier"),
        current_price: z
          .number()
          .describe("Current retail price in dollars (from the provided data)"),
        recommended_price: z
          .number()
          .describe("Recommended new retail price in dollars"),
        direction: z
          .enum(["increase", "decrease", "hold"])
          .describe("Direction of the price change"),
        rationale: z
          .string()
          .describe(
            "Data-driven justification citing specific sales figures, margin data, or velocity observations"
          ),
        confidence: z
          .enum(["high", "medium", "low"])
          .describe(
            "Confidence in the recommendation given available data quality"
          ),
      })
    )
    .describe("One entry per SKU requiring a pricing decision"),
  market_observations: z
    .array(z.string())
    .describe(
      "Broader patterns observed across the product catalog that inform the pricing strategy"
    ),
});

export type PricingRecommendationType = z.infer<typeof PricingRecommendation>;
