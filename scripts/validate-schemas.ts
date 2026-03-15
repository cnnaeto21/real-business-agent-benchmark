// scripts/validate-schemas.ts
import { z } from "zod";

const HARNESSES = [
  "inventory-optimization",
  "pricing-strategy",
  "financial-forecasting",
] as const;

async function validateHarness(name: string): Promise<void> {
  const schemaPath = new URL(
    `../harnesses/${name}/schema.ts`,
    import.meta.url
  ).pathname;

  // Dynamic import — schema.ts must export a named Zod schema
  const mod = await import(schemaPath);

  // Find the first exported Zod schema (any ZodObject)
  const schemaExport = Object.values(mod).find(
    (v): v is z.ZodTypeAny => v instanceof z.ZodType
  );

  if (!schemaExport) {
    throw new Error(`No ZodType export found in harnesses/${name}/schema.ts`);
  }

  const jsonSchema = z.toJSONSchema(schemaExport);

  if (!jsonSchema || typeof jsonSchema !== "object") {
    throw new Error(`z.toJSONSchema() returned invalid result for ${name}`);
  }

  console.log(`PASS ${name}: ${JSON.stringify(jsonSchema).slice(0, 80)}...`);
}

const target = process.argv[2]; // optional: validate single harness
const toValidate = target ? [target] : HARNESSES;

let failed = 0;
for (const name of toValidate) {
  try {
    await validateHarness(name);
  } catch (err) {
    console.error(`FAIL ${name}: ${(err as Error).message}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} harness(es) failed validation`);
  process.exit(1);
}
console.log(`\nAll ${toValidate.length} harness(es) passed.`);
