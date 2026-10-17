import { useSearchParams } from 'react-router-dom';
import { FileText, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import ErrorBoundary from '../components/ErrorBoundary';
import ApolloSearch from '../components/discovery/ApolloSearch';
import DocumentDiscovery from '../components/discovery/DocumentDiscovery';

const TABS = [
  {
    key: 'search',
    label: 'Search',
    Icon: Search,
    blurb: 'Search Apollo’s B2B database by industry, location and size. Matches land in Companies, ready to enrich with decision-makers.',
  },
  {
    key: 'document',
    label: 'From a document',
    Icon: FileText,
    blurb: 'Upload a trade-show list, spreadsheet or PDF. AI pulls out the companies and people, then drafts outreach and follows up for you.',
  },
];

function TabFallback({ reset }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="text-sm font-medium text-red-800">This part of Discovery hit an unexpected error.</p>
      <p className="mt-1 text-sm text-red-700">Your uploads and imported companies are safe.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
      >
        Try again
      </button>
    </div>
  );
}

export default function Discovery() {
  // The tab (and, inside "From a document", the open file and step) live in
  // the URL, so navigating away and back — or reloading — keeps your place.
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'document' ? 'document' : 'search';
  const active = TABS.find((t) => t.key === tab);

  const selectTab = (key) => {
    const next = new URLSearchParams(params);
    if (key === 'search') next.delete('tab');
    else next.set('tab', key);
    if (key !== 'document') {
      next.delete('doc');
      next.delete('step');
    }
    setParams(next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Discovery</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Find new companies and the people to talk to, two ways. {active.blurb}
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-gray-200" role="tablist" aria-label="Discovery source">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => selectTab(key)}
            className={cn(
              '-mb-px inline-flex flex-shrink-0 items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        <ErrorBoundary resetKey={tab} fallback={({ reset }) => <TabFallback reset={reset} />}>
          {tab === 'document' ? <DocumentDiscovery /> : <ApolloSearch />}
        </ErrorBoundary>
      </div>
    </div>
  );
}
