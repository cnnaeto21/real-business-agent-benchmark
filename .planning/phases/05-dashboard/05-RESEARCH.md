# Phase 5: Dashboard - Research

**Researched:** 2026-03-19
**Domain:** Next.js static dashboard, Recharts, Vercel monorepo deployment
**Confidence:** HIGH

---

## Summary

Phase 5 builds a single-page static dashboard in a `web/` subdirectory of the existing monorepo, deploying to Vercel. The data source is `results/index.json` — 9 entries already committed, each with composite score, per-dimension scores, cost, latency, run date, and metadata. No backend, no auth, no dynamic routes.

The stack is Next.js 16 App Router with Tailwind CSS v4 and Recharts for charts. The App Router is the current default and preferred path for new Next.js projects; for a pure static dashboard with no API routes, Server Components at build time provide the cleanest data-loading pattern. Recharts is the standard React chart library (3.6M+ weekly downloads, version 3.x current), though its components require a `'use client'` directive because they access DOM APIs.

Vercel deploys the monorepo by creating a separate Vercel project pointed at the `web/` subdirectory as Root Directory. Vercel then auto-detects Next.js and runs `next build` with no additional config needed. Static export (`output: 'export'`) is optional and unnecessary when deploying to Vercel — Vercel handles static generation automatically.

**Primary recommendation:** Next.js 16 App Router + Tailwind CSS v4 + Recharts in `web/` subdirectory; set Vercel Root Directory to `web`; read `results/index.json` via `fs.readFile` in a Server Component; do NOT set `output: 'export'` unless you specifically need a portable `out/` folder.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | Dashboard deployed and publicly accessible on Vercel | Vercel monorepo rootDirectory config covers this |
| DASH-02 | Model comparison table: all models x all harnesses with composite score, cost (USD), latency (ms) | index.json has all required fields; server component renders at build time |
| DASH-03 | Per-dimension score breakdown for each model (bar or radar chart) | index.json has scores.actionability/reasoning_transparency/completeness; Recharts BarChart pattern documented |
| DASH-04 | Run metadata per result: model name+version, run date, harness version, temperature | index.json has model, run_date, harness_version; meta.json has temperature — need to cross-reference |
| DASH-05 | "Run it yourself" section with copy-paste CLI command and link to docs/running.md | Static JSX section, no library needed; link to repo docs/ |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | ^16.1.6 | React framework, SSG, routing | Project decision locked; Vercel native platform |
| react | ^19.x | UI library | Bundled with Next.js 16 |
| tailwindcss | ^4.x | Utility CSS | Zero config, v4 default with `create-next-app`; no tailwind.config.js needed |
| recharts | ^3.x | Charts (bar/radar) | Standard React chart library; declarative API; works with Next.js |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/node | (via Next.js) | Node.js types for `fs`, `path` | Needed to call `fs.readFile` in Server Components |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Chart.js (react-chartjs-2) | Chart.js uses Canvas — better performance at high data density, but smaller dev ergonomics for React; overkill for 9 data points |
| Recharts | visx | Lower-level D3 primitives, max flexibility, but 3x more code to ship one bar chart |
| Tailwind | Plain CSS modules | More portable but slower to build; Tailwind is already standard in Next.js ecosystem |
| App Router | Pages Router | Pages Router is still supported but App Router is the current default and `getStaticProps` pattern is legacy; no reason to use Pages Router on a new project |

**Installation (run from `web/` directory):**
```bash
npx create-next-app@latest web --ts --tailwind --eslint --app --no-src-dir
cd web
npm install recharts
```

---

## Architecture Patterns

### Recommended Project Structure

```
web/
├── app/
│   ├── layout.tsx        # Root layout, global styles
│   ├── page.tsx          # Main dashboard (Server Component — reads JSON at build)
│   └── globals.css       # Tailwind @import
├── components/
│   ├── ScoresTable.tsx   # Model comparison table (Server or Client)
│   ├── DimensionChart.tsx # Per-dimension bar chart ('use client')
│   └── RunItYourself.tsx # "Run it yourself" section (Server)
├── lib/
│   └── data.ts           # Data loading + type definitions
├── next.config.ts        # Minimal config
├── package.json
└── tsconfig.json
```

