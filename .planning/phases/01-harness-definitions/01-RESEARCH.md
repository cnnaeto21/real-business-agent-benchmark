# Phase 1: Harness Definitions - Research

**Researched:** 2026-03-15
**Domain:** Benchmark harness authoring — Zod schemas, YAML spec design, LLM-as-judge prompt engineering, CSV data anonymization
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HRNS-01 | Three harness packages exist: inventory-optimization, pricing-strategy, financial-forecasting | Directory structure pattern, harness.yaml schema documented in ARCHITECTURE.md |
| HRNS-02 | Each harness has a `harness.yaml` declarative spec (data files, prompt template, schema path, rubric path, judge model, provider list) | harness.yaml schema fully specified — see Architecture Patterns section |
| HRNS-03 | Each harness includes anonymized CSV data with location names and dollar amounts scrubbed | Anonymization strategy documented — pattern preservation approach |
| HRNS-04 | Each harness has a structured output schema defined in Zod (generates TypeScript types and JSON Schema from single source) | CRITICAL: Zod v4 (current stable) uses `z.toJSONSchema()` natively — the old `zod-to-json-schema` package is EOL. Use Zod v4 natively. |
| HRNS-05 | Each harness has an eval rubric with concrete score anchors per dimension ("Score 5 means X; Score 1 means Y") | Rubric design documented; score anchor patterns from MT-Bench/Prometheus research |
| HRNS-06 | Rubric includes explicit anti-verbosity instruction | Exact anti-verbosity phrasing and placement documented |
| HRNS-07 | Each harness is versioned (semver in harness.yaml) | `version: 1.0.0` field in harness.yaml spec |
| EVAL-02 | Eval engine calls Claude Sonnet (temperature 0) as fixed LLM judge for all runs | Judge model designation in harness.yaml; judge prompt structure documented |

</phase_requirements>

---

## Summary

Phase 1 is a pure authoring phase — no runtime code, no API calls. The deliverables are filesystem artifacts: three harness directories, each containing a `harness.yaml`, anonymized CSV data files, a prompt template markdown, a Zod output schema TypeScript file, an eval rubric markdown, and one shared judge prompt document at `docs/judge-prompt.md`.

The most critical risk in this phase is rubric vagueness. If score anchors are ambiguous, the LLM judge will produce arbitrary scores, invalidating all downstream results. This is the one decision that cannot be patched after reference runs are committed — changing the rubric requires re-running and re-scoring all nine reference runs. The rubric and judge prompt must be authored with the same care as an API contract.

A significant dependency update has been discovered: **`zod-to-json-schema` is EOL as of November 2025**. The success criterion "Running the Zod schema through `zod-to-json-schema`" should be implemented using Zod v4's native `z.toJSONSchema()` instead. This is strictly better — same result, first-party API, no deprecated dependency. The planner should reflect this update.

**Primary recommendation:** Author the rubric score anchors first (before prompt templates or schemas) — they are the highest-stakes artifact. Use Zod v4 `z.toJSONSchema()` (not the deprecated `zod-to-json-schema` package).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zod` | ^4.3.6 (v4 stable) | Output schema definition | Single source of truth: generates TypeScript types AND JSON Schema via `z.toJSONSchema()`. Zod v4 makes the external `zod-to-json-schema` package unnecessary. |
| `typescript` | ^5.4.0 | Schema file language | Schema files are `.ts` — TypeScript infers output types from Zod schema automatically |
| `js-yaml` | ^4.1.0 | Parse harness.yaml in later phases | Runner will need this; referencing it in harness.yaml design is forward-compatible |

### Important Version Note: Zod v4

The existing project research (2026-03-12) recommended `zod` ^3.23 + `zod-to-json-schema` ^3.23. **This is now outdated:**

- Zod v4 was released stable on npm on July 10, 2025
- Current latest: 4.3.6
- `zod-to-json-schema` is officially EOL as of November 2025 — maintainer recommends Zod v4 native API
- Zod v4 has a native `z.toJSONSchema(schema)` that replaces the external package entirely
- Zod v4 is a breaking change from v3; migration guide exists at `https://zod.dev/v4`

