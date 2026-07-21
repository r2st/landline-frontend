import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, X, BookOpen, ArrowRight } from 'lucide-react';
import Markdown from './Markdown';
import { getArticle, articlesInCategory } from '../lib/helpContent';
import { cn } from '../lib/utils';

// Contextual help. Drop a <HelpIcon articleId="dialtone-console" /> into a page
// header and it renders a "?" button that opens a right-hand slide-over with
// that article's content — help without leaving the page.
//
// The panel also lists sibling articles from the same category and links to the
// full Help Center, so a user who opened help for one screen can wander to
// related topics.
export default function HelpIcon({ articleId, label = 'Help', className = '' }) {
  const [open, setOpen] = useState(false);
  const article = getArticle(articleId);

  // Close on Escape and lock body scroll while the panel is open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Nothing to show if the id is wrong — render nothing rather than a dead button.
  if (!article) return null;

  const related = articlesInCategory(article.category).filter((a) => a.id !== article.id);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
          className
        )}
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex justify-end" role="presentation">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={`Help: ${article.title}`}
            className="relative flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
              <div className="flex min-w-0 items-center gap-2">
                <BookOpen className="h-4 w-4 flex-shrink-0 text-indigo-600" />
                <span className="truncate text-sm font-semibold text-gray-900">Help</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close help"
                className="-mr-1 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <Markdown content={article.body} />

              {article.route && (
                <Link
                  to={article.route}
                  onClick={() => setOpen(false)}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Go to this feature <ArrowRight className="h-4 w-4" />
                </Link>
              )}

              {related.length > 0 && (
                <div className="mt-6 border-t border-gray-100 pt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Related
                  </p>
                  <ul className="space-y-1">
                    {related.map((a) => (
                      <li key={a.id}>
                        <Link
                          to={`/help/${a.id}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                        >
                          <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
                          <span className="truncate">{a.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-5 py-3">
              <Link
                to="/help"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                <BookOpen className="h-4 w-4" /> Open the Help Center
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
