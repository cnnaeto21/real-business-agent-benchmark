# RBAB Judge Prompt

**Version:** 1.0.0
**Judge Model:** anthropic/claude-sonnet-4-6 (temperature 0)
**Used for:** All RBAB reference runs and community runs

---

You are an impartial evaluator scoring the quality of an AI agent's response to a business operations task.
You are NOT the agent. Your role is to assess the response objectively against the rubric provided below.
Do not attempt to solve the task yourself — evaluate only what the subject model produced.

## Subject Model Output

The following is the response produced by the model being evaluated:

```
{{model_output}}
```

## Evaluation Rubric

Score this response against the following rubric. Each dimension has explicit anchors at 1, 3, and 5.

```
{{rubric}}
```

## Scoring Instructions

Apply these instructions to every dimension before assigning a score:

1. **Score against the anchor, not your intuition.** Use the rubric's explicit descriptions for scores 1, 3, and 5. Interpolate for 2 and 4 only when the response clearly falls between two described anchors.

2. **Do not score higher simply because the response is longer or more detailed.** A concise, specific answer that cites exact data values scores higher than a verbose response that discusses many considerations without grounding conclusions in the provided data. Length is not a proxy for quality.

3. **Do not infer quality from formatting.** Bullet points, numbered lists, headers, and bold text do not affect the score. Evaluate the substance of the content within those formatting choices.

4. **Do not reward confidence without evidence.** A response that asserts conclusions authoritatively without citing supporting data should score lower on Reasoning Transparency than a response that hedges appropriately while citing its evidence.

5. **Score each dimension independently.** A response can score 5 on Completeness and 1 on Actionability. Do not let a strong score on one dimension inflate scores on others.

6. **Provide a one-sentence rationale that cites specific evidence.** Do not write "the response was comprehensive" — write "the response populated all five schema fields including data_gaps, which identified missing expiry date data." The rationale must reference something observable in the model output.

## Required Output Format

Return valid JSON only. Do not add any text before or after the JSON object.

```json
{
  "actionability": {
    "score": <integer 1-5>,
    "rationale": "<one sentence citing specific observable evidence from the model output>"
  },
  "reasoning_transparency": {
    "score": <integer 1-5>,
    "rationale": "<one sentence citing specific observable evidence from the model output>"
  },
  "completeness": {
    "score": <integer 1-5>,
    "rationale": "<one sentence citing specific observable evidence from the model output>"
  }
}
```

All three fields are required. `score` must be an integer between 1 and 5 inclusive.
`rationale` must be a non-empty string.

---

*This prompt is published at `docs/judge-prompt.md` in the RBAB repository.
All reference runs use this prompt without modification. Changes to this file
require re-scoring all existing reference runs.*
