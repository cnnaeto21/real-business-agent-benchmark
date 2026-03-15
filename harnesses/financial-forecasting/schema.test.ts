/**
 * TDD tests for financial-forecasting harness artifacts.
 * RED phase: These tests will fail until implementation is in place.
 */

import { z } from "zod";
import { readFileSync, existsSync } from "fs";
import { parse as parseYaml } from "../../../node_modules/js-yaml/dist/js-yaml.mjs";

// Test 1: schema.ts exports are correct
async function testSchemaExports() {
  const mod = await import("./schema.ts");

  if (!mod.FinancialForecast) throw new Error("FinancialForecast not exported");
  if (typeof mod.FinancialForecast !== "object") throw new Error("FinancialForecast is not a ZodObject");

  // Test z.toJSONSchema works
  const jsonSchema = z.toJSONSchema(mod.FinancialForecast);
  if (jsonSchema.type !== "object") throw new Error(`Expected type 'object', got: ${jsonSchema.type}`);

  console.log("PASS: schema exports and JSON Schema conversion");
}

// Test 2: harness.yaml has all required fields
function testHarnessYaml() {
  if (!existsSync("harnesses/financial-forecasting/harness.yaml")) {
    throw new Error("harness.yaml does not exist");
  }
  const raw = readFileSync("harnesses/financial-forecasting/harness.yaml", "utf8");
  // just check string presence since js-yaml may not be available
  const required = ["name:", "version: 1.0.0", "data:", "prompt:", "output:", "eval:", "providers:"];
  for (const field of required) {
    if (!raw.includes(field)) throw new Error(`harness.yaml missing field: ${field}`);
  }
  console.log("PASS: harness.yaml has all required fields");
}

// Test 3: monthly-pl.csv has correct structure
function testMonthlyPLCsv() {
  if (!existsSync("harnesses/financial-forecasting/data/monthly-pl.csv")) {
    throw new Error("monthly-pl.csv does not exist");
  }
  const raw = readFileSync("harnesses/financial-forecasting/data/monthly-pl.csv", "utf8");
  const lines = raw.trim().split("\n");

  const header = lines[0];
  const expectedCols = ["month", "revenue", "cogs", "gross_profit", "operating_expenses", "net_income"];
  for (const col of expectedCols) {
    if (!header.includes(col)) throw new Error(`monthly-pl.csv missing column: ${col}`);
  }

  const dataRows = lines.length - 1; // excluding header
  if (dataRows < 12) throw new Error(`monthly-pl.csv must have 12-18 rows, got: ${dataRows}`);
  if (dataRows > 18) throw new Error(`monthly-pl.csv must have 12-18 rows, got: ${dataRows}`);

  console.log(`PASS: monthly-pl.csv has ${dataRows} rows with correct columns`);
}

// Test 4: expenses.csv has correct structure
function testExpensesCsv() {
  if (!existsSync("harnesses/financial-forecasting/data/expenses.csv")) {
    throw new Error("expenses.csv does not exist");
  }
  const raw = readFileSync("harnesses/financial-forecasting/data/expenses.csv", "utf8");
  const lines = raw.trim().split("\n");

  const header = lines[0];
  const expectedCols = ["category", "amount_last_month", "amount_3mo_avg", "trend"];
  for (const col of expectedCols) {
    if (!header.includes(col)) throw new Error(`expenses.csv missing column: ${col}`);
  }

  const dataRows = lines.length - 1;
  if (dataRows < 8) throw new Error(`expenses.csv must have 8-15 rows, got: ${dataRows}`);
  if (dataRows > 15) throw new Error(`expenses.csv must have 8-15 rows, got: ${dataRows}`);

  console.log(`PASS: expenses.csv has ${dataRows} rows with correct columns`);
}

// Run all tests
async function runTests() {
  const tests = [
    testSchemaExports,
    testHarnessYaml,
    testMonthlyPLCsv,
    testExpensesCsv,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (err) {
      console.error(`FAIL: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
