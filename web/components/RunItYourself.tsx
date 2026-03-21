import CopyButton from './CopyButton';

const COMMAND = 'benchmark --harness inventory-optimization --model anthropic/claude-sonnet-4-6';

export default function RunItYourself() {
  return (
    <section className="p-12 rounded-[2.5rem] border border-sierra-forest/5 bg-white shadow-[0_30px_60px_-20px_rgba(0,45,30,0.06)] relative overflow-hidden group">
      {/* Subtle Pattern Overlay */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover:opacity-[0.04] transition-opacity duration-1000">
        <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3v18M3 12h18" />
        </svg>
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-[1px] bg-sierra-emerald"></div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-sierra-emerald">
            Verification Protocol
          </h2>
        </div>
        
        <h3 className="text-4xl font-black text-sierra-forest mb-6 tracking-tight">
          Audit the results.
        </h3>
        
        <p className="text-sierra-forest/50 text-base mb-12 max-w-xl font-medium leading-relaxed italic">
          We provide the data and the runner. You provide the API keys. <br/> Run the exact same benchmarks in your own environment.
        </p>
        
        <div className="relative group/cmd max-w-3xl">
          <div className="absolute -inset-1 bg-gradient-to-r from-sierra-emerald/10 to-sierra-moss/10 rounded-2xl blur-xl opacity-0 group-hover/cmd:opacity-100 transition duration-1000"></div>
          <div className="relative flex flex-col md:flex-row md:items-center justify-between bg-sierra-forest rounded-2xl px-8 py-6 gap-6 shadow-2xl">
            <div className="flex items-center gap-4 overflow-hidden">
                <span className="text-sierra-emerald font-black text-sm shrink-0 select-none opacity-50">#</span>
                <code className="text-sm font-mono text-sierra-cream/90 overflow-x-auto whitespace-nowrap scrollbar-hide">
                  <span className="text-sierra-emerald font-black">benchmark</span> --harness <span className="text-sierra-cream/50 italic">inventory-optimization</span> --model <span className="text-sierra-cream font-bold underline decoration-sierra-emerald underline-offset-4">anthropic/claude-sonnet-4-6</span>
                </code>
            </div>
            <CopyButton text={COMMAND} />
          </div>
        </div>
        
        <div className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-4 text-[10px] font-black uppercase tracking-[0.2em]">
          <a
            href="https://github.com/obinnaeto/agentHarness/blob/master/docs/running.md"
            className="text-sierra-forest hover:text-sierra-emerald transition-all duration-300 border-b-2 border-sierra-emerald/20 hover:border-sierra-emerald pb-1"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the Setup Guide →
          </a>
          <div className="flex items-center gap-2.5 text-sierra-forest/20">
            <div className="w-1.5 h-1.5 rounded-full bg-sierra-emerald animate-pulse"></div>
            <span>Cross-platform binary</span>
          </div>
        </div>
      </div>
    </section>
  );
}
