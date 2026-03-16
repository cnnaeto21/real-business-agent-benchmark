import { readFileSync } from "fs";
import { join } from "path";
import assert from "assert";
import yaml from "js-yaml";
import type { HarnessSpec } from "../src/types.ts";

// Load inventory-optimization harness and render the prompt template
const harnessDir = join(process.cwd(), "harnesses", "inventory-optimization");
const spec = yaml.load(readFileSync(join(harnessDir, "harness.yaml"), "utf-8")) as HarnessSpec;

let template = readFileSync(join(harnessDir, spec.prompt.template), "utf-8");

for (const dataFile of spec.data) {
  const csv = readFileSync(join(harnessDir, dataFile.file), "utf-8");
  template = template.replace(`{{${dataFile.inject_as}}}`, csv);
}

// Assert no unreplaced placeholders remain
assert.ok(!template.includes("{{"), `Unreplaced placeholder found in rendered prompt`);
assert.ok(!template.includes("}}"), `Unreplaced placeholder found in rendered prompt`);

// Assert separator exists (required by splitPrompt in cli.ts)
assert.ok(
  template.includes("# User Message Template"),
  "Prompt template missing '# User Message Template' separator"
);

console.log("test-render: PASS — prompt renders without placeholders, separator present");