The `results/` directory lives at the repo root, one level above `web/`. The data loader in `lib/data.ts` reads it using `path.join(process.cwd(), '..', 'results', 'index.json')` when running from `web/`. On Vercel, `process.cwd()` is the Root Directory (`web/`), so the same relative path (`../results/index.json`) works if Vercel is given the full repo clone.

**Critical gotcha:** When Vercel sets Root Directory to `web/`, it does NOT restrict file system access to that folder — it only changes where `npm install` runs and what `next build` is invoked from. `process.cwd()` inside the build resolves to `/vercel/path0/web` (or similar), so `path.join(process.cwd(), '..', 'results', 'index.json')` correctly reaches `results/index.json` at the repo root during the Vercel build.

### Pattern 1: Server Component Data Loading

**What:** Read `results/index.json` directly with `fs.readFile` inside an async Server Component at build time. No `getStaticProps`, no API route, no `fetch()`.

**When to use:** Any page/component that reads static committed files and has no user-interaction dependency. This is the App Router equivalent of `getStaticProps`.

**Example:**
```typescript
// web/lib/data.ts
import { readFile } from 'fs/promises';
import path from 'path';

export interface RunResult {
  run_id: string;
  harness: string;
  harness_version: string;
  model: string;
  composite_score: number;
  schema_valid: boolean;
  scores: {
    actionability: { score: number; rationale: string };
    reasoning_transparency: { score: number; rationale: string };
    completeness: { score: number; rationale: string };
  };
  cost_usd: number;
  latency_ms: number;
  run_date: string;
}

export async function loadResults(): Promise<RunResult[]> {
  // process.cwd() = web/ directory; go up one level to repo root
  const filePath = path.join(process.cwd(), '..', 'results', 'index.json');
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw) as RunResult[];
}
```

```typescript
// web/app/page.tsx  (Server Component — no 'use client')
import { loadResults } from '@/lib/data';
import ScoresTable from '@/components/ScoresTable';
import DimensionChart from '@/components/DimensionChart';

export default async function DashboardPage() {
  const results = await loadResults();
  return (
    <main>
      <ScoresTable results={results} />
      <DimensionChart results={results} />
    </main>
  );
}
```

### Pattern 2: Client Component for Charts

**What:** Recharts components access DOM APIs (ResponsiveContainer needs browser dimensions). All Recharts chart components must be in Client Components with `'use client'`.

**When to use:** Any component that renders a Recharts chart.

**Example:**
```typescript
// web/components/DimensionChart.tsx
'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import type { RunResult } from '@/lib/data';

interface Props {
  results: RunResult[];
}

export default function DimensionChart({ results }: Props) {
  const chartData = results.map(r => ({
    model: r.model.split('/')[1],   // strip provider prefix
    harness: r.harness,
    actionability: r.scores.actionability.score,
    reasoning_transparency: r.scores.reasoning_transparency.score,
    completeness: r.scores.completeness.score,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="model" />
        <YAxis domain={[0, 5]} />
        <Tooltip />
        <Legend />
        <Bar dataKey="actionability" fill="#6366f1" />
        <Bar dataKey="reasoning_transparency" fill="#8b5cf6" />
        <Bar dataKey="completeness" fill="#a78bfa" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### Pattern 3: DASH-04 Run Metadata — Handling Temperature

The `results/index.json` fields cover most of DASH-04 (model name, run_date, harness_version). However, **temperature is NOT in index.json** — it is in `results/<run-id>/meta.json`. There are two options:

1. **Preferred:** Read all 9 `meta.json` files at build time in `loadResults()` and merge temperature into each entry. This keeps the dashboard self-contained and satisfies DASH-04 fully.
2. **Simpler but incomplete:** Display the known default temperature (0.7 or whatever was used) as a static label. This is incorrect per DASH-04 requirements since temperature varies by model/run.

Use Option 1. The meta.json files are small and all 9 reads happen at build time with no runtime cost.

```typescript
// Augmented loader (add to lib/data.ts)
import { readFile } from 'fs/promises';
import path from 'path';

export interface RunMeta {
  temperature: number;
  model_version?: string;
}

