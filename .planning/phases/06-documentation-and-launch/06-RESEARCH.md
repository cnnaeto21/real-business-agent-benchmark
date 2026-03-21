# Phase 6: Documentation and Launch - Research

**Researched:** 2026-03-21
**Domain:** Technical documentation writing for an open-source benchmark tool
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**README framing**
- Primary audience: AI builders / HN audience — not contributors or general technical readers
- Above the fold: tagline + 2-3 sentences on why this benchmark matters (the gap it fills) + single benchmark command
- Results table included (summary of 9 reference runs, link to live dashboard for full detail)
- "How it works" section: 3-4 bullet pipeline summary (harness → prompt → model → eval → score)
- "Add your own model" section: short section showing how to run against a different model
- "Limitations" callout in README: brief honest mention with link to LIMITATIONS.md for full detail
- Credit Bret Taylor's inspiration explicitly — link to original post, frame RBAB as the implementation of that concept

**LIMITATIONS.md tone**
- Direct engineering honesty — bullet list, no hedging, no apology
- Exactly the 4 required limitations: single-domain scope, no ground truth, single-pass judge, training data leakage risk
- Each limitation followed by a "what this means for you" implication (practical consequences for interpreters of results)
- Do NOT add additional limitations beyond the 4 required

**docs/scoring.md depth**
- Embed the actual score anchors (what Score 5 vs Score 1 looks like per dimension) — consolidates the rubric pattern from all three harnesses
- Include design rationale for the hybrid approach: no ground truth for business decisions, schema gate catches structural failures before spending judge credits, LLM judge scales without human graders
- Include a representative example scored JSON (pull from results/index.json — shows score + rationale per dimension)
- Composite formula: `(actionability + reasoning_transparency + completeness) / 3 × 20` → normalized 0-100

