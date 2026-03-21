# Phase 4: Reference Runs - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Execute 9 benchmark runs (3 harnesses × 3 models: Claude Sonnet, GPT-4o, Gemini 1.5 Pro), validate results, and commit them to git. No new architectural features — this phase uses the fully-built CLI + eval engine from Phases 1–3. Deliverables: populated `results/` directory, `results/index.json` with 9 valid entries, and `docs/judge-prompt.md` verified committed.

</domain>

<decisions>
## Implementation Decisions

### Result cleanliness
- Clear `results/*/` and reset `index.json` to `[]` before starting reference runs
- The existing test run (inventory-optimization + Claude Sonnet) is NOT a reference run — delete it
- All 9 reference run folders + final `index.json` committed to git in a single atomic commit after all runs complete
- reference runs are the only entries in `index.json` when committed

### Run orchestration
- Node.js script at `scripts/run-reference.ts`, invoked via `npm run reference`
- Follows existing `npm run validate` / `npm run benchmark` pattern — discoverable, consistent
- Script handles: clear results/ → run 9 sequentially → verify → print summary
- Sequential execution (not parallel) — avoids rate limits; ~7 minutes total at ~45s/run
- Script uses `child_process` to spawn the existing `benchmark` CLI as subprocesses
- `scripts/verify-reference.ts` is a **separate** script for standalone verification
  - Invoked as `npm run verify-reference` (or called internally from run-reference.ts at the end)
  - Checks: exactly 9 entries in index.json, all 9 have `schema_valid: true`, covers all 3 harnesses × 3 models

### Partial failure handling
- On API error / non-zero exit: log the failure, continue with remaining runs
- Automatic retry: retry once on failure before logging as failed and continuing
- End-of-run summary table printed regardless: harness | model | status (OK/FAILED/RETRY) | composite score | cost USD
- If any run fails after retry: batch completes with summary, no commit attempted (user investigates)

### Quality gate
- No minimum composite score — all scores are valid benchmark data (a low Gemini score is legitimate evidence)
- **Schema validity is the only hard gate**: `schema_valid: false` = unacceptable, must not be committed
- Schema failures: retry once automatically; if second attempt also fails → abort that run, log it
- Pre-commit verification (`verify-reference.ts`) blocks commit if any entry has `schema_valid: false`
- Verification also checks exactly 9 entries exist covering all harness × model combinations

### Cost confirmation
- Script estimates total cost (9 subject model calls + 9 judge calls) using existing `calculateCost` logic before starting
- Prints estimated total USD and prompts `Proceed? (y/N)` — user confirms before any API calls
- `--dry-run` flag: validates all 3 harnesses load + all 3 provider env vars are set, without calling any LLM

### Claude's Discretion
- Exact model ID strings to use for GPT-4o and Gemini 1.5 Pro (use whatever is current at run time)
- Whether to use a `--confirm` flag or interactive readline prompt for cost confirmation
- How to present the summary table (console.table vs. manual formatting)

</decisions>

<specifics>
## Specific Ideas

- `npm run reference` = the one command that does everything: clear → run 9 → verify → print summary
- `npm run verify-reference` = standalone verification for use after manual runs or debugging
- `--dry-run` flag on `run-reference.ts` for smoke-testing before burning real API credits

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/bin.ts` / `src/cli.ts` — `benchmark --harness <name> --model <provider/model-id>` is the invocation interface; run-reference.ts spawns this as a subprocess
- `src/cost.ts` — `calculateCost(model, inputTokens, outputTokens)` — reuse for pre-run cost estimate (use representative token counts from the test run: ~2500 in / ~800 out)
- `results/index.json` — flat array, deduplicated by run_id; verify-reference.ts reads this directly

### Established Patterns
- `npm run validate` / `npm run benchmark` — script naming convention to follow
- `tsx` runtime used throughout — `scripts/run-reference.ts` should use same shebang/invocation pattern as existing scripts in `scripts/`
- File writes use `fs/promises` (`mkdir`, `writeFile`, `rm`) — same for clearing results/
- `scripts/validate-schemas.ts` is the prior art for a standalone validation/verification script

### Integration Points
- `results/index.json` — output of the 9 runs; input to verify-reference.ts and downstream to Phase 5 dashboard
- `docs/judge-prompt.md` — already committed (Phase 1); Phase 4 just verifies it exists and matches what the eval engine uses
- `package.json` `scripts` section — add `reference` and `verify-reference` entries

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-reference-runs*
*Context gathered: 2026-03-17*
