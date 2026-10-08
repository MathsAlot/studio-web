'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Activity, ChevronLeft, ChevronRight, Loader2, UserRound } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { ErrorAlert } from '@/components/error-alert';
import { Button } from '@/components/ui/button';
import type { ActivityItem, ActivityPage } from '@/lib/api-client';
import { getActivity } from '@/lib/client/admin';
import { formatDateTime } from '@/lib/studio/nitty-gritty';

const DEFAULT_PAGE_SIZE = 25;

interface FeedState {
  status: 'loading' | 'ready' | 'error';
  page?: ActivityPage;
  error?: string;
}

/** Read a deep-linked offset, falling back to the first page. */
function parseOffset(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

/** `trick.vetting.updated` → `Trick vetting updated` for scanning, raw value kept in title. */
function humanizeAction(action: string): string {
  const words = action.split('.').filter(Boolean);
  if (words.length === 0) {
    return action;
  }
  return words
    .map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const actorName = item.actor?.displayName ?? 'System';
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b border-border px-4 py-3 last:border-b-0">
      <div className="min-w-0 space-y-0.5">
        <p className="text-body text-foreground" title={item.action}>
          <span className="font-medium">{humanizeAction(item.action)}</span>
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <UserRound aria-hidden="true" className="size-3.5" />
            {actorName}
          </span>
          {item.targetType ? (
            <span>
              on <span className="font-medium text-foreground">{item.targetType}</span>
              {item.targetId ? (
                <>
                  {' '}
                  <code className="font-mono text-xs" translate="no">
                    {item.targetId}
                  </code>
                </>
              ) : null}
            </span>
          ) : null}
        </p>
      </div>
      <time dateTime={item.occurredAt} className="font-mono text-xs text-muted-foreground">
        {formatDateTime(item.occurredAt)}
      </time>
    </li>
  );
}

interface ActivityFeedProps {
  pageSize?: number;
}

/**
 * Newest-first activity list (D-046). The API returns a bounded, paginated
 * page; this view renders actor, action, target, and time and drives paging
 * through `limit`/`offset` without over-fetching.
 */
export function ActivityFeed({ pageSize = DEFAULT_PAGE_SIZE }: ActivityFeedProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [offset, setOffset] = useState(() => parseOffset(searchParams.get('offset')));
  const [state, setState] = useState<FeedState>({ status: 'loading' });

  /** Keep the current page deep-linkable without a full navigation. */
  const goTo = useCallback(
    (nextOffset: number) => {
      setOffset(nextOffset);
      const params = new URLSearchParams(searchParams.toString());
      if (nextOffset === 0) {
        params.delete('offset');
      } else {
        params.set('offset', String(nextOffset));
      }
      const query = params.toString();
      router.replace(query.length > 0 ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const load = useCallback(
    async (nextOffset: number) => {
      setState({ status: 'loading' });
      const result = await getActivity(pageSize, nextOffset);
      if (!result.ok) {
        setState({ status: 'error', error: result.message });
        return;
      }
      setState({ status: 'ready', page: result.data });
    },
    [pageSize],
  );

  useEffect(() => {
    void load(offset);
  }, [load, offset]);

  if (state.status === 'loading') {
    return (
      <p
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 text-body text-muted-foreground"
      >
        <Loader2 aria-hidden="true" className="animate-spin" />
        Loading recent activity…
      </p>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="space-y-3">
        <ErrorAlert title="Could not load activity">
          {state.error ?? 'Please try again.'}
        </ErrorAlert>
        <Button type="button" variant="outline" onClick={() => void load(offset)}>
          Retry
        </Button>
      </div>
    );
  }

  const page = state.page;
  if (!page) {
    return null;
  }

  if (page.items.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No recent activity."
        description={
          offset > 0
            ? 'No more activity on this page. Go back to the first page.'
            : 'Content mutations will appear here as the team works.'
        }
      />
    );
  }

  const firstShown = page.offset + 1;
  const lastShown = page.offset + page.items.length;

  return (
    <div className="space-y-3">
      <ul
        aria-label="Recent activity"
        className="list-none overflow-hidden rounded-lg border border-border bg-surface"
      >
        {page.items.map((item) => (
          <ActivityRow key={item.id} item={item} />
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" aria-live="polite" className="text-body-sm text-muted-foreground">
          Showing <span className="font-mono">{firstShown}</span>–
          <span className="font-mono">{lastShown}</span> of{' '}
          <span className="font-mono">{page.total}</span>
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => goTo(Math.max(offset - pageSize, 0))}
            disabled={offset === 0}
            data-action="activity-prev"
          >
            <ChevronLeft aria-hidden="true" />
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => goTo(offset + pageSize)}
            disabled={!page.hasMore}
            data-action="activity-next"
          >
            Next
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
