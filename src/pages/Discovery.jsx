import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  Search,
  Building2,
  Users,
  MapPin,
  Plus,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  History,
  LayoutGrid,
  LayoutList,
  Download,
  X,
  Clock,
  FileText,
} from 'lucide-react';
import { useSearchCompanies, useEnrichCompany } from '../hooks/useDiscovery';
import { formatNumber, cn } from '../lib/utils';
import DocumentDiscovery from '../components/discovery/DocumentDiscovery';

const MANUFACTURING_INDUSTRIES = [
  'Injection Molding',
  'CNC Machining',
  'Metal Stamping',
  'Die Casting',
  'Sheet Metal Fabrication',
  'Plastic Extrusion',
  'Powder Coating',
  '3D Printing / Additive Manufacturing',
  'Welding & Assembly',
  'Surface Finishing',
  'Precision Machining',
  'Tool & Die Making',
  'Metal Forging',
  'Wire EDM',
  'Laser Cutting',
  'Rubber & Silicone Molding',
  'PCB Manufacturing',
  'Packaging Manufacturing',
  'Textile Manufacturing',
  'Food Processing Equipment',
];

function getRelativeDate(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

export default function Discovery() {
  const navigate = useNavigate();
  const searchCompanies = useSearchCompanies();
  const enrichCompany = useEnrichCompany();

  const [form, setForm] = useState({
    industry_keyword: '',
    location: '',
    min_employees: '',
    max_employees: '',
    keywords: '',
    num_results: 10,
  });

  const [tab, setTab] = useState('search'); // search | document
  const [results, setResults] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // View toggle
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'card'

  // Saved searches
  const [savedSearches, setSavedSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('landline_saved_searches') || '[]');
    } catch { return []; }
  });
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');

  // Search history
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('landline_search_history') || '[]');
    } catch { return []; }
  });

  // Industry autocomplete
  const [showIndustrySuggestions, setShowIndustrySuggestions] = useState(false);
  const industryInputRef = useRef(null);
  const industryDropdownRef = useRef(null);

  // Bulk enrich
  const [bulkEnrichState, setBulkEnrichState] = useState({ running: false, current: 0, total: 0 });

  // Persist saved searches
  useEffect(() => {
    localStorage.setItem('landline_saved_searches', JSON.stringify(savedSearches));
  }, [savedSearches]);

  // Persist search history
  useEffect(() => {
    localStorage.setItem('landline_search_history', JSON.stringify(searchHistory));
  }, [searchHistory]);

  // Close industry dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        industryInputRef.current && !industryInputRef.current.contains(e.target) &&
        industryDropdownRef.current && !industryDropdownRef.current.contains(e.target)
      ) {
        setShowIndustrySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredIndustries = form.industry_keyword.trim()
    ? MANUFACTURING_INDUSTRIES.filter((ind) =>
        ind.toLowerCase().includes(form.industry_keyword.toLowerCase())
      ).slice(0, 6)
    : [];

  const handleSaveSearch = () => {
    if (!saveSearchName.trim()) return;
    const newSearch = { id: Date.now(), name: saveSearchName.trim(), criteria: { ...form } };
    setSavedSearches((prev) => [...prev, newSearch]);
    setSaveSearchName('');
    setShowSaveInput(false);
  };

  const handleDeleteSavedSearch = (id) => {
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
  };

  const handleLoadCriteria = (criteria) => {
    setForm({ ...criteria });
  };

  const addToHistory = (formData) => {
    const entry = { criteria: { ...formData }, date: new Date().toISOString() };
    setSearchHistory((prev) => [entry, ...prev].slice(0, 5));
  };

  const handleBulkEnrich = async () => {
    if (!results?.companies?.length || bulkEnrichState.running) return;
    const companies = results.companies.filter((c) => c.id);
    setBulkEnrichState({ running: true, current: 0, total: companies.length });
    for (let i = 0; i < companies.length; i++) {
      setBulkEnrichState((prev) => ({ ...prev, current: i + 1 }));
      try {
        await enrichCompany.mutateAsync({ id: companies[i].id, data: { find_contacts: true } });
      } catch {
        // continue with next
      }
    }
    setBulkEnrichState({ running: false, current: 0, total: 0 });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!form.industry_keyword.trim() && !form.location.trim() && !form.keywords.trim()) return;
    const payload = {
      industry_keyword: form.industry_keyword || undefined,
      location: form.location || undefined,
      min_employees: form.min_employees ? Number(form.min_employees) : undefined,
      max_employees: form.max_employees ? Number(form.max_employees) : undefined,
      keywords: form.keywords ? form.keywords.split(',').map((k) => k.trim()).filter(Boolean) : undefined,
      num_results: form.num_results,
    };
    addToHistory(form);
    searchCompanies.mutate(payload, {
      onSuccess: (data) => {
        setResults(data);
        setHasSearched(true);
      },
      onSettled: () => {
        if (!hasSearched) setHasSearched(true);
      },
    });
  };

  const handleEnrich = (companyId) => {
    enrichCompany.mutate({ id: companyId, data: { find_contacts: true } });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Company Discovery</h1>
        <p className="mt-1 text-sm text-gray-500">
          {tab === 'search'
            ? 'Find and import new companies from Apollo based on industry, location, and keywords.'
            : 'Upload a document listing companies or people — AI finds the leads, drafts outreach, and follows up.'}
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-200" role="tablist">
        {[
          { key: 'search', label: 'Search', Icon: Search },
          { key: 'document', label: 'From a document', Icon: FileText },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              '-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium',
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

      {tab === 'document' && <DocumentDiscovery />}

      {tab === 'search' && (
      <>

      {/* Saved Searches & History */}
      {(savedSearches.length > 0 || searchHistory.length > 0) && (
        <div className="space-y-3">
          {savedSearches.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <BookmarkCheck className="h-3.5 w-3.5" />
                Saved Searches
              </div>
              <div className="flex flex-wrap gap-2">
                {savedSearches.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleLoadCriteria(s.criteria)}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    <Bookmark className="h-3 w-3" />
                    {s.name}
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteSavedSearch(s.id); }}
                      className="ml-0.5 rounded-full p-0.5 opacity-0 transition-opacity hover:bg-blue-200 group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {searchHistory.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <History className="h-3.5 w-3.5" />
                Recent Searches
              </div>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((h, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLoadCriteria(h.criteria)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
                  >
                    <Clock className="h-3 w-3 text-gray-400" />
                    {[h.criteria.industry_keyword, h.criteria.location].filter(Boolean).join(' - ') || 'Search'}
                    <span className="text-gray-400">{getRelativeDate(h.date)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">Industry Keyword</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  ref={industryInputRef}
                  type="text"
                  value={form.industry_keyword}
                  onChange={(e) => {
                    setForm({ ...form, industry_keyword: e.target.value });
                    setShowIndustrySuggestions(true);
                  }}
                  onFocus={() => setShowIndustrySuggestions(true)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., injection molding, CNC machining"
                />
                {showIndustrySuggestions && filteredIndustries.length > 0 && (
                  <div
                    ref={industryDropdownRef}
                    className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
                  >
                    {filteredIndustries.map((ind) => (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => {
                          setForm({ ...form, industry_keyword: ind });
                          setShowIndustrySuggestions(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Building2 className="h-3.5 w-3.5 text-gray-400" />
                        {ind}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., Ohio, United States"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">Min Employees</label>
                <input
                  type="number"
                  min="1"
                  value={form.min_employees}
                  onChange={(e) => setForm({ ...form, min_employees: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="10"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">Max Employees</label>
                <input
                  type="number"
                  min="1"
                  value={form.max_employees}
                  onChange={(e) => setForm({ ...form, max_employees: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="500"
                />
              </div>
            </div>

            <div className="sm:col-span-2 lg:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Additional Keywords</label>
              <input
                type="text"
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Comma-separated, e.g., automotive, aerospace, precision"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Number of Results</label>
              <select
                value={form.num_results}
                onChange={(e) => setForm({ ...form, num_results: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            {showSaveInput ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={saveSearchName}
                  onChange={(e) => setSaveSearchName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveSearch(); } }}
                  className="w-48 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Search name..."
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveSearch}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-2 text-sm font-medium text-white hover:bg-green-600"
                >
                  <BookmarkCheck className="h-4 w-4" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => { setShowSaveInput(false); setSaveSearchName(''); }}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSaveInput(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                <Bookmark className="h-4 w-4" />
                Save Search
              </button>
            )}
            <button
              type="submit"
              disabled={searchCompanies.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:opacity-50"
            >
              {searchCompanies.isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
              Search Apollo
            </button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      {searchCompanies.isPending && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="text-sm text-gray-500">Searching Apollo for companies...</p>
          </div>
        </div>
      )}

      {!searchCompanies.isPending && hasSearched && results && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Results
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({results.total || 0} found, {results.imported || 0} imported, {results.already_existed || 0} already existed)
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkEnrich}
                disabled={bulkEnrichState.running || !results?.companies?.length}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
              >
                {bulkEnrichState.running ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                    {bulkEnrichState.current} / {bulkEnrichState.total} enriched
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    Import All Results
                  </>
                )}
              </button>
              <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={cn(
                    'rounded-md p-1.5 transition-colors',
                    viewMode === 'table' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'
                  )}
                >
                  <LayoutList className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  className={cn(
                    'rounded-md p-1.5 transition-colors',
                    viewMode === 'card' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {results.companies && results.companies.length > 0 ? (
            viewMode === 'table' ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Domain</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Industry</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Employees</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.companies.map((company, idx) => (
                    <tr key={company.id || idx} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 flex-shrink-0 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{company.name}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {company.domain ? (
                          <a
                            href={`https://${company.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                          >
                            {company.domain}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">--</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {company.industry || '--'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Users className="h-3.5 w-3.5 text-gray-400" />
                          {company.employees ? formatNumber(company.employees) : '--'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          {[company.city, company.state].filter(Boolean).join(', ') || '--'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {company.status === 'imported' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                            <Plus className="h-3 w-3" />
                            Imported
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Exists
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {company.status === 'imported' ? (
                          <button
                            type="button"
                            onClick={() => handleEnrich(company.id)}
                            disabled={enrichCompany.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Enrich & Find Contacts
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate(`/companies/${company.id}`)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.companies.map((company, idx) => (
                <div
                  key={company.id || idx}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 flex-shrink-0 text-gray-400" />
                      <span className="text-sm font-bold text-gray-900">{company.name}</span>
                    </div>
                    {company.status === 'imported' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        <Plus className="h-3 w-3" />
                        New
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Exists
                      </span>
                    )}
                  </div>
                  {company.domain && (
                    <a
                      href={`https://${company.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                    >
                      {company.domain}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <div className="mt-2 space-y-1.5 text-xs text-gray-600">
                    {company.industry && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-gray-400" />
                        {company.industry}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {[company.city, company.state].filter(Boolean).join(', ') || '--'}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      {company.employees ? formatNumber(company.employees) : '--'} employees
                    </div>
                  </div>
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    {company.status === 'imported' ? (
                      <button
                        type="button"
                        onClick={() => handleEnrich(company.id)}
                        disabled={enrichCompany.isPending}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Enrich & Find Contacts
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate(`/companies/${company.id}`)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View Company
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-16">
              <Search className="h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-900">No results found</p>
              <p className="mt-1 text-sm text-gray-500">Try broadening your search criteria.</p>
            </div>
          )}
        </div>
      )}

      {!searchCompanies.isPending && !hasSearched && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-16">
          <Globe className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-900">Search for companies</p>
          <p className="mt-1 text-sm text-gray-500">
            Search for companies by industry, location, or keywords using Apollo.
          </p>
        </div>
      )}
      </>
      )}
    </div>
  );
}