**Use Zod v4 from the start.** Do not install `zod-to-json-schema`.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tsx` | ^4.15.0 | Execute TypeScript schema files | Phase 1 only needs this if manually verifying schema output; Phase 2 runner will use it |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod v4 native `z.toJSONSchema()` | `zod-to-json-schema` (EOL) | EOL package still works for v3 schemas but receives no updates — wrong choice for a new project |
| Zod | JSON Schema hand-authored | Zod generates both TS types AND JSON Schema from one source; hand-authoring both separately creates drift risk |
| YAML for harness spec | JSON | YAML supports comments (useful for human-authored spec files); JSON does not |

**Installation (Phase 1 scope — schema authoring only):**
```bash
npm install zod@^4.3.6
npm install --save-dev typescript tsx
```

---

## Architecture Patterns

### Harness Directory Structure

```
harnesses/
├── inventory-optimization/
│   ├── harness.yaml          # declarative spec
│   ├── prompt.md             # system prompt + user prompt template
│   ├── schema.ts             # Zod schema (TypeScript source)
│   ├── rubric.md             # eval rubric with score anchors
│   └── data/
│       ├── inventory.csv     # anonymized inventory snapshot
│       └── sales.csv         # anonymized sales velocity data
├── pricing-strategy/
│   ├── harness.yaml
│   ├── prompt.md
│   ├── schema.ts
│   ├── rubric.md
│   └── data/
│       ├── products.csv      # SKUs, current prices, cost
│       └── sales.csv         # sales velocity by price point
└── financial-forecasting/
    ├── harness.yaml
    ├── prompt.md
    ├── schema.ts
    ├── rubric.md
    └── data/
        ├── monthly-pl.csv    # monthly P&L history
        └── expenses.csv      # expense categories
docs/
└── judge-prompt.md           # shared judge prompt (EVAL-02)
```

### Pattern 1: harness.yaml Spec

**What:** Declarative YAML file that is the single configuration entry point for a harness. The runner reads this file to know where all other files are and how to run the eval.

**When to use:** Every harness — required by HRNS-02.

```yaml
# Source: ARCHITECTURE.md — project-specific schema
name: inventory-optimization
version: 1.0.0
description: "Given current inventory levels and sales velocity, recommend restocking actions"

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
  - openai/gpt-4o
  - google/gemini-1.5-pro
```

### Pattern 2: Zod Output Schema (v4)

**What:** TypeScript file defining the expected structured output from a subject model. Drives TypeScript types AND JSON Schema for provider structured-output APIs.

**When to use:** Each harness needs one `schema.ts`. Use Zod v4 API.

```typescript
// Source: https://zod.dev/json-schema (Zod v4 official docs)
import { z } from "zod";

export const InventoryRecommendation = z.object({
  summary: z.string().describe("One-paragraph executive summary of restocking situation"),
  recommendations: z.array(z.object({
    sku: z.string().describe("Product SKU identifier"),
    action: z.enum(["restock", "hold", "reduce"]),
    quantity: z.number().int().describe("Units to order (0 if action is hold/reduce)"),
    rationale: z.string().describe("Why this action is recommended, citing specific data"),
    urgency: z.enum(["immediate", "this-week", "next-cycle"]),
  })),
  data_gaps: z.array(z.string()).describe("Missing data that would improve this recommendation"),
});

export type InventoryRecommendationType = z.infer<typeof InventoryRecommendation>;

// Generate JSON Schema for provider structured output APIs:
// import { z } from "zod";
// const jsonSchema = z.toJSONSchema(InventoryRecommendation);
```

### Pattern 3: Rubric with Score Anchors

**What:** Markdown file defining the evaluation rubric. Each dimension has explicit score anchors at levels 1, 3, and 5, plus the anti-verbosity instruction.

**When to use:** Each harness needs one `rubric.md`. This is the most important artifact of Phase 1.

```markdown
# Eval Rubric: Inventory Optimization

## Anti-Verbosity Instruction
Do not score higher simply because the response is longer or more elaborate.
A concise, specific recommendation citing exact data values scores higher than
a verbose but vague response covering all possibilities.

## Dimension 1: Actionability
Does the response provide recommendations specific enough to act on without further clarification?

**Score 5:** Every recommendation includes a specific SKU, a specific action (restock/hold/reduce),
an exact quantity, and a stated urgency level. A warehouse manager could execute these
instructions without asking a follow-up question.

**Score 3:** Recommendations identify which products to act on but are vague about quantities
or timing (e.g., "restock Product X soon" without a number or deadline).

