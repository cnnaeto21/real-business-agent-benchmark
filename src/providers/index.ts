import type { RunOptions, RunResult } from "../types.ts";

export type { RunOptions, RunResult };

export async function runProvider(model: string, options: RunOptions): Promise<RunResult> {
  if (model.startsWith("anthropic/")) {
    const { runAnthropic } = await import("./anthropic.js");
    return runAnthropic(model.slice("anthropic/".length), options);
  } else if (model.startsWith("openai/")) {
    const { runOpenAI } = await import("./openai.js");
    return runOpenAI(model.slice("openai/".length), options);
  } else if (model.startsWith("google/")) {
    const { runGoogle } = await import("./google.js");
    return runGoogle(model.slice("google/".length), options);
  }
  throw new Error(`Unknown provider prefix in model: ${model}`);
}
