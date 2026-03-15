import { z } from "zod";

export const InventoryRecommendation = z.object({
  summary: z
    .string()
    .describe(
      "One-paragraph executive summary of overall inventory health and the highest-priority actions"
    ),
  recommendations: z
    .array(
      z.object({
        sku: z.string().describe("Product SKU identifier (e.g. DRINK-COLA-12OZ)"),
        action: z
          .enum(["restock", "hold", "reduce"])
          .describe("Recommended action for this SKU"),
        quantity: z
          .number()
          .int()
          .min(0)
          .describe(
            "Units to order; must be 0 if action is 'hold' or 'reduce'"
          ),
        rationale: z
          .string()
          .describe(
            "Explanation citing specific data values (e.g. '4-day stock at 12 units/day velocity')"
          ),
        urgency: z
          .enum(["immediate", "this-week", "next-cycle"])
          .describe("How soon the action must be taken"),
      })
    )
    .describe("One entry per SKU that requires a decision"),
  data_gaps: z
    .array(z.string())
    .describe(
      "Specific data points that are missing and would improve the recommendations"
    ),
});

export type InventoryRecommendationType = z.infer<typeof InventoryRecommendation>;
