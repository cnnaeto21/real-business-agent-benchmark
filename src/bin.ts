#!/usr/bin/env node
import { Command } from "commander";
import { runBenchmark } from "./cli.ts";

const program = new Command();

program
  .name("benchmark")
  .description("Run a benchmark harness against an LLM provider")
  .requiredOption("--harness <name>", "Harness name (e.g. inventory-optimization)")
  .requiredOption("--model <provider/model-id>", "Model string (e.g. anthropic/claude-sonnet-4-6)")
  .option("--temperature <number>", "Sampling temperature (default: 0)", "0")
  .option("--max-tokens <number>", "Max output tokens (default: 4096)", "4096")
  .option("--skip-eval", "Skip scoring (raw output and meta.json still written)")
  .action(async (options) => {
    try {
      await runBenchmark({
        harness: options.harness,
        model: options.model,
        temperature: parseFloat(options.temperature),
        maxTokens: parseInt(options.maxTokens, 10),
        noEval: !!options.skipEval,
      });
    } catch (err) {
      console.error("Benchmark failed:", err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
