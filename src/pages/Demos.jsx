import { useState } from 'react';
import { ExternalLink, Copy, Globe, Rocket, Link, Check } from 'lucide-react';

const DEMO_SITES = [
  {
    name: 'True Molding',
    url: 'https://true-molding.pages.dev',
    industry: 'Plastic Injection Molding',
    description: 'AI-powered defect prediction and mold optimization for injection molding companies.',
    color: '#1e40af',
    letter: 'T',
  },
  {
    name: 'TrueQuote CNC',
    url: 'https://truequote-cnc.pages.dev',
    industry: 'CNC Machining',
    description: 'Instant AI quoting for CNC machine shops. Turn RFQs into quotes in minutes.',
    color: '#0369a1',
    letter: 'Q',
  },
  {
    name: 'StampRight AI',
    url: 'https://stampright-ai.pages.dev',
    industry: 'Metal Stamping',
    description: 'AI springback prediction for metal stamping. Reduce die corrections by 80%.',
    color: '#b45309',
    letter: 'S',
  },
  {
    name: 'NestFlow',
    url: 'https://nestflow-bvf.pages.dev',
    industry: 'Sheet Metal Fabrication',
    description: 'AI nesting optimization for sheet metal. Reduce material waste by up to 35%.',
    color: '#059669',
    letter: 'N',
  },
  {
    name: 'PackForm AI',
    url: 'https://packform-ai.pages.dev',
    industry: 'Packaging Manufacturing',
    description: 'AI packaging design optimization. Reduce material costs by 20-30%.',
    color: '#7c3aed',
    letter: 'P',
  },
  {
    name: 'BatchWise',
    url: 'https://batchwise-4qn.pages.dev',
    industry: 'Food & Beverage Manufacturing',
    description: 'AI batch scheduling and HACCP compliance. Reduce changeover time by 40%.',
    color: '#dc2626',
    letter: 'B',
  },
];

export default function Demos() {
  const [copiedIdx, setCopiedIdx] = useState(null);

  const copyLink = async (url, idx) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
            <Rocket className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Industry Demos</h1>
          </div>
        </div>
        <p className="text-gray-500 mt-1 max-w-2xl">
          AI tools built for specific manufacturing industries. Share these with prospects to demonstrate value.
        </p>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {DEMO_SITES.map((site, idx) => (
          <div
            key={site.name}
            className="group relative flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Color bar */}
            <div
              className="h-1.5 rounded-t-xl"
              style={{ background: site.color }}
            />

            <div className="flex flex-1 flex-col p-5">
              {/* Icon + name */}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-white text-lg font-bold"
                  style={{ backgroundColor: site.color }}
                >
                  {site.letter}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 text-[15px] leading-tight">
                    {site.name}
                  </h3>
                  <span
                    className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                    style={{
                      backgroundColor: site.color + '14',
                      color: site.color,
                    }}
                  >
                    {site.industry}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-500 leading-relaxed mb-4 flex-1">
                {site.description}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Demo
                </a>
                <button
                  onClick={() => copyLink(site.url, idx)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {copiedIdx === idx ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Link className="h-3.5 w-3.5" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toast */}
      {copiedIdx !== null && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
          <div className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
            <Check className="h-4 w-4 text-green-400" />
            Link copied to clipboard
          </div>
        </div>
      )}
    </div>
  );
}
