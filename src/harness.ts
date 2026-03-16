// src/harness.ts
// Loads a harness YAML spec, injects CSV data into the prompt template,
// and splits the rendered prompt into system/user parts.

import { readFileSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";
import type { HarnessSpec } from "./types.ts";

const PROMPT_SEPARATOR = "# User Message Template";

/**
 * Load a harness by name.
 * Resolves the harness directory relative to process.cwd() so the CLI works
 * when invoked from the repo root.
 *
 * Returns:
 *   spec           — the parsed HarnessSpec from harness.yaml
 *   renderedPrompt — the prompt template with all {{variable}} placeholders replaced by raw CSV content
 *
 * Throws if:
 *   - The harness directory does not exist
 *   - The prompt template lacks "# User Message Template" separator
 *   - Any {{variable}} placeholders remain after injection (harness authoring error)
 */
export function loadHarness(harnessName: string): { spec: HarnessSpec; renderedPrompt: string } {
  const harnessDir = join(process.cwd(), "harnesses", harnessName);

  // Load harness.yaml — throws ENOENT if directory does not exist
  let specRaw: string;
  try {
    specRaw = readFileSync(join(harnessDir, "harness.yaml"), "utf-8");
  } catch (err) {
    throw new Error(
      `Harness "${harnessName}" not found. Expected directory: ${harnessDir}\nCause: ${(err as Error).message}`
    );
  }

  const spec = yaml.load(specRaw) as HarnessSpec;

  // Load the prompt template
  let template = readFileSync(join(harnessDir, spec.prompt.template), "utf-8");

  // Inject each data file as raw CSV text — deterministic string replacement
  // (do NOT parse CSV into objects — the prompt expects raw CSV rows)
  for (const dataFile of spec.data) {
    const csvContent = readFileSync(join(harnessDir, dataFile.file), "utf-8");
    template = template.replace(`{{${dataFile.inject_as}}}`, csvContent);
  }

  // Assert no unreplaced placeholders remain — catches harness authoring errors early
  const unreplaced = template.match(/\{\{[^}]+\}\}/g);
  if (unreplaced) {
    throw new Error(
      `Prompt template has unreplaced placeholders: ${unreplaced.join(", ")}`
    );
  }

  // Assert separator exists — required for system/user split in all provider adapters
  if (!template.includes(PROMPT_SEPARATOR)) {
    throw new Error(
      `Prompt template missing required separator "# User Message Template". ` +
        `Harness: ${harnessName}`
    );
  }

  return { spec, renderedPrompt: template };
}

/**
 * Split a rendered prompt template into [systemPart, userPart].
 *
 * Convention: text above "# User Message Template" is the system prompt;
 * text below is the user message.
 *
 * If the separator is absent, returns ["", fullTemplate.trim()] so callers
 * can still proceed (though loadHarness validates the separator).
 */
export function splitPrompt(renderedTemplate: string): [string, string] {
  const idx = renderedTemplate.indexOf(PROMPT_SEPARATOR);
  if (idx === -1) {
    return ["", renderedTemplate.trim()];
  }
  return [
    renderedTemplate.slice(0, idx).trim(),
    renderedTemplate.slice(idx + PROMPT_SEPARATOR.length).trim(),
  ];
}
