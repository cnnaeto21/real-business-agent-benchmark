**Real Business Agent Benchmarks (RBAB)** — structured operational tasks that reveal whether a model can actually help run a business.

Existing benchmarks test whether models can pass exams, write code, or solve logic puzzles. RBAB tests something different: can a model make a good restocking decision, set prices that balance margin and volume, or produce a financial forecast that commits to specific numbers? Each task comes with real CSV data, a structured output schema, and an LLM judge that scores on actionability, reasoning transparency, and completeness.

```bash
benchmark --harness inventory-optimization --model anthropic/claude-sonnet-4-6
```

Requires `ANTHROPIC_API_KEY` set. See [docs/running.md](docs/running.md) for full setup including OpenAI and Google providers.

---

## Results

| Model | inventory-optimization | pricing-strategy | financial-forecasting |
|-------|----------------------|------------------|-----------------------|
| anthropic/claude-sonnet-4-6 | 100 | 100 | 100 |
| google/gemini-3.1-flash-lite-preview | 93 | 80 | 87 |
| openai/gpt-4o-mini | 67 | 67 | 60 |

Full detail and per-dimension breakdowns at [Dashboard](https://real-business-agent-benchmark-git-master-obis-projects-f49f6211.vercel.app/).

---

## How it works

1. **Harness** — a structured task package: CSV business data, a prompt template, a JSON output schema, and an eval rubric
2. **Prompt** — CSV data is injected into the template and sent to the model with structured output enforced
3. **Model** — any supported provider (Anthropic, OpenAI, Google) returns a schema-conforming JSON response
4. **Eval** — JSON schema validation gate, then LLM-as-judge scores on 3 dimensions (see [docs/scoring.md](docs/scoring.md))
5. **Score** — composite score (0–100) written to `results/` alongside raw output and run manifest

---

## Add your own model

Run any supported model by changing the `--model` flag:

```bash
benchmark --harness pricing-strategy --model openai/gpt-4o-mini
benchmark --harness financial-forecasting --model google/gemini-3.1-flash-lite-preview
```

Provider prefix determines which SDK and structured output mode is used:

- `anthropic/<model-id>` — Anthropic SDK, tool-use structured output
- `openai/<model-id>` — OpenAI SDK, `json_schema` mode
- `google/<model-id>` — Google GenAI SDK, `responseJsonSchema`

See [docs/running.md](docs/running.md) for available models and environment variable setup.

---

## Limitations

RBAB covers three business domains and three models — a useful signal but not a comprehensive survey. Scores reflect single-pass LLM judgment rather than ground truth validation, and high scores on trained domains may reflect memorized patterns rather than live reasoning. See [LIMITATIONS.md](LIMITATIONS.md) for the full four-limitation disclosure.

---

## Credit

RBAB is the implementation of [Bret Taylor's concept](https://www.linkedin.com/posts/brettaylor_meta-benchmark-idea-a-collection-of-basic-activity-7436989645537767424-AcGr?utm_source=social_share_send&utm_medium=member_desktop_web&rcm=ACoAACbv1I0BWSrg4HytIIQACiC95ZqKLEZrKm0) of a CSS Zen Garden for agent harnesses — a fixed problem set that reveals how different models actually perform on the same task.

---

## Docs

- [docs/running.md](docs/running.md) — local setup and environment variables
- [docs/scoring.md](docs/scoring.md) — hybrid scoring methodology (schema gate + LLM judge)
- [docs/harness-spec.md](docs/harness-spec.md) — harness authoring reference
- [LIMITATIONS.md](LIMITATIONS.md) — benchmark limitations and practical implications
