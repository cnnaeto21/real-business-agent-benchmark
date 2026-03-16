// RUN-04: Uses Anthropic tool use structured output (tool_choice forced).
// Do NOT use output_config.format / zodOutputFormat — requirement explicitly specifies tool use.
import Anthropic from "@anthropic-ai/sdk";
import type { RunOptions, RunResult } from "../types.ts";

const ANTHROPIC_API_VERSION = "2023-06-01"; // Stable version; all SDK calls use this

export async function runAnthropic(modelId: string, opts: RunOptions): Promise<RunResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: modelId,
    max_tokens: opts.maxTokens,
    temperature: opts.temperature,
    system: opts.systemPrompt,
    tools: [{
      name: "structured_output",
      description: "Return your analysis in the required structured format",
      input_schema: opts.jsonSchema as Anthropic.Tool["input_schema"],
    }],
    tool_choice: { type: "tool", name: "structured_output" },
    messages: [{ role: "user", content: opts.userMessage }],
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("Anthropic response did not contain expected tool_use block");
  }

  return {
    rawOutput: toolBlock.input,
    // Note: Anthropic usage.input_tokens already includes tool-use overhead tokens — no adjustment needed
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    providerApiVersion: ANTHROPIC_API_VERSION,
  };
}
