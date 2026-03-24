# Technology Stack

**Project:** Real Business Agent Benchmark (RBAB) — Multi-Judge Ensemble Milestone
**Researched:** 2026-03-23
**Overall confidence:** HIGH for OpenAI (pattern is canonical), HIGH for Anthropic (already in prod), MEDIUM for Google (response accessor confirmed via multiple sources, model IDs have caveat noted below)

---

## Context: What Already Exists

This milestone adds multi-judge ensemble scoring to an existing, working eval pipeline. The SDKs are already installed and validated in production. This document focuses exclusively on the delta: calling OpenAI and Google SDKs as plain-text judges, matching the pattern already used for the Anthropic judge.

**Installed versions (from package.json, as of 2026-03-23):**

| Package | Installed Version |
|---------|------------------|
| `@anthropic-ai/sdk` | ^0.78.0 |
| `openai` | ^6.29.0 |
| `@google/genai` | ^1.45.0 |
| `zod` | ^4.3.6 |

No SDK upgrades are needed. All three SDKs are current major versions with no breaking migration required for this milestone.

---

## Recommended Stack: Multi-Judge Additions Only

### Judge Call Implementations

#### Anthropic (existing — reference implementation)

```typescript
// Existing pattern in src/eval.ts — DO NOT change
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const response = await client.messages.create({
  model: modelId,          // e.g. "claude-sonnet-4-6"
  max_tokens: 512,
  temperature: 0,
  messages: [{ role: "user", content: judgePrompt }],
  // NO tools, NO tool_choice — plain text JSON from judge
});
const textBlock = response.content.find((b) => b.type === "text");
const text = textBlock.text;
```

#### OpenAI (new — to implement)

```typescript
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const completion = await client.chat.completions.create({
  model: modelId,          // e.g. "gpt-4o"
  max_tokens: 512,
  temperature: 0,
  messages: [{ role: "user", content: judgePrompt }],
  // NO response_format — plain text JSON, same as Anthropic judge pattern
});
const text = completion.choices[0].message.content ?? "";
```

**Why `client.chat.completions.create` and not the Responses API:**
The Responses API is OpenAI's newer interface (2025), but Chat Completions remains fully supported and is the canonical method for `gpt-4o`. The existing codebase already uses `openai` SDK for subject runs. Chat Completions is stable, well-understood, and matches the pattern of the Anthropic judge. No reason to introduce the Responses API for a plain-text judge call. Confidence: HIGH (official docs).

**Why no `response_format`:**
The existing Anthropic judge uses prompt-level instructions + markdown fence stripping + `JSON.parse` + `JudgeResponse.safeParse`. The OpenAI judge must follow the same contract so all three judges process the same prompt and produce responses that feed the same parse pipeline. Using `response_format: json_object` would change the response contract and add inconsistency. Structured output (`zodResponseFormat`) is already used for subject model runs — explicitly not for judge calls.

#### Google (new — to implement)

```typescript
import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
const response = await client.models.generateContent({
  model: modelId,          // e.g. "gemini-2.5-pro"
  contents: judgePrompt,
  config: {
    maxOutputTokens: 512,
    temperature: 0,
    // NO responseMimeType — plain text, not structured output
  },
});
const text = response.text ?? "";
```

**Why `client.models.generateContent` and not `client.getGenerativeModel`:**
`@google/genai` v1.x (the unified SDK, replacing the deprecated `@google/generative-ai`) uses `ai.models.generateContent(...)` as the primary method. The old `getGenerativeModel()` pattern belongs to the deprecated `@google/generative-ai` package which is NOT in this project. The installed package is `@google/genai` v1.45.0 — use its API. Confidence: HIGH (confirmed via npm package docs and multiple TypeScript samples).

**Why `response.text` accessor:**
`response.text` is the convenience accessor on the `GenerateContentResponse` object in `@google/genai` v1.x. It returns the concatenated text from all text parts. This is the idiomatic access pattern, equivalent to manually walking `response.candidates[0].content.parts`. Confidence: MEDIUM-HIGH (confirmed across multiple sources, official SDK samples use this accessor).

