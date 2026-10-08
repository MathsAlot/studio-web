'use client';

import { BadgeCheck, CircleCheck, CircleX, Info, Upload } from 'lucide-react';

import { ErrorAlert } from '@/components/error-alert';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/studio/nitty-gritty';
import type { ReadinessCheck } from '@/lib/studio/trust';

interface PublishReadinessProps {
  entityLabel: string;
  checks: ReadinessCheck[];
  publishedAt: string | null;
  canPublish: boolean;
  busy: boolean;
  error: string | null;
  onPublish: () => void;
  /** Facts have no unpublish endpoint; omit to hide the control. */
  onUnpublish?: () => void;
  className?: string;
}

/**
 * Live publication readiness (D-043). The checklist explains exactly what the
 * server-reported state blocks; the Publish button calls the publish endpoint
 * and its result — including a 409 blocker message — is surfaced verbatim.
 */
export function PublishReadiness({
  entityLabel,
  checks,
  publishedAt,
  canPublish,
  busy,
  error,
  onPublish,
  onUnpublish,
  className,
}: PublishReadinessProps) {
  const published = publishedAt ?? '';
  const isPublished = published.length > 0;
  const ready = checks.every((check) => check.passed);
  const listId = `publish-blockers-${entityLabel.toLowerCase()}`;

  return (
    <aside
      aria-labelledby="publish-readiness-heading"
      data-slot="publish-readiness"
      className={`rounded-lg border border-border bg-surface p-4 ${className ?? ''}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="publish-readiness-heading" className="text-heading-2 font-semibold text-foreground">
          Ready to publish?
        </h2>
        {isPublished ? (
          <StatusBadge tone="success" icon={BadgeCheck}>
            Published
          </StatusBadge>
        ) : null}
      </div>

      <p
        className={`mt-1 flex items-center gap-2 text-body-sm ${
          ready || isPublished ? 'text-success-foreground' : 'text-warning-foreground'
        }`}
      >
        {ready || isPublished ? (
          <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
        ) : (
          <Info aria-hidden="true" className="size-4 shrink-0" />
        )}
        {isPublished
          ? `Published ${formatDateTime(published)}.`
          : ready
            ? 'Every publication requirement is met.'
            : 'Not ready to publish yet.'}
      </p>

      <ul id={listId} className="mt-4 space-y-3">
        {checks.map((check) => (
          <li key={check.key} className="flex gap-2">
            {check.passed ? (
              <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
            ) : (
              <CircleX aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
            )}
            <div>
              <p className="text-body font-medium text-foreground">{check.label}</p>
              <p className="text-body-sm text-muted-foreground">{check.reason}</p>
            </div>
          </li>
        ))}
      </ul>

      {error ? (
        <ErrorAlert title={`Could not publish this ${entityLabel.toLowerCase()}`} className="mt-4">
          {error}
        </ErrorAlert>
      ) : null}

      {!canPublish ? (
        <p role="status" className="mt-4 text-body-sm text-muted-foreground">
          Publishing is view-only — you do not hold the matching vetting permission.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
          {isPublished ? (
            onUnpublish ? (
              <Button
                type="button"
                variant="outline"
                onClick={onUnpublish}
                disabled={busy}
                aria-busy={busy}
                data-action="unpublish"
              >
                Unpublish
              </Button>
            ) : null
          ) : (
            <Button
              type="button"
              onClick={onPublish}
              disabled={busy || !ready}
              aria-busy={busy}
              aria-describedby={listId}
              data-action="publish"
            >
              <Upload aria-hidden="true" />
              Publish
            </Button>
          )}
        </div>
      )}
    </aside>
  );
}
