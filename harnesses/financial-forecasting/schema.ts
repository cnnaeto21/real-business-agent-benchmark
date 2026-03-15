import { z } from "zod";

export const FinancialForecast = z.object({
  executive_summary: z
    .string()
    .describe(
      "2-3 sentence summary of current financial health and the most critical finding from the data"
    ),
  forecast: z
    .object({
      period: z
        .string()
        .describe(
          "The 3-month forecast period being projected (e.g., 'April–June 2026')"
        ),
      projected_revenue: z
        .number()
        .describe("Total projected revenue for the forecast period in dollars"),
      projected_expenses: z
        .number()
        .describe(
          "Total projected operating expenses for the forecast period in dollars"
        ),
      projected_net_income: z
        .number()
        .describe(
          "Projected net income for the forecast period (revenue minus expenses minus COGS)"
        ),
      confidence: z
        .enum(["high", "medium", "low"])
        .describe(
          "Confidence level in the forecast given data quality and trend stability"
        ),
      methodology: z
        .string()
        .describe(
          "Brief description of the forecasting approach used (e.g., 3-month trailing average, trend extrapolation)"
        ),
    })
    .describe("3-month forward financial projection"),
  risks: z
    .array(
      z.object({
        description: z
          .string()
          .describe(
            "Specific risk factor that could cause the forecast to be worse than projected"
          ),
        data_evidence: z
          .string()
          .describe("Which data points indicate this risk exists"),
        severity: z.enum(["high", "medium", "low"]),
      })
    )
    .describe("Factors that could cause underperformance vs. forecast"),
  opportunities: z
    .array(
      z.object({
        description: z
          .string()
          .describe(
            "Specific lever the operator could pull to improve performance"
          ),
        estimated_impact: z
          .string()
          .describe(
            "Rough magnitude of the opportunity (e.g., '$200-400/month in additional net income')"
          ),
        data_evidence: z
          .string()
          .describe("Which data points support this opportunity"),
      })
    )
    .describe("Levers available to improve on the base forecast"),
  data_limitations: z
    .array(z.string())
    .describe(
      "Specific data gaps that limit forecast accuracy or confidence — state none if the provided data is sufficient"
    ),
});

export type FinancialForecastType = z.infer<typeof FinancialForecast>;
