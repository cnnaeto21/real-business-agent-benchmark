'use client';

// ssr: false is only allowed in Client Components in Next.js 16+.
// This wrapper owns the dynamic import and re-exports it for use in Server Components.
import dynamic from 'next/dynamic';
import type { RunResult } from '@/lib/types';

const DimensionChart = dynamic(() => import('./DimensionChart'), { ssr: false });

export default function DimensionChartWrapper({ results }: { results: RunResult[] }) {
  return <DimensionChart results={results} />;
}