**Score 1:** Recommendations are general observations (e.g., "you should manage inventory better")
with no actionable specifics tied to the provided data.

## Dimension 2: Reasoning Transparency
Does the response show its work — which data points drove which conclusions?

**Score 5:** Each recommendation traces its conclusion to specific values from the provided data
(e.g., "Product X has 4-day stock at current velocity of 12 units/day, triggering immediate restock").
Data citations use exact numbers from the CSV.

**Score 3:** Recommendations reference general trends from the data ("high-velocity product")
but do not cite specific values or velocity figures.

**Score 1:** Conclusions appear without any connection to the provided data.
The response could have been written without seeing the CSV at all.

## Dimension 3: Completeness
Does the output address all required schema fields and cover the key decision factors?

**Score 5:** All schema fields are populated with meaningful values. The summary addresses
overall inventory health. Recommendations cover the full range of SKUs needing attention.
Data gaps are identified where applicable.

**Score 3:** Required fields are present but some are superficial (e.g., data_gaps is an empty list
when obvious gaps exist, or the summary restates the prompt rather than synthesizing findings).

**Score 1:** One or more required schema fields are missing or contain placeholder content.
```

### Pattern 4: Prompt Template

**What:** Markdown file with `{{variable}}` placeholders that the runner injects CSV data into. The system section defines the task context; the user section provides the actual data.

**When to use:** Each harness. Keep the system prompt neutral — describe the task and output format without implying what the conclusion should be.

```markdown
# System Prompt

You are evaluating inventory data for a vending machine operation.
Your task is to analyze the current inventory and sales data provided
and produce structured recommendations for restocking actions.

A data dictionary is provided below to ensure consistent interpretation:
- **SKU**: Stock Keeping Unit — unique product identifier
- **par_level**: Minimum stock quantity before restocking is required
- **velocity_7d**: Units sold in the last 7 days
- **COGS**: Cost of Goods Sold — product cost to the operator

Respond using the exact JSON schema provided. Do not add commentary outside the schema fields.

# User Message Template

Here is the current inventory status:

```
{{inventory_table}}
```

Here is recent sales velocity (last 30 days):

```
{{sales_table}}
```

Analyze this data and provide your restocking recommendations.
```

### Pattern 5: Judge Prompt (docs/judge-prompt.md)

**What:** Shared prompt used by the eval engine when calling Claude Sonnet as judge. Must be committed to `docs/judge-prompt.md` (EVAL-02, REF-03).

**Structure:**
1. Role and task description (judge is scoring, not helping)
2. The subject model's output (injected at runtime)
3. The harness rubric (injected at runtime from rubric.md)
4. Anti-bias instructions (verbosity, self-enhancement)
5. Required output format (structured JSON with score + rationale per dimension)

```markdown
# Judge Prompt

You are an impartial evaluator scoring the quality of an AI agent's response
to a business task. You are NOT the agent — your role is to assess the response
objectively against the rubric below.

## Subject Model Output
{{model_output}}

## Evaluation Rubric
{{rubric}}

## Scoring Instructions
- Score each dimension independently on a 1-5 scale using the rubric anchors above.
- Do not score higher simply because the response is longer or more detailed.
  A concise, specific answer scores higher than a verbose but vague one.
- Do not infer quality from formatting (bullet points, headers) — evaluate substance.
- Provide a one-sentence rationale citing specific evidence from the output.

