import { cn } from '../lib/utils';

/**
 * A single shimmering placeholder block. Compose these to mirror the shape of
 * content that's loading, so the layout doesn't jump when data lands.
 */
export default function Skeleton({ className }) {
  return (
    <div
      className={cn('animate-pulse rounded bg-gray-200/80', className)}
      aria-hidden="true"
    />
  );
}

// One placeholder thread row: avatar + two text lines + a meta column.
export function ThreadRowSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3.5">
      <Skeleton className="h-9 w-9 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-3 w-10" />
    </div>
  );
}

/**
 * Loading state for the inbox list. `rows` controls how many placeholder rows
 * render. Exposed under a testid so it can be asserted on.
 */
export function InboxSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-2" data-testid="inbox-skeleton" aria-busy="true" aria-label="Loading inbox">
      {Array.from({ length: rows }).map((_, i) => (
        <ThreadRowSkeleton key={i} />
      ))}
    </div>
  );
}

// Loading state for the detail pane: header line + a few message bubbles.
export function ThreadDetailSkeleton() {
  return (
    <div className="space-y-4 p-5" data-testid="thread-detail-skeleton" aria-busy="true">
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-16 w-3/4 rounded-2xl" />
      <div className="flex justify-end">
        <Skeleton className="h-16 w-3/4 rounded-2xl" />
      </div>
      <Skeleton className="h-16 w-2/3 rounded-2xl" />
    </div>
  );
}
