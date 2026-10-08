import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Archive,
  BadgeCheck,
  CircleCheck,
  CircleDashed,
  Clock,
  FileText,
  Sparkles,
  TriangleAlert,
  UserRound,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ContentStatus, TrickDetail } from '@/lib/api-client';
import {
  CONTENT_STATUS_LABELS,
  DRAFT_SOURCE_LABELS,
  REVIEW_LABELS,
  VETTING_LABELS,
} from '@/lib/studio/fields';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'border-transparent bg-success-subtle text-success-foreground',
  warning: 'border-transparent bg-warning-subtle text-warning-foreground',
  danger: 'border-transparent bg-danger-subtle text-danger-foreground',
  info: 'border-transparent bg-info-subtle text-info-foreground',
  neutral: 'border-border bg-surface-muted text-muted-foreground',
};

interface StatusBadgeProps {
  tone: StatusTone;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}

/**
 * Status pill. Status is always icon + label + tint, never colour alone, per
 * DESIGN.md.
 */
export function StatusBadge({ tone, icon: Icon, children, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn('gap-1', TONE_CLASSES[tone], className)}>
      <Icon aria-hidden="true" />
      {children}
    </Badge>
  );
}

export function VettingBadge({ status }: { status: TrickDetail['vettingStatus'] }) {
  const map: Record<TrickDetail['vettingStatus'], { tone: StatusTone; icon: LucideIcon }> = {
    DRAFT: { tone: 'neutral', icon: FileText },
    UNDER_REVIEW: { tone: 'warning', icon: Clock },
    VERIFIED: { tone: 'success', icon: BadgeCheck },
    NEEDS_REVISION: { tone: 'danger', icon: TriangleAlert },
  };
  const { tone, icon } = map[status];
  return (
    <StatusBadge tone={tone} icon={icon}>
      {VETTING_LABELS[status]}
    </StatusBadge>
  );
}

export function ReviewBadge({ status }: { status: TrickDetail['reviewStatus'] }) {
  const map: Record<TrickDetail['reviewStatus'], { tone: StatusTone; icon: LucideIcon }> = {
    NEEDS_REVIEW: { tone: 'warning', icon: Clock },
    APPROVED: { tone: 'success', icon: CircleCheck },
  };
  const { tone, icon } = map[status];
  return (
    <StatusBadge tone={tone} icon={icon}>
      {REVIEW_LABELS[status]}
    </StatusBadge>
  );
}

export function DraftSourceBadge({ source }: { source: TrickDetail['draftSource'] }) {
  const map: Record<TrickDetail['draftSource'], { tone: StatusTone; icon: LucideIcon }> = {
    HUMAN: { tone: 'neutral', icon: UserRound },
    AI: { tone: 'info', icon: Sparkles },
  };
  const { tone, icon } = map[source];
  return (
    <StatusBadge tone={tone} icon={icon}>
      {DRAFT_SOURCE_LABELS[source]}
    </StatusBadge>
  );
}

export function ContentStatusBadge({ status }: { status: ContentStatus }) {
  const map: Record<ContentStatus, { tone: StatusTone; icon: LucideIcon }> = {
    DRAFT: { tone: 'neutral', icon: CircleDashed },
    ACTIVE: { tone: 'success', icon: CircleCheck },
    ARCHIVED: { tone: 'neutral', icon: Archive },
  };
  const { tone, icon } = map[status];
  return (
    <StatusBadge tone={tone} icon={icon}>
      {CONTENT_STATUS_LABELS[status]}
    </StatusBadge>
  );
}