## Required Output Format
Return valid JSON matching this schema:
{
  "actionability": { "score": <1-5>, "rationale": "<one sentence>" },
  "reasoning_transparency": { "score": <1-5>, "rationale": "<one sentence>" },
  "completeness": { "score": <1-5>, "rationale": "<one sentence>" }
}
```

### Pattern 6: CSV Anonymization Strategy

**What:** Remove identifying information while preserving the statistical patterns that make the benchmark meaningful.

**Rules:**
- Location names: replace with generic codes (LOC-A, LOC-B, LOC-C...)
- Dollar amounts: replace with relative amounts (scale by a fixed multiplier that preserves ratios)
- SKU names: replace with generic codes (SKU-001, SKU-002...) or generic category names (DRINK-COLA-12OZ)
- Dates: keep relative structure but shift by a fixed offset (pattern preserved, absolute date obfuscated)
- Quantities and velocities: keep as-is (these are the signal — the data is worthless without them)

**Anti-Patterns to Avoid**
- **Neutral system prompt avoided:** Do not use role personas like "You are a cost-cutting expert" — they bias conclusions
- **Business jargon without glossary:** Include a data dictionary in the prompt for all domain terms (par_level, velocity_7d, COGS)
- **Rubric score anchors at only the extremes:** Must anchor 1, 3, and 5 — a gap at 3 leaves judges interpolating inconsistently
- **Missing anti-verbosity instruction:** Must be present in both the rubric AND the judge prompt
- **Identical rubric across harnesses:** Each harness has different output schema fields — rubric completeness dimension must reference the specific schema

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Zod → JSON Schema conversion | Custom serializer | `z.toJSONSchema()` (Zod v4 native) | Handles nullable, union, recursive, and enum types correctly; one line of code |
| TypeScript types from schema | Separate type definitions | `z.infer<typeof MySchema>` | Types are always in sync with the runtime schema — zero drift |
| YAML parsing | Custom parser | `js-yaml` | YAML has 12 known edge cases (multiline strings, booleans, octal numbers); don't hand-roll |
| Score normalization | Custom math | Unweighted average × 20 (maps 1-5 average to 0-100) | Trivial formula; document it, don't library it |

**Key insight:** The hard problem in this phase is content authoring (rubric quality, prompt neutrality, schema completeness), not engineering. The engineering is straightforward — don't over-engineer it.

---

## Common Pitfalls

### Pitfall 1: Vague Rubric Dimensions

**What goes wrong:** Score anchors use adjectives without operational definitions. "Score 5 means excellent actionability" tells the judge nothing. Results become arbitrary and irreproducible.

**Why it happens:** Rubric authors write from intuition rather than defining what a reviewer would actually see at each score level.

**How to avoid:** For each dimension, ask: "If I showed ten different people this rubric and this model output, would they all give the same score?" Write the anchor so the answer is yes. Cite observable artifacts (specific fields, exact values, traceable claims).

**Warning signs:** Judge rationales are nearly identical across all models. One model consistently scores all 5s or all 1s. Score distributions have no variance.

### Pitfall 2: Verbosity Bias in Judge

**What goes wrong:** The judge model rates longer responses higher regardless of quality. Well-documented finding from AlpacaEval research. Results favor verbose models.

**Why it happens:** LLM judges trained on human feedback absorb human tendencies — humans often equate length with effort and thoroughness.

**How to avoid:** Place the anti-verbosity instruction in BOTH the rubric (eval-rubric.md) and the judge prompt (docs/judge-prompt.md). Use the exact language: "Do not score higher simply because the response is longer."

**Warning signs:** The model with the highest word count always wins composite score. Qualitative review of outputs does not match scores.

### Pitfall 3: Leading System Prompt

**What goes wrong:** System prompt implies a correct answer direction. "You are a cost-cutting expert" makes inventory recommendations lean toward reducing stock regardless of data.

**Why it happens:** Prompt authors unconsciously embed their own domain assumptions.

**How to avoid:** System prompt describes the task (analyze the data, produce recommendations) and output format only. No role persona that implies a conclusion direction. Have someone else read the prompt before committing.

**Warning signs:** All three subject models reach the same qualitative conclusion regardless of what the data shows.

### Pitfall 4: Missing Business Jargon Glossary

**What goes wrong:** Data columns named `par_level`, `velocity_7d`, `COGS` are opaque to models without vending industry training. Models score poorly due to terminology confusion, not reasoning failure.

**Why it happens:** The harness author knows these terms and forgets they require definition.

**How to avoid:** Include a data dictionary section in every system prompt. Define every non-obvious column name used in the injected CSV.

**Warning signs:** Model rationale mentions uncertainty about what a column means, or ignores key columns.

### Pitfall 5: Mismatched Schema and Rubric

**What goes wrong:** The completeness rubric dimension references fields that don't exist in the Zod schema, or the schema has fields the rubric doesn't mention. Scores are inconsistent.

**How to avoid:** Write the schema first, then write the rubric completeness dimension by listing the exact schema fields. Review both together before committing.

### Pitfall 6: Using `zod-to-json-schema` (Deprecated)

**What goes wrong:** Project installs the `zod-to-json-schema` npm package, which is EOL as of November 2025. The success criterion in the phase spec references this package by name — this is outdated.

**How to avoid:** Use `zod` v4 and call `z.toJSONSchema(MySchema)` directly. This produces equivalent JSON Schema with no external dependency.

**Source:** [zod-to-json-schema npm page](https://www.npmjs.com/package/zod-to-json-schema) — EOL notice; [Zod v4 JSON Schema docs](https://zod.dev/json-schema)

---

## Code Examples

### Zod v4 Schema with JSON Schema Generation

```typescript
// Source: https://zod.dev/json-schema (Zod v4 official docs)
import { z } from "zod";

