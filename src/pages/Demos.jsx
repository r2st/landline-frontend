import { useState } from 'react';
import { ExternalLink, Copy, Rocket, Link, Check } from 'lucide-react';

const DEMO_SITES = [
  {
    name: 'True Molding',
    url: 'https://true-molding-demo.pages.dev',
    industry: 'Plastic Injection Molding',
    description: 'AI-powered defect prediction and mold optimization for injection molding companies.',
    color: '#1e40af',
    letter: 'T',
  },
  {
    name: 'TrueQuote CNC',
    url: 'https://smart-quote-generator.pages.dev',
    industry: 'Manufacturing Quoting',
    description: 'Instant AI quoting from RFQs. Turn machining requests into accurate quotes in minutes.',
    color: '#7c3aed',
    letter: 'T',
  },
  {
    name: 'StampRight AI',
    url: 'https://stamping-defect-predictor.pages.dev',
    industry: 'Metal Stamping',
    description: 'AI springback and defect prediction for metal stamping. Reduce die corrections by 80%.',
    color: '#b45309',
    letter: 'S',
  },
  {
    name: 'NestFlow',
    url: 'https://nestflow.pages.dev',
    industry: 'Sheet Nesting & Cutting',
    description: 'AI nesting optimization that maximizes material yield and minimizes scrap on every sheet.',
    color: '#0d9488',
    letter: 'N',
  },
  {
    name: 'PackForm AI',
    url: 'https://packform-ai.pages.dev',
    industry: 'Thermoforming & Packaging',
    description: 'AI-driven thermoforming optimization for consistent wall thickness and fewer rejects.',
    color: '#c2410c',
    letter: 'P',
  },
  {
    name: 'BatchWise',
    url: 'https://batchwise.pages.dev',
    industry: 'Batch & Process Manufacturing',
    description: 'AI batch optimization that improves yield, consistency, and right-first-time production.',
    color: '#9333ea',
    letter: 'B',
  },
  {
    name: 'Stamping Defect Predictor',
    url: 'https://stamping-defect-predictor.pages.dev',
    industry: 'Metal Stamping',
    description: 'AI springback and defect prediction for metal stamping. Reduce die corrections by 80%.',
    color: '#b45309',
    letter: 'S',
  },
  {
    name: 'Weld & Paint Quality Assistant',
    url: 'https://equipment-health-predictor.pages.dev',
    industry: 'Welding & Finishing',
    description: 'AI quality monitoring for weld and paint lines. Catch defects before they reach the customer.',
    color: '#059669',
    letter: 'W',
  },
  {
    name: 'Packaging Line Optimizer',
    url: 'https://packaging-line-optimizer.pages.dev',
    industry: 'Packaging Operations',
    description: 'AI optimization for packaging lines. Boost throughput and cut changeover downtime.',
    color: '#0891b2',
    letter: 'P',
  },
  {
    name: 'Food Safety & Quality Monitor',
    url: 'https://food-safety-monitor.pages.dev',
    industry: 'Food & Beverage',
    description: 'AI food safety and quality monitoring. Stay ahead of HACCP and compliance risks.',
    color: '#16a34a',
    letter: 'F',
  },
  {
    name: 'PCB Assembly Quality Analyzer',
    url: 'https://pcb-quality-analyzer.pages.dev',
    industry: 'Electronics Assembly',
    description: 'AI inspection and quality analytics for PCB assembly. Reduce solder and placement defects.',
    color: '#2563eb',
    letter: 'P',
  },
  {
    name: 'Smart Production Scheduler',
    url: 'https://smart-production-scheduler.pages.dev',
    industry: 'Production Planning',
    description: 'AI scheduling that balances demand, capacity, and constraints to hit more on-time deliveries.',
    color: '#4f46e5',
    letter: 'S',
  },
  {
    name: 'Textile Quality & Dye Optimizer',
    url: 'https://textile-quality-optimizer.pages.dev',
    industry: 'Textiles & Dyeing',
    description: 'AI dye and quality optimization for textiles. Improve color consistency and reduce re-dyes.',
    color: '#db2777',
    letter: 'T',
  },
  {
    name: 'EnergyIQ',
    url: 'https://manufacturing-energy-optimizer.pages.dev',
    industry: 'Energy Management',
    description: 'AI energy optimization for plants. Cut energy costs and emissions without slowing production.',
    color: '#ca8a04',
    letter: 'E',
  },
  {
    name: 'SafetyNet AI',
    url: 'https://workplace-safety-analyzer.pages.dev',
    industry: 'Workplace Safety',
    description: 'AI safety risk analysis that flags hazards and near-misses before incidents happen.',
    color: '#dc2626',
    letter: 'S',
  },
  {
    name: 'ReactorMind',
    url: 'https://chemical-process-optimizer.pages.dev',
    industry: 'Chemical Processing',
    description: 'AI chemical process optimization for higher yield, stable reactions, and lower waste.',
    color: '#7c3aed',
    letter: 'R',
  },
  {
    name: 'StockIQ',
    url: 'https://inventory-intelligence-demo.pages.dev',
    industry: 'Inventory Intelligence',
    description: 'AI inventory intelligence that balances stock levels, cuts carrying costs, and avoids stockouts.',
    color: '#0369a1',
    letter: 'S',
  },
  {
    name: 'AuditReady AI',
    url: 'https://compliance-traceability-checker.pages.dev',
    industry: 'Compliance & Traceability',
    description: 'AI compliance and traceability checks that keep you audit-ready with full lot genealogy.',
    color: '#475569',
    letter: 'A',
  },
  {
    name: 'TwinForge',
    url: 'https://process-digital-twin.pages.dev',
    industry: 'Process Digital Twin',
    description: 'AI process digital twin to simulate, test, and optimize production before changing the floor.',
    color: '#0e7490',
    letter: 'T',
  },
  {
    name: 'CauseIQ',
    url: 'https://ai-root-cause-investigator.pages.dev',
    industry: 'Root Cause Analysis',
    description: 'AI root cause investigator that pinpoints why defects happen and how to prevent recurrence.',
    color: '#b91c1c',
    letter: 'C',
  },
  {
    name: 'ChainGuard AI',
    url: 'https://supply-chain-risk-monitor.pages.dev',
    industry: 'Supply Chain Risk',
    description: 'AI supply chain risk monitoring that surfaces disruptions and supplier issues early.',
    color: '#1d4ed8',
    letter: 'C',
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
