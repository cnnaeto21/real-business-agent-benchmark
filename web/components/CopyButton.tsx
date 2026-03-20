'use client';

import { useState } from 'react';

interface Props {
  text: string;
}

export default function CopyButton({ text }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="ml-3 px-3 py-1 text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}
