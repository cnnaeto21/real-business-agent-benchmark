# Running a Benchmark Locally

This guide walks you through running any RBAB harness against any supported model on your own machine.

## Prerequisites

- Node.js 18 or later
- npm 9 or later
- API key for your chosen provider

## 1. Clone and Install

```bash
git clone https://github.com/obinnaeto/agentHarness.git
cd agentHarness
npm install
```

## 2. Set Environment Variables

Set the API key for the provider you want to use:

```bash
# Anthropic
export ANTHROPIC_API_KEY=your_key_here

# OpenAI
export OPENAI_API_KEY=your_key_here

# Google
export GOOGLE_API_KEY=your_key_here
```

## 3. Run a Benchmark

```bash
benchmark --harness inventory-optimization --model anthropic/claude-sonnet-4-6
```

Available harnesses:
- `inventory-optimization`
- `pricing-strategy`
- `financial-forecasting`

Available models:
- `anthropic/claude-sonnet-4-6`
- `openai/gpt-4o-mini`
- `google/gemini-3.1-flash-lite-preview`

## 4. View Results

Results are written to `results/<run-id>/`:
- `raw/<model-slug>.json` — raw model output
- `scored/<model-slug>.json` — scored result with judge rationale
- `meta.json` — run metadata (cost, latency, tokens)

`results/index.json` is updated after each scored run.

## 5. Re-Score an Existing Run

To apply the judge to a run that already has raw output (e.g., after a rubric update):

```bash
npx ts-node scripts/re-eval.ts --run-id <run-id>
```

## Troubleshooting

**ENOENT on harness files:** Run `benchmark` from the repo root, not a subdirectory.

**Missing API key:** The CLI will exit with a clear error message naming the missing variable.

**Schema validation failure:** The model output did not match the expected JSON schema. The run manifest and raw output are still saved. Check `results/<run-id>/raw/` for the raw response.
