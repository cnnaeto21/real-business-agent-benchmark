import { readFile } from 'fs/promises';
import path from 'path';
import type { RunResult } from './types';

export type { DimensionScore, RunResult } from './types';
export { modelLabel, harnessLabel } from './types';

export async function loadResults(): Promise<RunResult[]> {
  // process.cwd() = web/ when running next build from web/ (both locally and on Vercel)
  const indexPath = path.join(process.cwd(), '..', 'results', 'index.json');
  const raw = JSON.parse(await readFile(indexPath, 'utf-8')) as Omit<RunResult, 'temperature'>[];

  return Promise.all(
    raw.map(async (entry) => {
      const metaPath = path.join(
        process.cwd(), '..', 'results', entry.run_id, 'meta.json'
      );
      const meta = JSON.parse(await readFile(metaPath, 'utf-8')) as { temperature: number };
      return { ...entry, temperature: meta.temperature };
    })
  );
}
