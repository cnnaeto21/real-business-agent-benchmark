import { loadResults } from '@/lib/data';
import ScoresTable from '@/components/ScoresTable';
import RunItYourself from '@/components/RunItYourself';
import DimensionChartWrapper from '@/components/DimensionChartWrapper';

export default async function DashboardPage() {
  const results = await loadResults();

  return (
    <div className="relative min-h-screen pb-20 overflow-x-hidden">
      {/* Sierra Background Decor for Light Mode */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none overflow-hidden">
        <div className="absolute top-[-5%] left-[-10%] w-[45%] h-[45%] bg-sierra-emerald/5 blur-[130px] rounded-full"></div>
        <div className="absolute top-[15%] right-[-5%] w-[30%] h-[30%] bg-sierra-moss/5 blur-[100px] rounded-full"></div>
      </div>
      
      {/* Subtle Sierra Line Pattern - Light Mode */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#002D1E05_1px,transparent_1px),linear-gradient(to_bottom,#002D1E05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.8] pointer-events-none"></div>

      <main className="relative max-w-6xl mx-auto px-6 pt-24 md:pt-32 lg:pt-40">
        {/* Sierra Hero Section - Light Mode */}
        <header className="mb-24 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sierra-emerald/5 border border-sierra-forest/10 text-[11px] font-bold uppercase tracking-[0.25em] text-sierra-forest/60 mb-8 backdrop-blur-md shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sierra-emerald opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sierra-emerald"></span>
            </span>
            Real Business Agent Benchmark
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-10 tracking-tight leading-[1.3] text-sierra-forest uppercase italic px-4 pt-4">
            Testing <span className="bg-gradient-to-r from-sierra-forest to-sierra-emerald bg-clip-text text-transparent">Business Logic</span>
          </h1>
          
          <p className="text-sierra-forest/60 text-lg md:text-xl leading-[1.6] mb-12 font-medium max-w-2xl mx-auto italic px-4">
            Packaging real business data into standardized harnesses <br className="hidden md:block"/> testing reasoning depth and actionability.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-10 text-[10px] font-black text-sierra-forest/40 uppercase tracking-[0.2em]">
            <div className="flex items-center gap-3">
              <span className="text-sierra-emerald">03</span>
              <span>Benchmarks</span>
            </div>
            <span className="text-sierra-forest/10 text-lg font-thin">/</span>
            <div className="flex items-center gap-3">
              <span className="text-sierra-emerald">09</span>
              <span>Models</span>
            </div>
            <span className="text-sierra-forest/10 text-lg font-thin">/</span>
            <div className="flex items-center gap-3">
              <span className="text-sierra-emerald">100%</span>
              <span>Auditable</span>
            </div>
          </div>
        </header>

        {/* Sierra Run It Yourself - Light Mode */}
        <div className="mb-32">
          <RunItYourself />
        </div>

        {/* Data Sections */}
        <div className="space-y-40">
          <ScoresTable results={results} />
          <DimensionChartWrapper results={results} />
        </div>

        {/* Footer - Simplified */}
        <footer className="mt-48 pb-12 pt-12 border-t border-sierra-forest/5 text-center">
          <p className="text-sierra-forest/30 text-[10px] font-black tracking-widest uppercase italic">
            Standardizing the evaluation of agentic reasoning.
          </p>
        </footer>
      </main>
    </div>
  );
}
