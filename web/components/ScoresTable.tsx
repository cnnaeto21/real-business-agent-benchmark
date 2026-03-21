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

function getScoreColor(score: number) {
  if (score >= 90) return 'text-sierra-cream bg-sierra-emerald border-sierra-forest/10 shadow-[0_4px_12px_rgba(0,92,66,0.15)]';
  if (score >= 75) return 'text-sierra-forest bg-sierra-emerald/10 border-sierra-emerald/20';
  if (score >= 50) return 'text-sierra-forest/60 bg-sierra-forest/5 border-sierra-forest/10';
  return 'text-rose-600 bg-rose-50 border-rose-100';
}

function ModelIcon({ model }: { model: string }) {
  if (model.startsWith('anthropic')) {
    return (
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/10 text-orange-600 mr-2.5 text-[9px] font-black border border-orange-500/20">
        ANT
      </span>
    );
  }
  if (model.startsWith('openai')) {
    return (
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 mr-2.5 text-[9px] font-black border border-emerald-500/20">
        OAI
      </span>
    );
  }
  if (model.startsWith('google')) {
    return (
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 mr-2.5 text-[9px] font-black border border-blue-500/20">
        GGL
      </span>
    );
  }
  return null;
}

export default function ScoresTable({ results }: Props) {
  const models = [...new Set(results.map((r) => r.model))];

  return (
    <section className="mb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 px-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-sierra-forest mb-3 uppercase italic">Benchmark Matrix</h2>
          <p className="text-sm text-sierra-forest/40 font-medium leading-relaxed max-w-lg">Comparative scoring across operational domains. All results are deterministic and reproducible.</p>
        </div>
        <div className="flex items-center gap-6">
           <div className="flex flex-col items-end">
              <span className="text-[9px] text-sierra-forest/30 uppercase font-black tracking-[0.2em] mb-2">Performance Index</span>
              <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.1em] text-sierra-forest/50">
                 <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sierra-emerald"></span> Elite</span>
                 <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sierra-emerald/10 border border-sierra-emerald/20"></span> Standard</span>
              </div>
           </div>
        </div>
      </div>
      
      <div className="relative overflow-hidden rounded-[2rem] border border-sierra-forest/5 bg-white shadow-[0_20px_50px_-15px_rgba(0,45,30,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-sierra-forest/5 bg-sierra-forest/[0.02]">
                <th className="px-10 py-6 font-black text-sierra-forest/40 text-[10px] uppercase tracking-[0.25em]">Provider / Identity</th>
                <th className="px-10 py-6 font-black text-sierra-forest/40 text-[10px] uppercase tracking-[0.25em]">Harness Context</th>
                <th className="px-10 py-6 font-black text-sierra-forest/40 text-[10px] uppercase tracking-[0.25em] text-right">Composite</th>
                <th className="px-10 py-6 font-black text-sierra-forest/40 text-[10px] uppercase tracking-[0.25em] text-right">Unit Cost</th>
                <th className="px-10 py-6 font-black text-sierra-forest/40 text-[10px] uppercase tracking-[0.25em] text-right">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sierra-forest/[0.04]">
              {models.map((model) =>
                HARNESSES.map((harness) => {
                  const r = results.find((x) => x.model === model && x.harness === harness);
                  if (!r) return null;
                  return (
                    <tr key={r.run_id} className="group hover:bg-sierra-forest/[0.02] transition-all duration-300">
                      <td className="px-10 py-8">
                        <div className="flex items-center">
                          <ModelIcon model={model} />
                          <span className="font-mono text-sm text-sierra-forest/80 group-hover:text-sierra-forest transition-colors duration-300 tracking-tight font-bold">
                            {modelLabel(model)}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-8 text-sm text-sierra-forest/40 font-bold group-hover:text-sierra-forest transition-colors">
                        {harnessLabel(harness)}
                      </td>
                      <td className="px-10 py-8 text-right">
                        <span className={`inline-flex items-center px-5 py-1.5 rounded-full text-xs font-black border transition-all duration-500 group-hover:scale-105 ${getScoreColor(r.composite_score)}`}>
                          {r.composite_score}
                        </span>
                      </td>
                      <td className="px-10 py-8 text-right font-mono text-[11px] text-sierra-emerald font-black">
                        ${r.cost_usd.toFixed(4)}
                      </td>
                      <td className="px-10 py-8 text-right font-mono text-[11px] text-sierra-forest/30 font-bold group-hover:text-sierra-forest/50 transition-colors">
                        {r.latency_ms.toLocaleString()}ms
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
