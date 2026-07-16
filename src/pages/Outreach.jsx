import { useSearchParams } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { cn } from '../lib/utils';
import ComposeTab from '../components/outreach/ComposeTab';
import TemplatesTab from '../components/outreach/TemplatesTab';
import HistoryTab from '../components/outreach/HistoryTab';

const TABS = [
  { id: 'compose', label: 'Compose & Send' },
  { id: 'templates', label: 'Templates' },
  { id: 'history', label: 'History' },
];

export default function Outreach() {
  // The tab lives in the URL so "Emails sent" elsewhere can link straight to the
  // send history. An unknown ?tab= falls back to compose rather than rendering
  // an empty page.
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab');
  const tab = TABS.some((t) => t.id === requested) ? requested : 'compose';
  const setTab = (id) => setSearchParams(id === 'compose' ? {} : { tab: id }, { replace: true });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Mail className="h-5 w-5 text-blue-500" />
          Email Campaigns
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage outreach email templates and send the Apprend demo to your contacts.
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === t.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'compose' && <ComposeTab />}
      {tab === 'templates' && <TemplatesTab />}
      {tab === 'history' && <HistoryTab />}
    </div>
  );
}