export async function loadResults(): Promise<(RunResult & RunMeta)[]> {
  const indexPath = path.join(process.cwd(), '..', 'results', 'index.json');
  const results: RunResult[] = JSON.parse(await readFile(indexPath, 'utf-8'));

  return Promise.all(results.map(async (r) => {
    const metaPath = path.join(process.cwd(), '..', 'results', r.run_id, 'meta.json');
    const meta: RunMeta = JSON.parse(await readFile(metaPath, 'utf-8'));
    return { ...r, temperature: meta.temperature };
  }));
}
```

### Anti-Patterns to Avoid

- **`output: 'export'` on Vercel:** Do not set this unless you have a reason to produce a portable `out/` folder. Vercel runs `next build` and serves the result natively — it handles static generation without the `export` flag. Setting it disables Image Optimization and breaks features you may want later.
- **Using `getStaticProps`:** This is Pages Router syntax. In App Router, async Server Components are the correct pattern.
- **Putting chart data fetching in a `useEffect`:** The data is available at build time; fetch it server-side and pass as props to the Client Component.
- **ResponsiveContainer without a fixed height parent:** ResponsiveContainer with `height="100%"` inside a container with no height set results in a collapsed chart. Always set an explicit `height` on ResponsiveContainer or its parent.
- **Importing Recharts in a Server Component:** Results in a build error because Recharts uses browser-only APIs. The `'use client'` directive is required.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bar chart / radar chart | Custom SVG chart with D3 | Recharts `BarChart` or `RadarChart` | Recharts handles axis scaling, tooltips, legend, responsiveness; ~50 lines vs 500+ |
| Copy-to-clipboard button | Custom clipboard API handler | Native `navigator.clipboard.writeText()` in a small Client Component | No library needed for a single button |
| Responsive table layout | Custom CSS grid/flex | Tailwind responsive prefixes (`sm:`, `md:`) | Already in stack |
| Percentage formatting | Custom number format utility | `(value).toFixed(1)` + `%` inline | Single operation doesn't need a library |

**Key insight:** With only 9 data points across 3 harnesses and 3 models, nothing in this dashboard needs optimization for scale. The value is in correctness and speed of delivery.

---

## Common Pitfalls

### Pitfall 1: `process.cwd()` path resolution differs between local dev and Vercel

**What goes wrong:** Locally, `process.cwd()` may be the repo root if `next dev` is run from there. On Vercel with Root Directory = `web`, it's `web/`. Code that works locally breaks on Vercel.

**Why it happens:** `process.cwd()` is wherever the Node process was started, not where the source file lives.

**How to avoid:** Always use `path.join(process.cwd(), '..', 'results', 'index.json')` and run `next dev` from within `web/` locally. Add a note in web/README or a local dev script. Alternatively, verify by logging `process.cwd()` in a build step.

**Warning signs:** `ENOENT: no such file or directory` errors during Vercel build on the JSON read step.

### Pitfall 2: Recharts `ResponsiveContainer` causes hydration mismatch

**What goes wrong:** SSR renders the chart at 0x0 (server has no browser dimensions), client re-renders at actual size — React hydration warning.

**Why it happens:** `ResponsiveContainer` uses `ResizeObserver` which is browser-only.

**How to avoid:** Use `suppressHydrationWarning` on the chart wrapper, or wrap the Recharts component in a `dynamic` import with `ssr: false`:

```typescript
// In a Server or Client Component
import dynamic from 'next/dynamic';
const DimensionChart = dynamic(() => import('./DimensionChart'), { ssr: false });
```

This is the standard Next.js pattern for browser-only chart rendering.

**Warning signs:** React hydration mismatch warnings in console during dev; chart briefly disappears or flickers on first load.

### Pitfall 3: Vercel Root Directory vs. monorepo file access

**What goes wrong:** Setting Root Directory to `web` causes Vercel's install command to run `npm install` from `web/`, which correctly installs the web app's dependencies. BUT if you expect to `import` from `../src` (the CLI source), that won't work — and shouldn't; the web app should only read the JSON data files.

**Why it happens:** Vercel changes the working directory for installs and builds, not for file system access at runtime.

**How to avoid:** Keep the dashboard self-contained. The only cross-directory dependency is reading `../results/index.json` and `../results/<run-id>/meta.json` at build time via `fs`. Do not attempt to import TypeScript source from the root `src/`.

**Warning signs:** `Cannot find module '../../src/contracts'` at build time.

### Pitfall 4: Image Optimization disabled by `output: 'export'`

**What goes wrong:** If `output: 'export'` is set (unnecessary for Vercel), `next/image` stops working with the default loader, requiring a custom image loader or `images: { unoptimized: true }`.

**Why it happens:** Static export produces plain HTML files with no server — image optimization needs a server.

**How to avoid:** Do not set `output: 'export'`. On Vercel, just use `next build`. If you genuinely need a portable static export (e.g. GitHub Pages fallback), add `images: { unoptimized: true }` to next.config.ts.

### Pitfall 5: Tailwind v4 config differences

**What goes wrong:** Tutorials for Tailwind v3 reference `tailwind.config.js` and `content` arrays. Tailwind v4 auto-scans and uses CSS-first configuration — no `tailwind.config.js` needed.

**Why it happens:** Tailwind v4 (released early 2025) changed the configuration approach significantly.

**How to avoid:** After `create-next-app --tailwind`, the setup is complete. Do not create a `tailwind.config.js`. Configure tokens in `globals.css` using `@theme` directive if needed.

---

## Code Examples

Verified patterns from official sources:

### Vercel monorepo Root Directory configuration (vercel.json in web/)
```json
{
  "framework": "nextjs"
}
```
That's all that's needed in `web/vercel.json`. Set Root Directory to `web` in the Vercel project dashboard settings.

### next.config.ts (minimal, no static export)
```typescript
// Source: https://nextjs.org/docs/app/api-reference/config/next-config-js
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // No output: 'export' — Vercel handles static generation natively
  // images: { unoptimized: true } — only needed if deploying outside Vercel
};

