import CopyButton from './CopyButton';

const COMMAND = 'benchmark --harness inventory-optimization --model anthropic/claude-sonnet-4-6';

export default function RunItYourself() {
  return (
    <section className="mb-12 p-6 bg-white shadow rounded-lg border-l-4 border-indigo-500">
      <h2 className="text-2xl font-bold mb-3">Run it yourself</h2>
      <p className="text-gray-600 mb-4">
        Reproduce any of these results locally in minutes. Requires API keys for your chosen provider.
      </p>
      <div className="bg-gray-900 text-green-300 rounded-lg px-4 py-3 flex items-center justify-between font-mono text-sm mb-4">
        <code>{COMMAND}</code>
        <CopyButton text={COMMAND} />
      </div>
      <a
        href="https://github.com/cnnaeto21/real-business-agent-benchmark/blob/master/docs/running.md"
        className="text-indigo-600 hover:text-indigo-800 underline font-medium"
        target="_blank"
        rel="noopener noreferrer"
      >
        Full setup instructions in docs/running.md →
      </a>
    </section>
  );
}
