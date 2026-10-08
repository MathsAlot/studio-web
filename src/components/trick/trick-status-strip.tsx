'use client';

import type { ReactNode } from 'react';

import { CompletenessIndicator } from '@/components/completeness-indicator';
import { DraftSourceBadge, ReviewBadge, VettingBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { TrickDetail } from '@/lib/api-client';
import { KIND_LABELS } from '@/lib/studio/fields';

interface StatusItemProps {
  label: string;
  help: string;
  children: ReactNode;
}

function StatusItem({ label, help, children }: StatusItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="inline-flex items-center gap-2 rounded-md px-2 py-1 hover:bg-surface-muted"
        >
          <span className="label-eyebrow text-muted-foreground">{label}</span>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{help}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Compact, scannable status strip for the Trick header. Every item carries a
 * tooltip explaining what the state means; status is icon + label + tint and
 * never colour alone.
 */
export function TrickStatusStrip({ trick }: { trick: TrickDetail }) {
  return (
    <div
      data-slot="trick-status-strip"
      role="group"
      className="flex flex-wrap items-center gap-x-1 gap-y-2 rounded-lg border border-border bg-surface px-2 py-1.5"
      aria-label="Trick status"
    >
      <StatusItem
        label="Vetting"
        help="Trick vetting state. Publication requires Verified (validity, domain, and edge cases)."
      >
        <VettingBadge status={trick.vettingStatus} />
      </StatusItem>
      <StatusItem label="Review" help="Human review state. Publication requires an Approved Trick.">
        <ReviewBadge status={trick.reviewStatus} />
      </StatusItem>
      <StatusItem
        label="Draft"
        help="Whether the content is human-authored or AI-drafted. AI drafts stay held from publication until a human approves them."
      >
        <DraftSourceBadge source={trick.draftSource} />
      </StatusItem>
      <StatusItem
        label="Tiers"
        help="Age-tier content coverage, computed by the server from the saved variants."
      >
        <CompletenessIndicator completeness={trick.completeness} />
      </StatusItem>
      <StatusItem label="Kind" help="Standard or Capstone Trick.">
        <Badge variant="outline" className="border-border bg-surface-muted text-muted-foreground">
          {KIND_LABELS[trick.kind]}
        </Badge>
      </StatusItem>
    </div>
  );
}
