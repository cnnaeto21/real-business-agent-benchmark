# Phase 3: Eval Engine - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the eval engine that takes a raw benchmark run result and produces a scored result. Pipeline: validate raw output against Zod schema → call LLM judge → compute composite score → write scored result → update run index. Invoked automatically at the end of every `benchmark` CLI run.

</domain>

<decisions>
## Implementation Decisions

### Eval Invocation
- Eval runs **automatically at the end of every `benchmark` CLI run** — no separate command
- If the judge API call fails (network error, rate limit, etc.): write raw output and meta.json successfully, log scoring error to stderr, exit code 0. Raw/ directory exists without scored/. Preserves the expensive model API call.
- CLI prints scores **inline** after a successful scored run:
  ```
  Scores: Actionability 4/5 · Reasoning 3/5 · Completeness 5/5
  Composite: 80/100
  ```
- `--no-eval` flag skips scoring for the run (useful for smoke tests / debugging without burning judge credits). Raw output and meta.json still written.

### Schema Validation Failures
- Zod `safeParse` failure → score **0 across all dimensions**, composite 0/100
- Written to `results/<run-id>/scored/<model-slug>.json` like a normal result (no special status field)
- `validation_error` field included in scored output with the Zod error message (e.g., `"recommendations[2].quantity: expected number, received string"`)
- `schema_valid: false` flag set in scored output and index.json entry
- If judge returns malformed JSON (not matching score schema): **retry once**, then treat as judge API failure (raw saved, scored/ not written)

### index.json Structure
- Flat array — one entry appended per run, **deduplicated by run_id** (re-scoring replaces the existing entry)
- Each entry shape:
  ```json
  {
    "run_id": "e84a55fa-...",
    "harness": "inventory-optimization",
    "harness_version": "1.0.0",
    "model": "anthropic/claude-sonnet-4-6",
    "composite_score": 80,
    "scores": {
      "actionability": { "score": 4, "rationale": "..." },
      "reasoning_transparency": { "score": 3, "rationale": "..." },
      "completeness": { "score": 5, "rationale": "..." }
    },
    "schema_valid": true,
    "cost_usd": 0.057537,
    "latency_ms": 45215,
    "run_date": "2026-03-16T14:50:26.544Z"
  }
  ```
- Rationale strings included per dimension (enables dashboard hover tooltips without second file read)
- `harness_version` included for traceability (scores from harness v1.0.0 vs v1.1.0 are distinguishable)
- Replace existing entry when same run_id is re-scored (deduplicated, not append)

### Claude's Discretion
- How the judge is called (direct Anthropic SDK call vs. reusing the provider adapter — note: provider adapter uses tool use, judge needs plain text JSON response, so likely a direct call)
- File locking strategy for concurrent index.json writes
- Exact Zod schema for validating the judge's response (score + rationale per dimension)

</decisions>

<specifics>
## Specific Ideas

- The judge prompt is already locked at `docs/judge-prompt.md` with `{{model_output}}` and `{{rubric}}` placeholders — eval engine injects harness-specific content at runtime
- Composite formula locked: `(actionability + reasoning_transparency + completeness) / 3 * 20` → normalized 0-100
- Judge model locked: `anthropic/claude-sonnet-4-6` at temperature 0

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/output.ts` — `writeResults` pattern for creating run directory hierarchy with `mkdir({ recursive: true })`. Eval engine follows the same pattern for `results/<run-id>/scored/`
- `src/harness.ts` — `loadHarness` returns `spec` with `spec.eval.rubric` path and `spec.eval.judge_model` — eval engine reads these from the already-loaded spec
- `src/cli.ts` — `runBenchmark` is the orchestration entry point where eval hooks in after `writeResults`
- `src/cost.ts` — cost calculation already done in `writeResults`; `meta.json` has `cost_usd` which eval can read for index entry

### Established Patterns
- File writes use `fs/promises` (`mkdir`, `writeFile`) — maintain this pattern
- Model slug: `opts.model.replace(/\//g, "--")` for filesystem-safe filenames — same applies to scored/ output
- TypeScript with `tsx` runtime, no compile step

### Integration Points
- `src/cli.ts:runBenchmark` — after `writeResults` returns `{ runDir }`, eval engine is called with `{ runDir, harnessName, rawOutput, modelSlug, runId, meta }`
- `harnesses/<name>/rubric.md` — eval engine reads this file to inject into judge prompt
- `docs/judge-prompt.md` — eval engine reads this as the judge prompt template
- `results/index.json` — eval engine upserts entries here after each scored run

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-eval-engine*
*Context gathered: 2026-03-16*