// Define schema once — drives TypeScript types AND JSON Schema
export const PricingRecommendation = z.object({
  summary: z.string().describe("Overall pricing assessment"),
  recommendations: z.array(z.object({
    sku: z.string(),
    current_price: z.number().describe("Current price in dollars"),
    recommended_price: z.number().describe("Recommended price in dollars"),
    direction: z.enum(["increase", "decrease", "hold"]),
    rationale: z.string().describe("Data-driven justification citing specific sales figures"),
    confidence: z.enum(["high", "medium", "low"]),
  })),
  market_observations: z.array(z.string()).describe("Broader pricing dynamics observed in the data"),
});

// TypeScript type — zero extra work
export type PricingRecommendationType = z.infer<typeof PricingRecommendation>;

// JSON Schema for provider structured output APIs — one line
export const pricingJsonSchema = z.toJSONSchema(PricingRecommendation);
// pricingJsonSchema is a plain JSON object — pass to OpenAI response_format, Gemini responseSchema
```

### harness.yaml — Minimal Valid Example

```yaml
# Source: ARCHITECTURE.md — project harness spec
name: pricing-strategy
version: 1.0.0
description: "Given product sales velocity and competitor context, recommend price adjustments"

data:
  - file: data/products.csv
    inject_as: products_table
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
  - openai/gpt-4o
  - google/gemini-1.5-pro
```

### Verifying Zod Schema Produces Valid JSON Schema

```bash
# One-shot schema verification — no separate package needed
npx tsx -e "
import { z } from 'zod';
import { InventoryRecommendation } from './harnesses/inventory-optimization/schema.ts';
const s = z.toJSONSchema(InventoryRecommendation);
console.log(JSON.stringify(s, null, 2));
"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `zod-to-json-schema` npm package | `z.toJSONSchema()` (Zod v4 native) | Zod v4 stable: July 2025; `zod-to-json-schema` EOL: November 2025 | Remove the external dependency; use native API |
| Zod v3 object schema | Zod v4 (breaking changes) | July 10, 2025 | New install: `zod@^4.3.6`. Error customization API changed. |
| MT-Bench pairwise comparison | Independent pointwise scoring per model | Research finding (Zheng et al., 2023) | RBAB already uses pointwise — confirmed correct choice |

**Deprecated:**
- `zod-to-json-schema` npm package: EOL November 2025, replaced by `z.toJSONSchema()` in Zod v4. Do not install.
- Zod v3: Still works but new projects should start on v4. The phase success criterion referencing `zod-to-json-schema` should be updated to use `z.toJSONSchema()`.

---

## Open Questions

1. **Domain-specific output schema fields for pricing-strategy and financial-forecasting**
   - What we know: inventory-optimization schema is well-defined (SKUs, actions, quantities, urgency). The pricing harness needs price comparison fields. The forecasting harness needs forecast horizon and confidence interval fields.
   - What's unclear: The exact field list for each harness requires business domain judgment — what questions does a vending operator actually need answered?
   - Recommendation: Author the schemas as part of task authoring. The planner should include a task to draft schema fields for each harness domain specifically, not treat them as generic.

2. **Score anchor calibration: binary vs. 1-5**
   - What we know: Research (evidentlyai guide) notes binary judgments are more reliable and consistent than 1-5 scales. The RBAB spec requires 1-5.
   - What's unclear: Whether the 1-5 scale needs three-point anchors (1, 3, 5) or five-point anchors (1, 2, 3, 4, 5) for reliable judge consistency.
   - Recommendation: Use three-point anchors (1, 3, 5) with explicit behavioral descriptions. This follows Prometheus-style rubric design and is enough for consistent calibration without overwhelming the author.