**Why no `responseMimeType`:**
Same rationale as OpenAI: the judge prompt asks for JSON text; the caller strips markdown fences and parses. Forcing `responseMimeType: "application/json"` would change the response shape and bypass the existing retry/parse pipeline. The subject model runs use structured output — the judge calls do not.

---

## Current Flagship Model IDs

| Provider | Model ID to Use | Notes |
|----------|----------------|-------|
| Anthropic | `claude-sonnet-4-6` | Already in production as judge. Strip `anthropic/` prefix (existing code handles this). |
| OpenAI | `gpt-4o` | The stable alias. `gpt-4o-2024-11-20` is the latest dated snapshot as of research date. The bare `gpt-4o` alias always resolves to a stable production version. Prefer the alias over dated snapshot to avoid manual maintenance. |
| Google | `gemini-2.5-pro` | Gemini 2.5 Pro is Google's current flagship reasoning model (2026). The bare ID `gemini-2.5-pro` resolves to the stable version. Do NOT use `gemini-1.5-pro` — it is an older generation model. |

**Model ID confidence notes:**
- `claude-sonnet-4-6`: HIGH — already running in production
- `gpt-4o`: HIGH — confirmed via OpenAI official models page, stable alias documented
- `gemini-2.5-pro`: MEDIUM — multiple sources confirm this is Google's current flagship tier, but Google model versioning is volatile (preview tags, dated suffixes). If `gemini-2.5-pro` returns a 404, fall back to `gemini-2.5-pro-preview-05-06` or check `https://ai.google.dev/gemini-api/docs/models` at implementation time.

---

## No New Dependencies

All three SDKs are already installed. Do not add any new packages for this milestone.

| Temptation | Why to Resist |
|------------|--------------|
| `p-limit` or `p-map` for parallel judge calls | Calls are sequential in existing pattern; adding concurrency is scope creep for this milestone |
| Any eval framework (promptfoo, Braintrust, LangSmith) | Established decision from v1.0 — thin TypeScript runner only |
| `axios` or `node-fetch` for raw HTTP calls | SDKs handle auth, retries, and types; raw HTTP introduces maintenance burden |
| `@google/generative-ai` (old SDK) | Deprecated — the project already uses the replacement `@google/genai` |

---

## Integration Pattern

The new `callOpenAIJudge` and `callGoogleJudge` functions should mirror the existing `callJudge` exactly:

1. Accept `(judgePrompt: string, judgeModel: string): Promise<JudgeResponseType>`
2. Strip provider prefix from `judgeModel` (e.g. `"openai/gpt-4o"` → `"gpt-4o"`)
3. Strip markdown fences before `JSON.parse`
4. Validate with `JudgeResponse.safeParse`
5. Retry once on null result
6. Throw `Error("Judge returned malformed JSON after retry")` if both attempts fail

The ensemble aggregation (`runEval`) calls all three judges and averages per-dimension scores before `computeComposite`. No changes to the existing Anthropic `callJudge` function are needed.

---

## Environment Variables Required

| Variable | Provider | Already Set? |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic | Yes (existing judge) |
| `OPENAI_API_KEY` | OpenAI | Yes (subject runs use it) |
| `GOOGLE_API_KEY` | Google | Yes (subject runs use it) |

No new env vars needed.

---

## Sources

- OpenAI Chat Completions API: https://platform.openai.com/docs/guides/chat-completions (MEDIUM — searched, pattern confirmed via official docs page)
- OpenAI models page (gpt-4o): https://platform.openai.com/docs/models/gpt-4o (MEDIUM — confirmed `gpt-4o` is stable alias, latest snapshot `gpt-4o-2024-11-20`)
- `@google/genai` npm package (v1.45.0 installed): https://www.npmjs.com/package/@google/genai (MEDIUM — confirmed `ai.models.generateContent`, `response.text` accessor, `config.temperature`)
- Google Gemini models: https://ai.google.dev/gemini-api/docs/models (MEDIUM — `gemini-2.5-pro` confirmed as current flagship, versioning caveats noted)
- Existing `src/eval.ts` `callJudge()` function (HIGH — direct code read, production-validated pattern)
- `package.json` installed versions (HIGH — direct read of pinned versions)
