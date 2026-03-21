# Phase 6: Documentation and Launch - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Write the documentation that makes the repo self-contained and launch-ready: README.md, LIMITATIONS.md, docs/harness-spec.md, docs/scoring.md. The docs/running.md already exists from Phase 5. This phase does not add features — it makes existing features discoverable and the benchmark credible.

</domain>

<decisions>
## Implementation Decisions

### README framing
- Primary audience: AI builders / HN audience — not contributors or general technical readers
- Above the fold: tagline + 2-3 sentences on why this benchmark matters (the gap it fills) + single benchmark command
- Results table included (summary of 9 reference runs, link to live dashboard for full detail)
- "How it works" section: 3-4 bullet pipeline summary (harness → prompt → model → eval → score)
- "Add your own model" section: short section showing how to run against a different model
- "Limitations" callout in README: brief honest mention with link to LIMITATIONS.md for full detail
- Credit Bret Taylor's inspiration explicitly — link to original post, frame RBAB as the implementation of that concept

### LIMITATIONS.md tone
- Direct engineering honesty — bullet list, no hedging, no apology
- Exactly the 4 required limitations: single-domain scope, no ground truth, single-pass judge, training data leakage risk
- Each limitation followed by a "what this means for you" implication (practical consequences for interpreters of results)
- Do NOT add additional limitations beyond the 4 required

### docs/scoring.md depth
- Embed the actual score anchors (what Score 5 vs Score 1 looks like per dimension) — consolidates the rubric pattern from all three harnesses
- Include design rationale for the hybrid approach: no ground truth for business decisions, schema gate catches structural failures before spending judge credits, LLM judge scales without human graders
- Include a representative example scored JSON (can pull from results/index.json — shows score + rationale per dimension)
- Composite formula: `(actionability + reasoning_transparency + completeness) / 3 × 20` → normalized 0-100

### docs/harness-spec.md structure
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

</decisions>

<specifics>
## Specific Ideas

- docs/running.md already exists and is complete — harness-spec.md should link to it for the "run it" step rather than duplicating instructions
- The "Add your own model" README section should be short (show the command pattern, list available provider prefixes)
- Score anchors in scoring.md should acknowledge that they're consistent across all three harnesses (actionability/reasoning_transparency/completeness are the same dimensions — harness-specific rubrics apply them differently)
- Training data leakage limitation: "Scores may reflect memorized patterns rather than live reasoning — we have no way to distinguish this"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `docs/running.md` — complete local-run guide; harness-spec.md and README link to it, don't duplicate
- `docs/judge-prompt.md` — committed judge prompt; scoring.md references it
- `harnesses/inventory-optimization/rubric.md` — canonical rubric example for harness-spec.md
- `harnesses/inventory-optimization/harness.yaml` — canonical YAML example for harness-spec.md field docs
- `results/index.json` — real scored results; pull representative entry for scoring.md example

### Established Patterns
- Harness package structure: `harness.yaml`, `data/*.csv`, `prompt.md`, `schema.ts`, `rubric.md`
- Provider prefix convention: `anthropic/`, `openai/`, `google/` → model IDs

### Integration Points
- README links to: live Vercel dashboard, docs/running.md, docs/scoring.md, LIMITATIONS.md
- Dashboard already has "Run it yourself" section linking to docs/running.md — README and dashboard are consistent entry points

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-documentation-and-launch*
*Context gathered: 2026-03-21*
