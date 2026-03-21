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
    <section className="mb-24 px-2">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-black tracking-tight text-sierra-forest mb-4 uppercase italic">Capability Vectors</h2>
          <p className="text-sm text-sierra-forest/40 font-bold leading-relaxed tracking-tight">
            Independent evaluation of reasoning, actionability, and completeness.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-20">
        {HARNESSES.map(harness => {
          const harnesResults = results.filter(r => r.harness === harness);
          const chartData = harnesResults.map(r => ({
            model: modelLabel(r.model),
            actionability: r.scores.actionability.score,
            reasoning_transparency: r.scores.reasoning_transparency.score,
            completeness: r.scores.completeness.score,
          }));

          return (
            <div key={harness} className="p-10 rounded-[2.5rem] border border-sierra-forest/5 bg-white shadow-[0_40px_80px_-30px_rgba(0,45,30,0.06)] group transition-all duration-700 hover:shadow-[0_50px_100px_-30px_rgba(0,45,30,0.1)]">
              <div className="flex items-center gap-6 mb-12">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-sierra-forest/[0.03] text-sierra-forest group-hover:bg-sierra-emerald group-hover:text-white transition-all duration-700 border border-sierra-forest/5 shadow-inner">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 20v-6M6 20V10M18 20V4" />
                  </svg>
                </div>
                <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-sierra-forest/20 mb-1.5 block">Harness Scope</span>
                    <h3 className="text-2xl font-black text-sierra-forest tracking-tighter uppercase italic">{harnessLabel(harness)}</h3>
                </div>
              </div>
              
              <div className="w-full h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 40 }} barSize={34} barGap={10}>
                    <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(0, 45, 30, 0.04)" />
                    <XAxis 
                      dataKey="model" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'rgba(0, 45, 30, 0.4)', fontSize: 11, fontWeight: 900, letterSpacing: '0.05em' }} 
                      dy={15}
                    />
                    <YAxis 
                      domain={[0, 5]} 
                      ticks={[1, 2, 3, 4, 5]} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'rgba(0, 45, 30, 0.1)', fontSize: 10, fontWeight: 900 }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0, 45, 30, 0.02)' }}
                      contentStyle={{ 
                        backgroundColor: '#FFFFFF', 
                        borderColor: 'rgba(0, 45, 30, 0.08)', 
                        borderRadius: '20px',
                        color: '#002D1E',
                        fontSize: '12px',
                        fontWeight: '900',
                        padding: '16px 20px',
                        boxShadow: '0 30px 60px -15px rgba(0, 45, 30, 0.15)',
                        border: '1px solid rgba(0, 45, 30, 0.05)'
                      }}
                      itemStyle={{ padding: '6px 0', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      iconType="square" 
                      iconSize={10}
                      wrapperStyle={{ paddingBottom: '50px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.8 }}
                    />
                    <Bar dataKey="actionability" fill="#002D1E" radius={[6, 6, 0, 0]} name="Actionability" />
                    <Bar dataKey="reasoning_transparency" fill="#005C42" radius={[6, 6, 0, 0]} name="Reasoning" />
                    <Bar dataKey="completeness" fill="#798E84" radius={[6, 6, 0, 0]} name="Completeness" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
