# Technology Stack

**Project:** Real Business Agent Benchmark (RBAB)
**Researched:** 2026-03-12
**Overall confidence:** MEDIUM-HIGH (training data through Aug 2025; verify versions before install)

---

## Recommended Stack

### LLM Provider SDKs

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@anthropic-ai/sdk` | ^0.27.0 | Claude API calls | Official SDK; supports tool use + structured outputs. Native TypeScript types. |
| `openai` | ^4.67.0 | GPT-4o API calls | Official SDK; `response_format: { type: "json_schema" }` for guaranteed structured JSON. |
| `@google/generative-ai` | ^0.21.0 | Gemini 1.5 Pro calls | Official Google SDK; `responseMimeType: "application/json"` for structured output. |

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| TypeScript | ^5.4.0 | Primary language | Single language across CLI and dashboard. Strong types for harness schemas. |
| Node.js | >=20.0.0 LTS | Runtime | LTS, native fetch, native ESM. All LLM SDKs target Node 18+. |
| `tsx` | ^4.15.0 | TS execution | `npx tsx runner.ts` works as one-shot CLI without a build step. |
| `commander` | ^12.1.0 | CLI arg parsing | `benchmark --harness inventory --model gpt-4o` is 15 lines. Better than yargs or minimist. |

### Structured Output

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `zod` | ^3.23.0 | Schema + validation | Define harness output schemas once; use for TypeScript types AND runtime validation via `safeParse`. |
| `zod-to-json-schema` | ^3.23.0 | Zod → JSON Schema | OpenAI and Gemini accept JSON Schema. Generate from same Zod schema — single source of truth. |

### Dashboard

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | ^14.2.0 App Router | Results dashboard | RSC reads results JSON at build time — zero API routes for static data. |
| Tailwind CSS | ^3.4.0 | Styling | Fastest path to clean dashboard. No component library needed for v1. |
| Recharts | ^2.12.0 | Score charts | React-native, RSC-compatible via `"use client"` boundary. Radar charts for rubric dimensions. |
| Vercel | — | Hosting | Native Next.js, free tier, zero-config. Results are static JSON committed to repo. |

### Result Storage

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| JSON flat files | — | Primary store | 9 reference runs (3 harnesses × 3 models). Git history IS the run history. Human-readable, diffable. SQLite is overkill. |

---

## Eval Framework Decision: Build Thin, Don't Adopt Heavy

**Do NOT use promptfoo, LangSmith, Braintrust, or evals.py.**

| Framework | Why to Skip |
|-----------|-------------|
| promptfoo | YAML-config-driven; custom LLM-as-judge chains are easier in plain TypeScript |
| Braintrust | Hosted storage conflicts with "all data in repo" open-source requirement |
| LangSmith | Observability tool, not an eval framework; requires LangChain or manual wrapping |
| OpenAI evals | Python-only, OpenAI-centric, partially deprecated 2024 |

Build a ~300-line TypeScript runner instead: load harness → call provider → Zod parse → LLM judge → write JSON.

---

## LLM-as-Judge Implementation

Use **Claude Sonnet** (not Opus — 5x cheaper) as judge for all evaluations regardless of subject model. This makes scores comparable across providers. Temperature 0.0 for determinism. Re-run 3x and average scores for published reference results.

Structured output strategy by provider:
- **OpenAI:** `response_format: { type: "json_schema", strict: true, schema: <zodToJsonSchema output> }`
- **Anthropic:** Tool use with `input_schema` matching Zod schema (more reliable than prompt-based JSON)
- **Gemini:** `generationConfig: { responseMimeType: "application/json", responseSchema: <schema> }`

Fallback for all: regex-extract first JSON block between fences, then Zod `safeParse`. Log extraction method per result.

---

## Version Verification

Run before installing:
```bash
npm info @anthropic-ai/sdk version
npm info openai version
npm info @google/generative-ai version
npm info next version
npm info zod version
```
