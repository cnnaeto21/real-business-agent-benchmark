# Architecture Patterns: Multi-Judge Ensemble Integration

**Domain:** LLM-as-judge eval pipeline extension
**Researched:** 2026-03-23
**Milestone:** SCORE-02 — Multi-pass judge (3x per output, scores averaged)

---

## Context: Existing Pipeline

The current eval pipeline (src/eval.ts) is a single-pass sequential pipeline:

```
runEval(opts)
  -> readFile(judge-prompt.md + rubric.md)
  -> zodSchema.safeParse(rawOutput)     [gate: fail = zero score, done]
  -> callJudge(judgePrompt, spec.eval.judge_model)   [single Anthropic call]
  -> computeComposite(judgeScores)
  -> writeScored(scoredResult)
  -> upsertIndex(indexEntry)
```

`callJudge` is a private function inside eval.ts. It instantiates `new Anthropic()`, calls `client.messages.create`, parses JudgeResponse Zod schema, retries once on malformed JSON, and throws on double failure.

`HarnessSpec.eval` is typed as `{ rubric: string; judge_model: string; judge_temperature: number }` — a single judge model string.

Current `ScoredResult.scores` stores one score+rationale per dimension (the single judge's response directly).

`IndexEntry` mirrors `ScoredResult.scores` exactly — the dashboard reads this shape.

---

## Recommended Architecture for Multi-Judge Ensemble

### Core Design Decision: Parallel Calls, Averaged Scores

Run N judge calls concurrently with `Promise.all`, then compute per-dimension arithmetic mean, round to nearest integer for the averaged score. Store all per-pass raw responses in the scored JSON. Expose only the averaged scores in `IndexEntry` (dashboard backward compat).

This is the correct approach because:
- Sequential calls multiply latency by N (unacceptable for 3x passes)
- `Promise.all` with identical prompts is safe — calls are independent
- The judge is already at temperature 0; variance across passes measures judge instability, not model quality. Three passes at temp 0 against the same output will produce near-identical scores; the averaging is a reliability signal, not a consensus mechanism.

---

## Integration Map: New vs Modified

### Modified Components

| Component | What Changes | Why |
|-----------|-------------|-----|
| `src/eval.ts: callJudge` | Keep signature, make it export-accessible (or create parallel wrapper around it) | callJudge itself stays single-call; the new ensemble layer orchestrates N calls |
| `src/eval.ts: runEval` | Replace single `callJudge(...)` with `callJudgeEnsemble(judgePrompt, judgeModel, passes)` | Orchestration point for multi-pass |
| `src/eval.ts: ScoredResult` | Add `judge_passes: JudgeResponseType[]` and `judge_pass_count: number` | Store per-pass raw scores for auditability |
| `src/eval.ts: computeComposite` | No change to signature; receives averaged JudgeResponseType | Averaging happens before composite, keeps this pure |
| `src/types.ts: HarnessSpec.eval` | Add optional `judge_passes?: number` (default: 1) | Harness YAML controls pass count; backward compat via optional |
| `harnesses/*/harness.yaml` | Add `judge_passes: 3` to eval block | Configuration source of truth |

### New Components

| Component | What it Is | Where |
|-----------|-----------|-------|
| `callJudgeEnsemble` | New function in eval.ts — calls `callJudge` N times in parallel, averages results | src/eval.ts |
| `averageJudgeResponses` | Pure function — takes `JudgeResponseType[]`, returns averaged `JudgeResponseType` | src/eval.ts |

### Unchanged Components

| Component | Why Unchanged |
|-----------|--------------|
| `IndexEntry` | Dashboard shape stays the same — receives averaged scores, not per-pass breakdown |
| `upsertIndex` | No changes to call site or logic |
| `writeScored` | No changes to call site; receives enriched ScoredResult |
| `web/lib/types.ts: RunResult` | Dashboard type unchanged — averaged scores are drop-in compatible |
| `meta.json` | Does not store judge configuration — that lives in harness.yaml and scored JSON |

---

## Type Changes

### HarnessSpec.eval (src/types.ts)

```typescript
// Before
eval: { rubric: string; judge_model: string; judge_temperature: number }

// After
eval: { rubric: string; judge_model: string; judge_temperature: number; judge_passes?: number }
```

`judge_passes` is optional with runtime default of 1. Existing harness.yaml files without this field continue to run single-pass without any change.

### ScoredResult (src/eval.ts)

```typescript
// Before
export interface ScoredResult {
  // ...existing fields...
  scores: {
    actionability: { score: number; rationale: string };
    reasoning_transparency: { score: number; rationale: string };
    completeness: { score: number; rationale: string };
  };
}

// After
export interface ScoredResult {
  // ...existing fields unchanged...
  scores: {
    actionability: { score: number; rationale: string };
    reasoning_transparency: { score: number; rationale: string };
    completeness: { score: number; rationale: string };
  };
  // New fields
  judge_pass_count: number;           // How many passes were requested and completed
  judge_passes: JudgeResponseType[];  // All raw per-pass responses for auditability
}
```

`scores` remains the averaged/final scores. The `judge_passes` array holds the raw per-pass data. This means the dashboard reads `scores` unchanged and never touches `judge_passes`.

### IndexEntry (src/eval.ts)

No change. `IndexEntry` deliberately omits `judge_passes` — it is a summary shape for dashboard consumption, not an audit trail.

---

## New Functions

### callJudgeEnsemble

```
callJudgeEnsemble(judgePrompt: string, judgeModel: string, passes: number): Promise<JudgeResponseType[]>
```

- Calls `Promise.all(Array.from({length: passes}, () => callJudge(judgePrompt, judgeModel)))`
- Returns array of all successful `JudgeResponseType` objects
- If any individual `callJudge` throws, the error propagates up to `runEval`'s existing try/catch — behavior is identical to current single-pass failure handling
- `callJudge` stays private; `callJudgeEnsemble` replaces its call site in `runEval`

### averageJudgeResponses

```
averageJudgeResponses(passes: JudgeResponseType[]): JudgeResponseType
```

- Takes N responses, computes `Math.round(mean(scores))` per dimension
- For `rationale`: join pass rationales with " | Pass N: " separator, or use the first pass rationale (rationale from a single judge is already coherent; concatenation may add noise — use first-pass rationale as the "canonical" rationale and store full breakdown in `judge_passes`)
- Rationale recommendation: use first-pass rationale for `scores.*.rationale` since rationale text averaging is meaningless; the audit trail is in `judge_passes`
- Returns a valid `JudgeResponseType` that slots into `computeComposite` and `ScoredResult.scores` without any downstream changes

---

## Data Flow After Refactor

```
runEval(opts)
  -> readFile(judge-prompt.md + rubric.md)         [unchanged]
  -> zodSchema.safeParse(rawOutput)                 [unchanged]
  -> const passes = spec.eval.judge_passes ?? 1
  -> callJudgeEnsemble(judgePrompt, judgeModel, passes)
       -> Promise.all([callJudge x N])              [NEW: parallel]
       -> returns JudgeResponseType[]
  -> averageJudgeResponses(passResults)             [NEW: pure averaging]
       -> returns averaged JudgeResponseType
  -> computeComposite(averagedScores)               [unchanged]
  -> build ScoredResult with judge_pass_count + judge_passes [MODIFIED]
  -> writeScored(scoredResult)                      [unchanged]
  -> upsertIndex({ ...indexEntry without judge_passes }) [unchanged]
```

---

## File Storage Decisions

### scored/<model-slug>.json — Store judge model list here

The scored JSON is the authoritative audit trail for a run. It should contain:
- `judge_pass_count: 3` — how many passes ran
- `judge_passes: [{actionability: {score, rationale}, ...}, ...]` — full per-pass breakdown

This is correct because:
- `meta.json` records runner configuration (model, temperature, tokens, cost, latency) — it is written by `cli.ts` before eval runs and does not know how many judge passes will be used
- `meta.json` writing happens before `runEval` is called — adding judge config there would require passing eval config back to the CLI layer, which reverses the dependency direction
- The harness.yaml already declares `judge_model` and `judge_passes` — the scored JSON captures the realized values (e.g., if fewer passes succeeded due to retry failures)
- `index.json` is a summary for the dashboard and must stay lean

### meta.json — No change

Do not add judge model list to meta.json. It records runner state, not eval configuration. The harness.yaml is the config source; the scored JSON is the realized record.

---

## Harness YAML Change

```yaml
# Before
eval:
  rubric: rubric.md
  judge_model: anthropic/claude-sonnet-4-6
  judge_temperature: 0

# After
eval:
  rubric: rubric.md
  judge_model: anthropic/claude-sonnet-4-6
  judge_temperature: 0
  judge_passes: 3
```

All three harness.yaml files need this addition. The `HarnessSpec` type makes `judge_passes` optional, so existing runs from before this change still parse correctly.

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `HarnessSpec.eval` | Declares judge config incl. pass count | Parsed by CLI, consumed by `runEval` |
| `callJudge` | Single-pass judge call + parse + retry | Anthropic API |
| `callJudgeEnsemble` | Parallel fan-out of N judge calls | `callJudge` (N times) |
| `averageJudgeResponses` | Pure: N responses -> averaged response | No I/O |
| `runEval` | Orchestrates schema gate -> ensemble -> score -> write | All eval components |
| `ScoredResult` | Scored JSON shape with per-pass audit trail | Written by `writeScored`, read by dashboard if needed |
| `IndexEntry` | Summary shape for dashboard | Written by `upsertIndex`, read by Next.js |

---

## Scalability Considerations

| Concern | Current (1 pass) | After (3 passes) | Notes |
|---------|-----------------|-----------------|-------|
| Latency per run | ~5-15s judge call | ~5-15s (parallel) | `Promise.all` means 3x does not multiply latency |
| API cost | 1x judge tokens | 3x judge tokens | Each pass is ~512 max_tokens; at Claude Sonnet pricing this is small vs subject model cost |
| Rate limits | Single in-flight call | 3 concurrent calls | Anthropic default rate limits are generous; 3 concurrent calls per run are well within limits |
| Schema validation | Zod on 1 response | Zod on 3 responses | `callJudge` already handles retry-once per call; ensemble amplifies but doesn't change failure handling |

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why Bad | Instead |
|--------------|---------|---------|
| Sequential judge calls (await one, then next) | Triples latency; defeats the purpose | `Promise.all` for parallel execution |
| Storing averaged scores as floats (e.g., 4.67) | `DimensionScore.score` is integer 1-5 per Zod schema; float would break existing consumers | `Math.round()` before storing in `scores`; store raw floats in `judge_passes` if needed |
| Concatenating all N rationales into `scores.*.rationale` | Rationale text is already verbose; concatenation produces an unreadable blob | Use first-pass rationale as canonical; full detail in `judge_passes` array |
| Adding judge config to meta.json | meta.json is written before runEval is called; creates backward dependency | Keep judge config in harness.yaml (source) and scored JSON (realized) |
| Changing IndexEntry shape | Dashboard (`web/lib/types.ts: RunResult`) reads IndexEntry; changing it breaks Next.js data layer | IndexEntry stays as summary; judge_passes only in scored JSON |
| Making callJudge async-retry across the ensemble | If one pass fails, don't retry by kicking off a 4th pass | Fail the ensemble if any pass throws; existing error handling in runEval covers this |

---

## Suggested Build Order

| Phase | Task | Rationale |
|-------|------|-----------|
| 1 | Add `judge_passes?: number` to `HarnessSpec.eval` in src/types.ts | No tests break; all harness.yaml files still parse; pure type addition |
| 2 | Implement `averageJudgeResponses(passes: JudgeResponseType[]): JudgeResponseType` as pure function in eval.ts | No I/O; can be unit tested immediately with no mocking |
| 3 | Implement `callJudgeEnsemble` wrapping existing `callJudge` with `Promise.all` | callJudge unchanged; ensemble is a thin orchestration wrapper |
| 4 | Update `ScoredResult` interface to add `judge_pass_count` and `judge_passes` fields | Type change only; doesn't break existing scored JSONs (additive) |
| 5 | Wire `callJudgeEnsemble` + `averageJudgeResponses` into `runEval` replacing the single `callJudge` call | Single integration point; all prior phases must be complete |
| 6 | Update all three harness.yaml files to add `judge_passes: 3` | Config change; triggers ensemble on next run |
| 7 | Re-score all 9 reference runs | Produces updated scored JSONs with `judge_passes` data; commit results |

**Dependency chain:** types.ts (Phase 1) -> averageJudgeResponses (Phase 2) -> callJudgeEnsemble (Phase 3) -> ScoredResult type (Phase 4) -> runEval wiring (Phase 5) -> harness config (Phase 6) -> re-runs (Phase 7).

Phases 1-4 are independently testable before Phase 5 touches the live pipeline.

---

## Sources

- Code analysis: src/eval.ts (read 2026-03-23) — callJudge, runEval, ScoredResult, IndexEntry shapes
- Code analysis: src/types.ts (read 2026-03-23) — HarnessSpec.eval type
- Code analysis: harnesses/inventory-optimization/harness.yaml (read 2026-03-23) — judge_model config location
- Code analysis: results/\*/meta.json and scored/\*.json (read 2026-03-23) — actual file shapes on disk
- Code analysis: web/lib/types.ts (read 2026-03-23) — RunResult / DimensionScore dashboard types
- Pattern: Promise.all for parallel API calls is standard Node.js concurrency (HIGH confidence — no external source needed)
- Pattern: Arithmetic mean of 1-5 Likert scores is the standard multi-rater reliability approach (HIGH confidence)
