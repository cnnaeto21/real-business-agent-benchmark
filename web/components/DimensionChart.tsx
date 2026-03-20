'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { RunResult } from '@/lib/types';
import { modelLabel, harnessLabel } from '@/lib/types';

interface Props {
  results: RunResult[];
}

const HARNESSES = [
  'inventory-optimization',
  'pricing-strategy',
  'financial-forecasting',
] as const;

export default function DimensionChart({ results }: Props) {
  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold mb-4">Per-Dimension Scores</h2>
      <p className="text-sm text-gray-600 mb-6">Scores 1–5 per dimension per model, grouped by harness.</p>
      {HARNESSES.map(harness => {
        const harnesResults = results.filter(r => r.harness === harness);
        const chartData = harnesResults.map(r => ({
          model: modelLabel(r.model),
          actionability: r.scores.actionability.score,
          reasoning_transparency: r.scores.reasoning_transparency.score,
          completeness: r.scores.completeness.score,
        }));

        return (
          <div key={harness} className="mb-8">
            <h3 className="text-lg font-semibold mb-3">{harnessLabel(harness)}</h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="model" />
                  <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="actionability" fill="#6366f1" />
                  <Bar dataKey="reasoning_transparency" fill="#8b5cf6" name="reasoning transparency" />
                  <Bar dataKey="completeness" fill="#a78bfa" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </section>
  );
}
