---
phase: 02-cli-runner
plan: "03"
subsystem: api
tags: [anthropic-sdk, openai, google-genai, structured-output, tool-use, zodResponseFormat, provider-adapters]

# Dependency graph
requires:
  - phase: 02-cli-runner-01
    provides: "RunOptions and RunResult interfaces in src/types.ts"

provides:
  - "src/providers/index.ts: runProvider dispatcher routing by model prefix"
  - "src/providers/anthropic.ts: Anthropic adapter using tool use with forced tool_choice"
  - "src/providers/openai.ts: OpenAI adapter using zodResponseFormat + beta.chat.completions.parse"
  - "src/providers/google.ts: Google adapter using @google/genai with responseMimeType + responseJsonSchema"

affects:
  - 02-cli-runner
  - cli.ts orchestrator (02-02)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Provider dispatch by string prefix (anthropic/, openai/, google/) via dynamic import()"
    - "Thin adapter pattern: one file per provider, same RunOptions -> RunResult contract"
    - "Anthropic: tool use with tool_choice forced (not output_config.format)"
    - "OpenAI: zodResponseFormat + beta.chat.completions.parse (not JSON mode)"
    - "Google: responseJsonSchema field for plain JSON Schema objects (not responseSchema which requires SchemaUnion)"

key-files:
  created:
    - src/providers/index.ts
    - src/providers/anthropic.ts
    - src/providers/openai.ts
    - src/providers/google.ts
  modified: []

key-decisions:
  - "Google adapter uses responseJsonSchema (not responseSchema) — since @google/genai v1.9.0, plain JSON Schema objects from z.toJSONSchema() must go in responseJsonSchema; responseSchema expects typed SchemaUnion"
  - "Anthropic adapter uses tool use with tool_choice: {type: 'tool'} per RUN-04 requirement — not output_config.format even though native Structured Outputs is now GA"
  - "Dynamic imports use .js extension per ESM convention (tsx resolves .js to .ts at runtime)"

patterns-established:
  - "Provider adapter pattern: thin adapter per provider, shared RunOptions/RunResult contract, dispatcher routes by prefix"
  - "responseJsonSchema vs responseSchema distinction for @google/genai: always verify against installed TypeScript types, not documentation"

requirements-completed: [RUN-03, RUN-04]

# Metrics
duration: 8min
completed: 2026-03-16
---

# Phase 02 Plan 03: Provider Adapters Summary

**Four-file provider layer: dispatcher routing by model prefix + Anthropic (tool use), OpenAI (zodResponseFormat), and Google (@google/genai responseJsonSchema) adapters implementing RunOptions -> RunResult**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-16T12:40:00Z
- **Completed:** 2026-03-16T12:48:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Built provider dispatcher (src/providers/index.ts) that routes anthropic/, openai/, google/ prefixes via dynamic import(), strips prefix before passing modelId to adapter
- Built Anthropic adapter using tool use with forced tool_choice per RUN-04 requirement (not the newer output_config.format API)
- Built OpenAI adapter using zodResponseFormat + beta.chat.completions.parse for schema-enforced structured output
- Built Google adapter using @google/genai with responseJsonSchema (confirmed correct field per v1.9.0+ type migration from responseSchema)

## Task Commits

Each task was committed atomically:

1. **Task 1: Build src/providers/index.ts — provider dispatcher** - `4778e78` (feat)
2. **Task 2: Build Anthropic, OpenAI, and Google provider adapters** - `0e0aa4a` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/providers/index.ts` - Provider dispatcher: routes by model prefix, dynamic imports, throws on unknown prefix
- `src/providers/anthropic.ts` - Anthropic adapter: tool use with forced tool_choice, extracts tool_use block, returns RunResult
- `src/providers/openai.ts` - OpenAI adapter: zodResponseFormat + beta.chat.completions.parse, returns RunResult
- `src/providers/google.ts` - Google adapter: @google/genai with responseJsonSchema and responseMimeType, returns RunResult

## Decisions Made
- **Google responseJsonSchema vs responseSchema:** The installed @google/genai TypeScript types show that since v1.9.0, plain JSON Schema objects (as produced by z.toJSONSchema()) must be passed to `responseJsonSchema`, not `responseSchema`. The `responseSchema` field now expects a typed `SchemaUnion`. Updated Google adapter accordingly.
- **Anthropic tool use honored as specified:** RUN-04 explicitly requires tool use. Even though Anthropic's native Structured Outputs (output_config.format) is now GA, the plan was executed as written per the requirement lock.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used responseJsonSchema instead of responseSchema in Google adapter**
- **Found during:** Task 2 (Google adapter implementation)
- **Issue:** Plan specified `responseSchema: opts.jsonSchema` but the @google/genai v1.9.0+ TypeScript types moved plain JSON Schema objects to `responseJsonSchema`. Using `responseSchema` would require a typed SchemaUnion, causing a type mismatch at compile time.
- **Fix:** Used `responseJsonSchema: opts.jsonSchema` which is the correct field for z.toJSONSchema() output per the installed package types. Added explanatory comment in the file.
- **Files modified:** src/providers/google.ts
- **Verification:** npx tsx -e "import { runGoogle } from './src/providers/google.ts'; console.log('google OK')" — compiles without TypeScript errors
- **Committed in:** 0e0aa4a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type correction for @google/genai field name)
**Impact on plan:** Necessary correction to match installed package types. The plan's open question #3 anticipated this exact issue.

## Issues Encountered
- Google @google/genai responseSchema vs responseJsonSchema ambiguity — resolved by inspecting installed TypeScript declaration files as the plan recommended. The plan's open question #3 explicitly flagged this risk.

## User Setup Required
None - no external service configuration required. API keys (ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY) are consumed at runtime but not configured here.

## Next Phase Readiness
- All four provider files are ready for use by cli.ts orchestrator (Plan 02-02)
- Provider adapters compile cleanly under tsx with no TypeScript errors
- test-routing.ts passes: all three prefixes route correctly, unknown prefix throws
- RunOptions -> RunResult contract fully implemented across all three providers

---
*Phase: 02-cli-runner*
*Completed: 2026-03-16*
