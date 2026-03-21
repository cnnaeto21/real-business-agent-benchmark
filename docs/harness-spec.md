# Harness Package Specification

A harness package is a self-contained directory that defines a business task, sample data, output schema, and eval rubric for the RBAB benchmark runner. Adding a harness requires no changes to the runner code — the runner discovers and loads harnesses by directory name at runtime.

## Directory Layout

```
harnesses/<harness-name>/
├── harness.yaml          # declarative spec (required)
├── prompt.md             # prompt template with {{placeholder}} injection points
├── schema.ts             # Zod schema exporting a named z.object()
├── rubric.md             # eval rubric with score anchors per dimension
└── data/
    ├── *.csv             # data files; names must match data[].file in harness.yaml
    └── ...
```

All five files are required. The `data/` directory must contain at least one CSV file.

## harness.yaml

The `harness.yaml` file is the declarative spec that ties all other files together. The runner reads this file first to locate and load everything else.

### Field Reference

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `name` | string | yes | Matches directory name; used as harness identifier in CLI (`--harness <name>`) |
| `version` | semver string | yes | Bump when rubric or data changes — preserves result comparability |
| `description` | string | yes | Human-readable summary of the task |
| `data[].file` | path string | yes | Path relative to harness directory; loaded as raw CSV text |
| `data[].inject_as` | string | yes | Placeholder name in prompt template — becomes `{{inject_as}}` in prompt.md |
| `prompt.template` | path string | yes | Path to prompt.md relative to harness directory |
| `output.schema` | path string | yes | Path to Zod schema file (schema.ts); loaded via dynamic import at runtime |
| `eval.rubric` | path string | yes | Path to rubric.md; injected into judge prompt at eval time |
| `eval.judge_model` | provider/model string | yes | Fixed judge model — must be `anthropic/claude-sonnet-4-6` for all reference harnesses |
| `eval.judge_temperature` | number | yes | Must be `0` for reproducibility |
| `providers` | string[] | yes | Models this harness has been validated against; advisory (does not restrict which models can run) |

### Canonical Example

```yaml
name: inventory-optimization
version: 1.0.0
description: "Given current inventory levels and sales velocity data for a vending machine operation, recommend specific restocking actions for each SKU"

data:
  - file: data/inventory.csv
    inject_as: inventory_table
  - file: data/sales.csv
    inject_as: sales_table

prompt:
  template: prompt.md

output:
  schema: schema.ts

eval:
  rubric: rubric.md
  judge_model: anthropic/claude-sonnet-4-6
  judge_temperature: 0

providers:
  - anthropic/claude-sonnet-4-6
  - openai/gpt-4o-mini
  - google/gemini-3.1-flash-lite-preview
```

## prompt.md Conventions

### The `# User Message Template` Separator

Every `prompt.md` must contain the exact line:

```
# User Message Template
```

This separator divides the prompt into two parts:

- **Text above the separator** becomes the system prompt
- **Text below the separator** becomes the user message (after `{{placeholder}}` injection)

**Missing the separator causes the loader to throw a runtime error.** The runner does not fall back or warn — it throws immediately to prevent a silently malformed prompt from reaching a provider API.

### `{{placeholder}}` Resolution

Tokens in the format `{{name}}` in the user message section are replaced with the corresponding data file contents at load time. The token name must exactly match an `inject_as` value defined in `harness.yaml`. If a token in the template has no matching `inject_as` entry, the loader throws an error at load time.

### Example

```markdown
# System Prompt

You are analyzing operational data for a vending machine business.
Your task is to review the current inventory status and recent sales velocity,
then provide specific restocking recommendations for each product that requires a decision.

# User Message Template

Here is the current inventory status for each product:

```
{{inventory_table}}
```

Here is recent sales velocity data:

```
{{sales_table}}
```

Analyze this data and provide your restocking recommendations.
```

## schema.ts Conventions

The schema file must export a named `z.object()` using Zod. The named export is loaded via dynamic import at runtime; the runner discovers it by looking for the first exported `z.object()`.

```typescript
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
```

The schema is also used to generate the JSON schema passed to provider APIs for structured output enforcement.

## rubric.md Conventions

The rubric defines score anchors for each evaluation dimension. RBAB does not prescribe specific dimension names — custom harnesses may define their own dimensions suited to their domain.

The three reference dimensions used by all RBAB reference harnesses (actionability, reasoning_transparency, completeness) are defined with verbatim score anchors in [harnesses/inventory-optimization/rubric.md](../harnesses/inventory-optimization/rubric.md). This file serves as the canonical example for rubric authoring style and anchor calibration. See [docs/scoring.md](scoring.md) for a full explanation of how these dimensions are scored.

## Running Your Harness

For install, environment variable setup, and CLI usage, see [docs/running.md](running.md). The running guide covers all CLI flags, result file locations, and re-scoring an existing run without re-invoking the model.
