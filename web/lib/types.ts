export interface DimensionScore {
  score: number;    // 1-5
  rationale: string;
}

export interface RunResult {
  run_id: string;
  harness: 'inventory-optimization' | 'pricing-strategy' | 'financial-forecasting';
  harness_version: string;
  model: string;
  composite_score: number;
  schema_valid: boolean;
  scores: {
    actionability: DimensionScore;
    reasoning_transparency: DimensionScore;
    completeness: DimensionScore;
  };
  cost_usd: number;
  latency_ms: number;
  run_date: string;
  // merged from meta.json
  temperature: number;
}

/** Strip provider prefix from model string: "anthropic/claude-sonnet-4-6" -> "claude-sonnet-4-6" */
export function modelLabel(model: string): string {
  return model.includes('/') ? model.split('/')[1] : model;
}

/** Format harness name for display */
export function harnessLabel(harness: string): string {
  return harness.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}
