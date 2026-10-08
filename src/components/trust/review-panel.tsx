'use client';

import { BadgeCheck, RotateCcw, Sparkles, TriangleAlert } from 'lucide-react';

import { DraftSourceBadge, ReviewBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import type { DraftSource, ReviewStatus } from '@/lib/api-client';

interface ReviewPanelProps {
  /** The item the review controls apply to, e.g. 'Trick' or 'Formative variant'. */
  label: string;
  draftSource: DraftSource;
  reviewStatus: ReviewStatus;
  canReview: boolean;
  busy: boolean;
  onSetReview: (status: ReviewStatus) => void;
}

/**
 * Human review + AI-draft gating (D-042). AI-drafted content is blocked from
 * publication until a permitted human approves it; the buttons only express a
 * request and the API records the decision.
 */
export function ReviewPanel({
  label,
  draftSource,
  reviewStatus,
  canReview,
  busy,
  onSetReview,
}: ReviewPanelProps) {
  const aiPending = draftSource === 'AI' && reviewStatus !== 'APPROVED';

  return (
    <div
      data-slot="review-panel"
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2"
    >
      <div className="min-w-0 space-y-1">
        <p className="text-body font-medium text-foreground">{label}</p>
        <div className="flex flex-wrap items-center gap-2">
          <DraftSourceBadge source={draftSource} />
          <ReviewBadge status={reviewStatus} />
        </div>
        {aiPending ? (
          <p
            role="status"
            className="flex items-center gap-1.5 text-body-sm text-warning-foreground"
          >
            <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" />
            AI-drafted content stays blocked from publication until a human approves it.
          </p>
        ) : null}
      </div>

      {canReview ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy || reviewStatus === 'APPROVED'}
            onClick={() => onSetReview('APPROVED')}
            data-action="approve"
          >
            <BadgeCheck aria-hidden="true" />
            Approve
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || reviewStatus === 'NEEDS_REVIEW'}
            onClick={() => onSetReview('NEEDS_REVIEW')}
            data-action="needs-review"
          >
            {draftSource === 'AI' ? (
              <Sparkles aria-hidden="true" />
            ) : (
              <RotateCcw aria-hidden="true" />
            )}
            Needs review
          </Button>
        </div>
      ) : (
        <p role="status" className="text-body-sm text-muted-foreground">
          Review is view-only — you do not hold{' '}
          <code className="font-mono">trick.vetting.write</code>.
        </p>
      )}
    </div>
  );
}
