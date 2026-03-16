// RUN-04: Uses OpenAI zodResponseFormat + beta.chat.completions.parse.
// Do NOT use response_format: {type: "json_object"} (JSON mode) — does not enforce schema.
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { RunOptions, RunResult } from "../types.ts";

export async function runOpenAI(modelId: string, opts: RunOptions): Promise<RunResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // zodResponseFormat requires the Zod schema object, NOT the JSON Schema from z.toJSONSchema()
  const completion = await client.beta.chat.completions.parse({
    model: modelId,
    max_tokens: opts.maxTokens,
    temperature: opts.temperature,
    messages: [
      { role: "system", content: opts.systemPrompt },
      { role: "user", content: opts.userMessage },
    ],
    response_format: zodResponseFormat(opts.zodSchema as z.ZodType, "structured_output"),
  });

  const parsed = completion.choices[0].message.parsed;
  if (!parsed) throw new Error("OpenAI response parsing failed — no parsed output");

  return {
    rawOutput: parsed,
    inputTokens: completion.usage?.prompt_tokens ?? 0,
    outputTokens: completion.usage?.completion_tokens ?? 0,
    providerApiVersion: "openai-chat-completions-v1",
  };
}
