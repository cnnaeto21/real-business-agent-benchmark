import { loadResults } from '@/lib/data';
import ScoresTable from '@/components/ScoresTable';
import RunItYourself from '@/components/RunItYourself';
// DimensionChartWrapper is a Client Component that uses dynamic() with ssr: false
// (ssr: false is not allowed in Server Components in Next.js 16+)
import DimensionChartWrapper from '@/components/DimensionChartWrapper';

export default async function DashboardPage() {
  const results = await loadResults();

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <header className="mb-10">
        <h1 className="text-4xl font-bold mb-2">Real Business Agent Benchmark</h1>
        <p className="text-gray-600 text-lg">
          9 reference runs across 3 harnesses and 3 models — scored on actionability,
          reasoning transparency, and completeness.
        </p>
      </header>

      <RunItYourself />
      <ScoresTable results={results} />
      <DimensionChartWrapper results={results} />
    </main>
  );
}
