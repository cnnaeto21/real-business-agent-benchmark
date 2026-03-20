#!/usr/bin/env node
/**
 * verify-dashboard-data.ts
 * Confirms all 9 index.json entries have required fields and
 * all 9 meta.json files exist with a temperature field.
 * Exits 0 on success, 1 on any failure.
 */
import { readFile } from 'fs/promises';
import path from 'path';

const ROOT = path.join(process.cwd());
const REQUIRED_INDEX_FIELDS = [
  'run_id', 'harness', 'model', 'composite_score',
  'scores', 'cost_usd', 'latency_ms', 'run_date',
];

interface IndexEntry {
  run_id: string;
  harness: string;
  model: string;
  composite_score: number;
  scores: { actionability: unknown; reasoning_transparency: unknown; completeness: unknown };
  cost_usd: number;
  latency_ms: number;
  run_date: string;
  [key: string]: unknown;
}

interface MetaJson {
  temperature: number;
  [key: string]: unknown;
}

async function main() {
  let ok = true;

  // 1. Load index.json
  const indexPath = path.join(ROOT, 'results', 'index.json');
  let entries: IndexEntry[];
  try {
    entries = JSON.parse(await readFile(indexPath, 'utf-8')) as IndexEntry[];
  } catch (e) {
    console.error(`FAIL: cannot read ${indexPath}:`, e);
    process.exit(1);
  }

  // 2. Expect exactly 9 entries
  if (entries.length !== 9) {
    console.error(`FAIL: expected 9 entries in index.json, got ${entries.length}`);
    ok = false;
  } else {
    console.log(`OK: index.json has 9 entries`);
  }

  // 3. Check required fields on each entry
  for (const entry of entries) {
    for (const field of REQUIRED_INDEX_FIELDS) {
      if (entry[field] === undefined || entry[field] === null) {
        console.error(`FAIL: entry ${entry.run_id} missing field "${field}"`);
        ok = false;
      }
    }
    // Check scores sub-fields
    for (const dim of ['actionability', 'reasoning_transparency', 'completeness']) {
      const s = entry.scores as Record<string, unknown>;
      if (!s?.[dim]) {
        console.error(`FAIL: entry ${entry.run_id} missing scores.${dim}`);
        ok = false;
      }
    }
  }
  if (ok) console.log(`OK: all index.json entries have required fields`);

  // 4. Check each meta.json exists and has temperature
  for (const entry of entries) {
    const metaPath = path.join(ROOT, 'results', entry.run_id, 'meta.json');
    let meta: MetaJson;
    try {
      meta = JSON.parse(await readFile(metaPath, 'utf-8')) as MetaJson;
    } catch {
      console.error(`FAIL: cannot read meta.json for run ${entry.run_id}`);
      ok = false;
      continue;
    }
    if (typeof meta.temperature !== 'number') {
      console.error(`FAIL: meta.json for ${entry.run_id} missing temperature field`);
      ok = false;
    } else {
      console.log(`OK: meta.json for ${entry.run_id} has temperature=${meta.temperature}`);
    }
  }

  if (!ok) {
    console.error('\nverify-dashboard-data: FAILED');
    process.exit(1);
  }
  console.log('\nverify-dashboard-data: ALL CHECKS PASSED');
}

main();
