import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Search,
  ChevronRight,
  BookOpen,
  Rocket,
  Users,
  Send,
  Radio,
  ShieldCheck,
  Sparkles,
  Settings,
  ArrowRight,
  ArrowLeft,
  FileText,
} from 'lucide-react';
import Markdown from '../components/Markdown';
import EmptyState from '../components/EmptyState';
import {
  helpCategories,
  helpArticles,
  getArticle,
  getCategory,
  articlesInCategory,
  searchArticles,
} from '../lib/helpContent';
import { cn } from '../lib/utils';

// Icon lookup for category chips — helpContent stores icon *names* (strings) so
// the data file stays free of React imports.
const CATEGORY_ICONS = {
  Rocket,
  Users,
  Send,
  Radio,
  ShieldCheck,
  Sparkles,
  Settings,
};

function CategoryIcon({ name, className }) {
  const Icon = CATEGORY_ICONS[name] || BookOpen;
  return <Icon className={className} />;
}

// ── Single article view (/help/:articleId) ──────────────────────────────────
function ArticleView({ articleId }) {
  const article = getArticle(articleId);

  if (!article) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <EmptyState
          icon={FileText}
          title="Article not found"
          description="That help article doesn't exist. Try searching or browse the categories."
        />
        <Link
          to="/help"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Help Center
        </Link>
      </div>
    );
  }

  const category = getCategory(article.category);
  const siblings = articlesInCategory(article.category).filter((a) => a.id !== article.id);

  return (
    <div className="mx-auto max-w-3xl">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm">
        <Link to="/help" className="text-gray-400 transition-colors hover:text-gray-700">
          Help Center
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
        {category && (
          <>
            <Link
              to={`/help?category=${category.id}`}
              className="text-gray-400 transition-colors hover:text-gray-700"
            >
              {category.title}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
          </>
        )}
        <span className="font-medium text-gray-900">{article.title}</span>
      </nav>

      <article className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
        <Markdown content={article.body} />

        {article.route && (
          <Link
            to={article.route}
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Go to this feature <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </article>

      {siblings.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            More in {category?.title}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {siblings.map((a) => (
              <Link
                key={a.id}
                to={`/help/${a.id}`}
                className="group flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
              >
                <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-300 group-hover:text-indigo-500" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-900">{a.title}</span>
                  {a.summary && (
                    <span className="block truncate text-xs text-gray-500">{a.summary}</span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Help Center home (/help) ─────────────────────────────────────────────────
function HelpHome() {
  const [query, setQuery] = useState('');
  // Read ?category= from the URL for deep links, but let the sidebar drive it
  // interactively afterwards.
  const initialCategory = new URLSearchParams(window.location.search).get('category');
  const [activeCategory, setActiveCategory] = useState(initialCategory || 'all');

  const results = useMemo(() => {
    const searched = searchArticles(query);
    if (query.trim() || activeCategory === 'all') return searched;
    return searched.filter((a) => a.category === activeCategory);
  }, [query, activeCategory]);

  const searching = !!query.trim();

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Help Center</h1>
            <p className="text-sm text-gray-500">
              Guides for every feature in DoAide Prospect. Search or browse by topic.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400">
          <Search className="h-5 w-5 flex-shrink-0 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help articles…"
            aria-label="Search help articles"
            className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Category sidebar */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <nav className="space-y-1" aria-label="Help categories">
            <button
              type="button"
              onClick={() => {
                setActiveCategory('all');
                setQuery('');
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                activeCategory === 'all' && !searching
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <BookOpen className="h-4 w-4 flex-shrink-0" />
              All articles
            </button>
            {helpCategories.map((cat) => {
              const isActive = activeCategory === cat.id && !searching;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setQuery('');
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <CategoryIcon
                    name={cat.icon}
                    className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-indigo-600' : 'text-gray-400')}
                  />
                  <span className="truncate">{cat.title}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Article list */}
        <div className="min-w-0">
          {searching && (
            <p className="mb-3 text-sm text-gray-500">
              {results.length === 0
                ? `No articles match “${query}”.`
                : `${results.length} result${results.length === 1 ? '' : 's'} for “${query}”`}
            </p>
          )}

          {!searching && activeCategory !== 'all' && (
            <p className="mb-3 text-sm text-gray-500">{getCategory(activeCategory)?.description}</p>
          )}

          {results.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Nothing found"
              description="Try a different search term, or browse the categories on the left."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {results.map((a) => {
                const cat = getCategory(a.category);
                return (
                  <Link
                    key={a.id}
                    to={`/help/${a.id}`}
                    className="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-indigo-200 hover:shadow-sm"
                  >
                    <div className="mb-1.5 flex items-center gap-1.5">
                      {cat && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                          <CategoryIcon name={cat.icon} className="h-3 w-3" />
                          {cat.title}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700">
                      {a.title}
                    </h3>
                    {a.summary && <p className="mt-1 text-xs text-gray-500">{a.summary}</p>}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HelpPage() {
  const { articleId } = useParams();
  return articleId ? <ArticleView articleId={articleId} /> : <HelpHome />;
}