3. **CSV data volume: how many rows is appropriate?**
   - What we know: The prompt must fit in model context windows. The data must be substantive enough to support differentiated recommendations across models.
   - What's unclear: Optimal row count balancing realism vs. prompt length.
   - Recommendation: 15-25 rows per CSV (real vending operations manage ~50-100 SKUs; 15-25 covers the core decision cases). Include a mix of: clear restock triggers, borderline cases, and SKUs to hold. This creates enough signal for models to demonstrate differentiated reasoning.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None installed yet — Wave 0 gap |
| Config file | None — see Wave 0 |
| Quick run command | `npx tsx -e "import { z } from 'zod'; ..."` (manual schema verify) |
| Full suite command | TBD — Phase 1 is content authoring; automated tests are Phase 2+ |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HRNS-04 | Zod schema for each harness produces valid JSON Schema | smoke | `npx tsx scripts/verify-schemas.ts` | Wave 0 |
| HRNS-05 | Each rubric.md contains score anchors for all 3 dimensions | manual | Read each rubric.md, verify anchors at 1/3/5 | N/A |
| HRNS-06 | Each rubric.md contains anti-verbosity instruction | manual | grep "Do not score higher" in each rubric.md | N/A |
| HRNS-07 | Each harness.yaml has a valid semver version field | smoke | `npx tsx scripts/verify-harnesses.ts` | Wave 0 |
| EVAL-02 | docs/judge-prompt.md exists and references 3 dimensions | manual | Read file, verify structure | N/A |

### Sampling Rate

- **Per task commit:** Manual review of each authored artifact against success criteria
- **Per wave merge:** Run `npx tsx scripts/verify-schemas.ts` to confirm JSON Schema generation succeeds for all three harnesses
- **Phase gate:** All five success criteria verified (3 directories, 3 rubrics with anchors, 3 schemas roundtrip, judge-prompt.md committed, semver in each harness.yaml)

### Wave 0 Gaps

- [ ] `scripts/verify-schemas.ts` — imports each schema.ts, calls `z.toJSONSchema()`, logs result; covers HRNS-04
- [ ] `scripts/verify-harnesses.ts` — parses each harness.yaml, validates required fields and semver; covers HRNS-07
- [ ] `package.json` at repo root with `zod@^4.3.6` and `tsx` dev dependency

---

## Sources

### Primary (HIGH confidence)

- [Zod v4 JSON Schema docs](https://zod.dev/json-schema) — confirmed `z.toJSONSchema()` API, stable in v4
- [Zod v4 release notes](https://zod.dev/v4) — breaking changes from v3, performance improvements, new native JSON Schema support
- [zod-to-json-schema npm](https://www.npmjs.com/package/zod-to-json-schema) — EOL notice confirmed
- `.planning/research/ARCHITECTURE.md` — harness.yaml schema, file structure, anti-patterns
- `.planning/research/PITFALLS.md` — verbosity bias, positional bias, self-evaluation bias (MT-Bench / AlpacaEval citations)
- `.planning/research/FEATURES.md` — rubric dimensions, MVP feature set
- `.planning/research/SUMMARY.md` — architecture decisions, research flags for Phase 1

### Secondary (MEDIUM confidence)

- [evidentlyai LLM-as-judge guide](https://www.evidentlyai.com/llm-guide/llm-as-a-judge) — score anchor best practices, anti-verbosity safeguards
- [MT-Bench paper (Zheng et al., 2023)](https://arxiv.org/abs/2306.05685) — positional bias, pairwise vs. pointwise design decisions
- [InfoQ: Zod v4 available](https://www.infoq.com/news/2025/08/zod-v4-available/) — stable release confirmation, version 4.0.0 on npm July 2025

### Tertiary (LOW confidence)

- WebSearch results on rubric score anchors and business evaluation rubrics — patterns described are consistent with official research but not directly verifiable from a single authoritative source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Zod v4 stable release confirmed, `zod-to-json-schema` EOL confirmed from official npm page
- Architecture: HIGH — harness spec from existing project research, file structure from ARCHITECTURE.md
- Rubric design: MEDIUM — best practices from MT-Bench/AlpacaEval are research-backed; specific anchor wording is domain judgment
- Pitfalls: HIGH — verbosity bias and positional bias are published research findings with citations

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (Zod version; check npm for latest 4.x patch before install)

**Critical update for planner:** The phase success criterion states "Running the Zod schema through `zod-to-json-schema`" — this package is EOL. The verification command should use `z.toJSONSchema()` from Zod v4 directly. Planner should update any task that references `zod-to-json-schema` to use Zod v4 native API instead.