export default nextConfig;
```

### Tailwind CSS v4 in globals.css
```css
/* Source: https://tailwindcss.com/docs/guides/nextjs */
@import "tailwindcss";
/* That's the complete Tailwind v4 setup — no config file needed */
```

### Data type definition matching actual index.json shape
```typescript
// Based on inspection of results/index.json
export interface RunResult {
  run_id: string;
  harness: 'inventory-optimization' | 'pricing-strategy' | 'financial-forecasting';
  harness_version: string;         // e.g. "1.0.0"
  model: string;                   // e.g. "anthropic/claude-sonnet-4-6"
  composite_score: number;         // 0-100
  schema_valid: boolean;
  scores: {
    actionability: DimensionScore;
    reasoning_transparency: DimensionScore;
    completeness: DimensionScore;
  };
  cost_usd: number;
  latency_ms: number;
  run_date: string;                // ISO 8601
}

export interface DimensionScore {
  score: number;    // 1-5
  rationale: string;
}
```

### DASH-05 "Run it yourself" section (pure JSX, no library)
```typescript
// web/components/RunItYourself.tsx  (Server Component — no 'use client' needed)
export default function RunItYourself() {
  const command = 'benchmark --harness inventory-optimization --model anthropic/claude-sonnet-4-6';

  return (
    <section>
      <h2>Run it yourself</h2>
      <pre><code>{command}</code></pre>
      <a href="https://github.com/YOUR_REPO/blob/main/docs/running.md">
        Full setup instructions →
      </a>
    </section>
  );
}
```

For the copy-to-clipboard button, add a small `'use client'` CopyButton component that calls `navigator.clipboard.writeText(command)`. No library needed.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getStaticProps` (Pages Router) | Async Server Components (App Router) | Next.js 13 (stable 13.4) | Cleaner data fetching, no special function needed |
| `next export` command | `output: 'export'` in next.config | Next.js 14 | `next export` removed entirely |
| `tailwind.config.js` with `content` arrays | CSS-first `@import "tailwindcss"` | Tailwind v4 (2025) | No config file required |
| `zod-to-json-schema` | Zod v4 native `z.toJSONSchema()` | Zod v4 (Nov 2025) | Already used in this project |

**Deprecated/outdated:**
- `next export` CLI command: Removed in Next.js 14. Use `output: 'export'` in config — or don't use it at all on Vercel.
- `getStaticProps` / `getStaticPaths`: Still work in Pages Router, but Pages Router is legacy for new projects.
- Recharts v2.x: Version 3.x is current with React 19 compatibility.

---

## Open Questions

