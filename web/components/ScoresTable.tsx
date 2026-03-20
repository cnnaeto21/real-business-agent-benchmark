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

export default function ScoresTable({ results }: Props) {
  // Get unique model labels
  const models = [...new Set(results.map(r => r.model))];

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold mb-4">Model Comparison</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white shadow rounded-lg">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="px-4 py-3 font-semibold text-gray-700">Model</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Harness</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-right">Score</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-right">Cost (USD)</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-right">Latency (ms)</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Run Date</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Harness Ver.</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-right">Temp.</th>
            </tr>
          </thead>
          <tbody>
            {models.map(model =>
              HARNESSES.map(harness => {
                const r = results.find(x => x.model === model && x.harness === harness);
                if (!r) return null;
                return (
                  <tr key={r.run_id} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm">{modelLabel(model)}</td>
                    <td className="px-4 py-3 text-sm">{harnessLabel(harness)}</td>
                    <td className="px-4 py-3 text-right font-bold">{r.composite_score}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">${r.cost_usd.toFixed(5)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{r.latency_ms.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{new Date(r.run_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm font-mono">{r.harness_version}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{r.temperature}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