**docs/harness-spec.md structure**
- Reference spec format — field-by-field documentation of the harness package
- Document required files: harness.yaml, data/*.csv, prompt.md, schema.ts, rubric.md
- Document harness.yaml fields with their purpose and valid values
- Do NOT prescribe rubric dimension names — link to harnesses/inventory-optimization/rubric.md as the canonical example
- Do NOT document prompt template injection syntax — self-evident from YAML

### Claude's Discretion
- Exact wording of taglines and section headings
- Whether to include a table of contents in longer docs
- Code block formatting and syntax highlighting choices
- Whether README has a badges section (GitHub stars, license, etc.)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DOCS-01 | README explains methodology: what RBAB measures, how scoring works, known limitations | README structure decisions locked in CONTEXT.md; all source material (results data, pipeline, Bret Taylor framing) exists and is inventoried below |
| DOCS-02 | `docs/harness-spec.md` documents the harness package format so others can fork and adapt | harness.yaml YAML schema, file layout, and src/harness.ts loader behavior are all documented below — sufficient to write the spec |
| DOCS-03 | `docs/running.md` documents how to run a benchmark locally (env vars, install, single command) | ALREADY COMPLETE — file exists at docs/running.md; no work required |
| DOCS-04 | `docs/scoring.md` documents the hybrid scoring system (JSON validation + LLM judge) and rubric dimensions | Judge prompt, rubric anchors from inventory-optimization, and representative scored results all catalogued below |
| DOCS-05 | `LIMITATIONS.md` explicitly states: single-domain scope, no ground truth, single-pass judge, training data leakage risk | Exact 4 limitations with "what this means for you" framing specified in locked decisions |
</phase_requirements>

---

## Summary

Phase 6 is a pure documentation phase — no code changes. Four files need to be created from scratch (README.md, LIMITATIONS.md, docs/harness-spec.md, docs/scoring.md); one file already exists and is complete (docs/running.md). All source material is already in the repo: the harness.yaml canonical structure, rubric anchors, representative results data, judge prompt, and loader behavior.

The primary challenge is not research — it is synthesis. The planner must pull exact facts from existing artifacts (harness YAML fields, score anchors verbatim from rubric.md, representative scored JSON entries) and write documents that are precise enough to be tested against the phase's success criteria. Every success criterion is verifiable: a user can actually clone the repo and run the command; LIMITATIONS.md can be read and the 4 limitations confirmed; harness-spec.md can be evaluated by asking "could I author a harness from this alone?"

The secondary challenge is README framing: the audience is AI builders and the HN community. The document must open with the value proposition (fills a gap no other benchmark fills for business operations) and reach the benchmark command within the first screen.

**Primary recommendation:** Write all four documents in a single plan, ordered by dependency (scoring.md and harness-spec.md first since README links to them; LIMITATIONS.md next; README last so all link targets exist).

---

## Existing Artifacts Inventory

This section documents what already exists in the repo — the raw material every new doc draws from.

### docs/running.md — COMPLETE, DO NOT TOUCH

File exists at `docs/running.md`. Contains: prerequisites (Node 18+, npm 9+), clone + install commands, env var setup for all 3 providers, benchmark command, results directory layout, re-eval command, and troubleshooting. DOCS-03 is already satisfied. Other docs link to this file rather than duplicating it.

### harness.yaml — Canonical YAML Structure

All three harnesses use the same YAML schema. From `harnesses/inventory-optimization/harness.yaml`:

```yaml
name: inventory-optimization
version: 1.0.0
description: "..."

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

**Field semantics** (from reading harness.yaml + src/harness.ts):

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `name` | string | yes | Matches directory name; used as harness identifier in CLI (`--harness <name>`) |
| `version` | semver string | yes | Harness versioning — changing rubric or data requires a version bump to preserve result comparability |
| `description` | string | yes | Human-readable summary of the task |
| `data[].file` | path string | yes | Path relative to harness directory; loaded as raw CSV text |
| `data[].inject_as` | string | yes | Placeholder name in prompt template; becomes `{{inject_as}}` in prompt.md |
| `prompt.template` | path string | yes | Path to prompt.md relative to harness directory |
| `output.schema` | path string | yes | Path to Zod schema file (schema.ts); loaded via dynamic import at runtime |
| `eval.rubric` | path string | yes | Path to rubric.md; injected into judge prompt at eval time |
| `eval.judge_model` | provider/model string | yes | Fixed judge model — must be `anthropic/claude-sonnet-4-6` for all reference harnesses |
| `eval.judge_temperature` | number | yes | Must be 0 for reproducibility |
| `providers` | string[] | yes | List of models this harness has been validated against; advisory (does not restrict which models can be run) |

### Harness Directory Layout (from src/harness.ts + actual files)

```
harnesses/<harness-name>/
├── harness.yaml          # declarative spec (required)
├── prompt.md             # prompt template with {{placeholder}} injection points
├── schema.ts             # Zod schema exporting a named z.object() — loaded via dynamic import
├── rubric.md             # eval rubric with score anchors per dimension
└── data/
    ├── *.csv             # data files; filenames must match data[].file in harness.yaml
    └── ...
```

**Loader behavior** (from src/harness.ts — critical for harness-spec.md):
- Harness directory is resolved relative to `process.cwd()` — CLI must be run from repo root
- `{{placeholder}}` tokens in prompt.md are replaced with raw CSV text (not parsed objects)
- Unreplaced placeholders cause a thrown error — catches YAML/template mismatches at load time
- `# User Message Template` separator is required in prompt.md — text above is system prompt, text below is user message
- Missing separator throws an error

### Prompt Template Convention (from prompt.md)

The separator `# User Message Template` divides the file:
- Above the separator: system prompt content
- Below the separator (after injection): user message

### Schema Convention (from schema.ts)

```typescript
import { z } from "zod";

export const SchemaName = z.object({ ... });
export type SchemaNameType = z.infer<typeof SchemaName>;
```

The named export must be a `z.object()`. The runner loads via dynamic import and passes the schema to the provider adapter.

### Score Anchors — Verbatim from inventory-optimization/rubric.md

Three dimensions, consistent across all harnesses. The anchor text below is from inventory-optimization; harness-specific rubrics apply the same dimensions to different domain content.

**Dimension 1: Actionability**
- Score 5: Every recommendation specifies a concrete SKU identifier, a definitive action, an exact quantity, and a clear urgency level. A manager could place an order from this output alone without follow-up questions.
- Score 3: Recommendations identify which products need attention and the action type, but are vague about quantities or urgency. Directionally correct but not operationally complete.
- Score 1: General observations or restatements of the data with no actionable specifics tied to individual SKUs.

**Dimension 2: Reasoning Transparency**
- Score 5: Each recommendation traces its conclusion to exact values from the provided data (e.g., "current_stock=4 / velocity_7d=12 = 2.3 days remaining"). Calculations are explicit and reproducible.
- Score 3: References data trends in general terms ("high-velocity product", "stock is running low") but does not cite specific numeric values. A reader can infer what data was used but cannot verify the calculation.
- Score 1: Conclusions appear without any visible connection to the provided data. The response could have been generated without the input data.

**Dimension 3: Completeness**
- Score 5: Summary field synthesizes overall health beyond listing individual items. Recommendations array covers all SKUs requiring a decision. Data_gaps field identifies at least one genuine missing data point.
- Score 3: Required fields present but some are superficial: summary restates prompt, data_gaps is empty when obvious gaps exist, or recommendations omit borderline SKUs.
- Score 1: One or more required schema fields are missing, null, or contain placeholder content.

### Composite Score Formula

From CONTEXT.md and REQUIREMENTS.md (EVAL-05):

```
composite = (actionability + reasoning_transparency + completeness) / 3 × 20
```

Range: 0-100. Schema validation failure writes composite_score of 0; judge is never called.

### Representative Scored Result (from results/index.json)

For scoring.md example — the GPT-4o-mini / inventory-optimization result shows differentiated scores and is more instructive than the perfect 100 scores:

```json
{
  "run_id": "f39cf220-9c9f-49e5-a820-6b85b37efb12",
  "harness": "inventory-optimization",
  "harness_version": "1.0.0",
  "model": "openai/gpt-4o-mini",
  "composite_score": 67,
  "scores": {
    "actionability": {
      "score": 4,
      "rationale": "Every recommendation specifies a concrete SKU, a definitive action, an exact quantity, and a clear urgency level making it operationally executable; however, SNACK-PRETZEL-1OZ is incorrectly flagged for restock despite having stock well above par, undermining full executability."
    },
    "reasoning_transparency": {
      "score": 3,
      "rationale": "Rationale fields cite current_stock and velocity_7d values but do not show explicit calculations such as days-of-stock-remaining or comparison to par_level thresholds, making reasoning directionally verifiable but not fully reproducible."
    },
    "completeness": {
      "score": 3,
      "rationale": "All three required schema fields are present but data_gaps is an empty array despite obvious missing data points such as expiration dates and margin data, and the summary restates individual product issues rather than synthesizing overall inventory health."
    }
  },
  "schema_valid": true,
  "cost_usd": 0.00047415,
  "latency_ms": 12749,
  "run_date": "2026-03-19T23:57:29.924Z"
}
```

Composite check: (4 + 3 + 3) / 3 × 20 = 10/3 × 20 = 66.67 → rounds to 67. Confirmed.

### Reference Results Summary Table (for README)

All 9 runs from results/index.json:

| Model | inventory-optimization | pricing-strategy | financial-forecasting |
|-------|----------------------|------------------|-----------------------|
| anthropic/claude-sonnet-4-6 | 100 | 100 | 100 |
| openai/gpt-4o-mini | 67 | 67 | 60 |
| google/gemini-3.1-flash-lite-preview | 93 | 80 | 87 |

### Install and Run Commands (from package.json)

```bash
# Install
npm install

# Run a benchmark
benchmark --harness inventory-optimization --model anthropic/claude-sonnet-4-6

# Or via npm script
npm run benchmark -- --harness inventory-optimization --model anthropic/claude-sonnet-4-6
```

The `benchmark` binary is registered in `package.json` `bin` field pointing to `src/bin.ts`, run via tsx. After `npm install`, `benchmark` is available as a local bin command.

**Important:** The success criterion says `npm install && benchmark --harness inventory-optimization --model anthropic/claude-sonnet-4-6`. This works because `npm install` adds the local bin to PATH via `node_modules/.bin`. The README must note the user needs an `ANTHROPIC_API_KEY` set for this specific command.

### Provider Prefix Convention

- `anthropic/` → Anthropic SDK, tool-use structured output
- `openai/` → OpenAI SDK, json_schema mode
- `google/` → Google GenAI SDK, responseJsonSchema

---

## Architecture Patterns

### Document Writing Order

Write in dependency order to ensure links are valid when README is authored:

1. `docs/scoring.md` — standalone, no internal links to other new docs
2. `docs/harness-spec.md` — links to docs/running.md (exists) and harnesses/inventory-optimization/rubric.md (exists)
3. `LIMITATIONS.md` — standalone
4. `README.md` — links to all of the above plus the live dashboard URL

### README Structure Pattern

For HN/builder audience, the README must follow this pattern:
- **Above the fold:** Tagline + gap statement (2-3 sentences) + benchmark command block
- **Results summary:** Table with 9 reference runs + link to live dashboard
- **How it works:** 4-step pipeline (harness → prompt → model → eval → score) as bullet list
- **Limitations callout:** 2-3 sentences + link to LIMITATIONS.md
- **Credit:** Bret Taylor's inspiration with link
- **Add your own model:** Short section showing provider prefix pattern
- **License/contributing:** Minimal

### harness-spec.md Structure Pattern

Reference spec format — field docs before examples:
1. Overview paragraph: what a harness package is
2. Directory layout (tree diagram)
3. harness.yaml field-by-field table
4. prompt.md conventions (separator requirement, injection syntax)
5. schema.ts conventions (named export, z.object)
6. rubric.md conventions (link to canonical example, do NOT prescribe dimension names)
7. Link to docs/running.md for "run it" step

### scoring.md Structure Pattern

1. Why hybrid scoring: rationale section (no ground truth, schema gate, LLM scalability)
2. Stage 1: JSON schema validation gate
3. Stage 2: LLM judge — model, temperature, prompt reference
4. Scoring dimensions with verbatim anchors
5. Composite formula
6. Representative example (scored JSON)
7. Link to docs/judge-prompt.md for full judge prompt

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Results table in README | Custom HTML table | Standard GitHub Markdown table (renders natively) |
| Code blocks with syntax highlighting | Custom formatting | Fenced code blocks with language hint (```bash, ```yaml, ```json) |
| Harness spec navigation | Custom TOC | GitHub auto-generates TOC from headings; optionally add manual TOC if doc is long |

---

## Common Pitfalls

### Pitfall 1: README Command That Doesn't Match Success Criterion

**What goes wrong:** README shows `npx benchmark` or `npm run benchmark` but the success criterion specifies `benchmark --harness inventory-optimization --model anthropic/claude-sonnet-4-6` as a bare command.

**Why it happens:** The `bin` field in package.json installs the binary to `node_modules/.bin/benchmark` on `npm install`. After install, `benchmark` works as a bare command without `npx` prefix.

**How to avoid:** Use exactly `benchmark --harness inventory-optimization --model anthropic/claude-sonnet-4-6` in the README quick-start. Note that `ANTHROPIC_API_KEY` must be set for this exact command to succeed.

**Warning signs:** If README shows any prefix other than bare `benchmark`, the success criterion will fail.

### Pitfall 2: Duplicating docs/running.md Content

**What goes wrong:** README or harness-spec.md re-explains env var setup, install steps, or result directory layout — creating two sources that can drift.

**Why it happens:** Writers pull in context from running.md without checking that docs/running.md already covers it.

**How to avoid:** README quick-start shows only the minimum (install + single command). Full environment setup, API key instructions, and result layout are in docs/running.md via a link. harness-spec.md similarly links to running.md for "run your harness" step.

### Pitfall 3: LIMITATIONS.md Adding Extra Limitations

**What goes wrong:** Author adds a 5th limitation they think is relevant (e.g., "results not statistically significant", "judge model bias").

**Why it happens:** The topic naturally suggests more limitations.

**How to avoid:** CONTEXT.md locked exactly 4 limitations. Do not add more. The 4 required ones:
1. Single-domain scope (vending machine only)
2. No ground truth (LLM judge, not correct answers)
3. Single-pass judge (1 judge call per output, not averaged)
4. Training data leakage risk

### Pitfall 4: Score Anchor Text Inconsistency

**What goes wrong:** scoring.md paraphrases the rubric anchors rather than quoting them, creating ambiguity about what Score 5 or Score 1 actually means.

**Why it happens:** Writers summarize rather than copy-paste verbatim.

**How to avoid:** The score anchor text in scoring.md should quote verbatim from the rubric. The canonical source is `harnesses/inventory-optimization/rubric.md`. Note in scoring.md that harness-specific rubrics apply these dimensions to their own domain vocabulary.

### Pitfall 5: harness-spec.md Omitting the Separator Requirement

**What goes wrong:** A reader authors a new harness with a prompt.md that lacks `# User Message Template`. The harness loads but throws a runtime error.

**Why it happens:** The separator requirement is enforced in code (src/harness.ts) but easy to miss.

**How to avoid:** harness-spec.md must document the separator requirement explicitly under the prompt.md section: the exact string `# User Message Template` is required; text above becomes the system prompt, text below becomes the user message.

---

## Code Examples

Verified from actual repo files:

### harness.yaml (canonical example for harness-spec.md)

```yaml
# harnesses/inventory-optimization/harness.yaml
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

### schema.ts pattern (from actual inventory-optimization/schema.ts)

```typescript
import { z } from "zod";

export const InventoryRecommendation = z.object({
  summary: z.string().describe("One-paragraph executive summary..."),
  recommendations: z.array(
    z.object({
      sku: z.string().describe("Product SKU identifier"),
      action: z.enum(["restock", "hold", "reduce"]),
      quantity: z.number().int().min(0),
      rationale: z.string().describe("Explanation citing specific data values"),
      urgency: z.enum(["immediate", "this-week", "next-cycle"]),
    })
  ),
  data_gaps: z.array(z.string()),
});

export type InventoryRecommendationType = z.infer<typeof InventoryRecommendation>;
```

### prompt.md separator pattern (from actual inventory-optimization/prompt.md)

```markdown
# System Prompt

[System instructions here — becomes system message]

# User Message Template

[User content with {{placeholder}} tokens — becomes user message after CSV injection]
```

### Composite score formula

```
composite_score = (actionability + reasoning_transparency + completeness) / 3 × 20
```

Where each dimension score is an integer 1-5. Schema validation failure → composite_score = 0.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | No test framework detected — existing tests use Node built-in assert |
| Config file | none |
| Quick run command | `tsx scripts/validate-schemas.ts` |
| Full suite command | `tsx scripts/validate-schemas.ts && tsx scripts/verify-reference.ts` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DOCS-01 | README.md exists with methodology, scoring summary, limitations callout | manual | Read README.md and verify sections present | ❌ Wave 0 |
| DOCS-02 | docs/harness-spec.md exists with field-by-field harness.yaml docs | manual | Read docs/harness-spec.md and verify field table completeness | ❌ Wave 0 |
| DOCS-03 | docs/running.md documents local run | manual | File exists — ALREADY COMPLETE | ✅ exists |
| DOCS-04 | docs/scoring.md explains hybrid scoring, rubric dimensions, score anchors | manual | Read docs/scoring.md and verify all 3 dimensions + formula + example | ❌ Wave 0 |
| DOCS-05 | LIMITATIONS.md states exactly 4 required limitations | manual | Read LIMITATIONS.md and count limitations | ❌ Wave 0 |

Note: All DOCS requirements are documentation content requirements, not code behavior requirements. Automated testing is not applicable. Verification is manual read-and-confirm against the phase success criteria.

### Sampling Rate

- **Per task commit:** Visual review of written doc against the specific success criterion it satisfies
- **Per wave merge:** Full read of all 4 new docs against the complete success criteria list
- **Phase gate:** All 5 success criteria confirmed true before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `README.md` — satisfies DOCS-01; covers methodology, scoring reference, limitations callout
- [ ] `LIMITATIONS.md` — satisfies DOCS-05; exactly 4 limitations with implications
- [ ] `docs/harness-spec.md` — satisfies DOCS-02; field-by-field spec
- [ ] `docs/scoring.md` — satisfies DOCS-04; hybrid scoring explanation with anchors and example

*(No test infrastructure gaps — this phase requires no code and no test framework changes.)*

---

## Open Questions

1. **Live dashboard URL**
   - What we know: Dashboard is deployed to Vercel (Phase 5 complete); README must link to it
   - What's unclear: The exact Vercel URL is not in any planning file read during research
   - Recommendation: Planner should check with the user for the live URL before writing README, or use a placeholder `[DASHBOARD_URL]` that the executor fills in

2. **Bret Taylor's original post URL**
   - What we know: README must credit Bret Taylor's "CSS Zen Garden for agent harnesses" concept with a link
   - What's unclear: The exact URL to the LinkedIn post is not in any planning file
   - Recommendation: Planner includes `[BRET_TAYLOR_POST_URL]` placeholder; executor researches and fills in during authoring

3. **GitHub repo URL**
   - What we know: docs/running.md already has `https://github.com/obinnaeto/agentHarness.git` in the clone command
   - What's unclear: Whether this is the correct public URL (it may be the author's personal fork)
   - Recommendation: Treat this URL as confirmed since it's already in committed docs; README clone command should match

---

## Sources

### Primary (HIGH confidence)

- `harnesses/inventory-optimization/harness.yaml` — YAML schema field inventory, confirmed all field names and types
- `harnesses/inventory-optimization/rubric.md` — verbatim score anchors for all 3 dimensions
- `harnesses/inventory-optimization/schema.ts` — schema.ts export pattern
- `harnesses/inventory-optimization/prompt.md` — prompt separator pattern
- `src/harness.ts` — loader behavior: separator requirement, unreplaced placeholder validation, CSV injection mechanics
- `results/index.json` — all 9 reference scores confirmed; composite formula verified against raw scores
- `docs/running.md` — confirmed complete, covers DOCS-03 fully
- `docs/judge-prompt.md` — judge prompt confirmed at version 1.0.0
- `package.json` — confirmed `benchmark` bin entry, install commands, provider list
- `.planning/phases/06-documentation-and-launch/06-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)

- `harnesses/inventory-optimization/harness.yaml` cross-checked against STATE.md decisions log for provider prefix convention and YAML loader specifics

### Tertiary (LOW confidence — not applicable)

No LOW confidence findings. All research is derived from committed code and planning artifacts in the repo.

---

## Metadata

**Confidence breakdown:**
- Standard document content: HIGH — all raw material is in committed repo files; nothing needs to be invented
- Architecture (document order, structure): HIGH — derived from CONTEXT.md locked decisions + existing file relationships
- Pitfalls: HIGH — derived from reading actual loader code and understanding the success criteria
- Open questions: MEDIUM — two URLs are genuinely unknown; flagged explicitly

**Research date:** 2026-03-21
**Valid until:** Static phase — no external dependencies change; valid until Phase 6 execution complete
