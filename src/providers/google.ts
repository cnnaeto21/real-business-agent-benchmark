// RUN-04: Uses @google/genai (NOT @google/generative-ai — that package is EOL August 31, 2025).
// GOOGLE_API_KEY must be a Gemini Developer API key from aistudio.google.com — NOT a GCP service account key.
// Note: responseJsonSchema (not responseSchema) is used because opts.jsonSchema is a plain JSON Schema
// object from z.toJSONSchema(). Since @google/genai v1.9.0, plain JSON Schema must go in responseJsonSchema;
// responseSchema expects a typed SchemaUnion. See @google/genai dist/genai.d.ts for reference.
import { GoogleGenAI } from "@google/genai";
import type { RunOptions, RunResult } from "../types.ts";

export async function runGoogle(modelId: string, opts: RunOptions): Promise<RunResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

  const response = await ai.models.generateContent({
    model: modelId,
    contents: opts.userMessage,
    config: {
      systemInstruction: opts.systemPrompt,
      responseMimeType: "application/json",
      responseJsonSchema: opts.jsonSchema,  // JSON Schema from z.toJSONSchema() — use responseJsonSchema per @google/genai v1.9.0+
      temperature: opts.temperature,
      maxOutputTokens: opts.maxTokens,
    },
  });

  const rawText = response.text;
  if (!rawText) throw new Error("Google response contained no text output");

  return {
    rawOutput: JSON.parse(rawText),
    inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    providerApiVersion: "gemini-api-v1beta",
  };
}