1. **Temperature field in index.json vs meta.json**
   - What we know: `results/index.json` does NOT have `temperature`; `results/<run-id>/meta.json` does
   - What's unclear: Whether meta.json temperature field name and structure are consistent across all 9 runs
   - Recommendation: Inspect one `meta.json` before planning DASH-04 implementation. Plan should include reading meta.json at build time (Pattern 3 above).

2. **model field granularity — version vs slug**
   - What we know: `model` field is `"anthropic/claude-sonnet-4-6"` — this is the slug, not a full version string with patch number
   - What's unclear: Whether DASH-04 "model name+version" requires the full API version or the slug is sufficient
   - Recommendation: Use the slug as-is; if full version is needed, it would come from meta.json's `provider_api_version` or similar field

3. **Chart grouping strategy for DASH-03**
   - What we know: 9 runs = 3 harnesses x 3 models; per-dimension breakdown could be grouped by model or by harness
   - What's unclear: Whether a single chart or per-harness charts are more readable
   - Recommendation: Group by model first (3 bars per dimension), with a harness selector or tabs. For 7-day prototype, a single grouped bar chart per harness is simplest.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None currently in project (root uses Node assert for CLI tests) |
| Config file | None — Wave 0 must establish |
| Quick run command | `npm run build` (build-time errors are the primary validation gate) |
| Full suite command | `npm run build && npm run lint` from `web/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Dashboard URL publicly accessible | smoke (manual) | Vercel deployment URL returns HTTP 200 | N/A — manual |
| DASH-02 | Model comparison table visible on load | build smoke | `cd web && npm run build` — no build errors | Wave 0 |
| DASH-03 | Per-dimension chart renders | build smoke | `cd web && npm run build` — no build errors | Wave 0 |
| DASH-04 | Metadata visible: model, run_date, harness_version, temperature | unit | `node scripts/verify-dashboard-data.ts` — checks all 9 entries have required fields | Wave 0 |
| DASH-05 | "Run it yourself" section present | build smoke | `cd web && npm run build` — no build errors | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd web && npm run build`
- **Per wave merge:** `cd web && npm run build && npm run lint`
- **Phase gate:** Full build green + manual Vercel deployment URL check before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `web/` directory — create via `create-next-app`
- [ ] `web/package.json` — needs `recharts` dependency
- [ ] `scripts/verify-dashboard-data.ts` — checks all 9 entries in index.json have run_id, harness, model, composite_score, scores, cost_usd, latency_ms, run_date; and that all 9 meta.json files exist with temperature field

---

## Sources

### Primary (HIGH confidence)
- Official Next.js docs (https://nextjs.org/docs/app/guides/static-exports) — static export limitations and supported features, last updated 2026-03-03
- Official Vercel docs (https://vercel.com/docs/builds/configure-a-build) — Root Directory configuration for monorepos
- Official Vercel docs (https://vercel.com/docs/monorepos) — monorepo deployment pattern
- Official Next.js docs (https://vercel.com/docs/frameworks/full-stack/nextjs) — Vercel-native Next.js deployment
- Official Tailwind docs (https://tailwindcss.com/docs/guides/nextjs) — v4 setup with Next.js
- Direct inspection of `results/index.json` — confirmed field names, data shapes, 9 entries

### Secondary (MEDIUM confidence)
- npm search results confirming recharts@3.x is current (3.8.0 as of 2026-03-07), 3.6M+ weekly downloads
- npm search results confirming next@16.1.6 is current
- WebSearch cross-referencing App Router as current default vs Pages Router legacy for new projects
- Multiple sources confirming Recharts requires `'use client'` in Next.js App Router

### Tertiary (LOW confidence)
- Recharts bundle size claims (large) — not independently verified via bundlephobia; known issue but actual gzip size for v3.x not confirmed
- Tailwind v4 "no config file needed" claim — verified via official docs link, so actually MEDIUM confidence

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Next.js, Tailwind, Recharts versions confirmed via npm; official docs verified
- Architecture: HIGH — Data shape confirmed by direct file inspection; Next.js App Router patterns from official docs
- Pitfalls: HIGH — `process.cwd()` path and `'use client'` requirements verified against official docs; static export warning verified
- Vercel deployment: HIGH — Monorepo Root Directory pattern documented in official Vercel docs

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (Next.js minor versions ship frequently but App Router patterns are stable)
