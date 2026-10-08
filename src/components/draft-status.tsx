import type { LucideIcon } from 'lucide-react';
import { CircleCheck, CircleDashed, CircleX, Loader2, RotateCcw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DraftStatus } from '@/lib/client/use-draft';

export interface DraftStatusProps {
  status: DraftStatus;
  error: string | null;
  isDirty: boolean;
  restored: boolean;
}

interface Variant {
  tone: string;
  icon: LucideIcon;
  message: string;
}

/**
 * Draft state readout. Errors are announced as alerts and explicitly say input
 * is preserved; success/dirty states are polite live regions. Never colour-only.
 */
export function DraftStatusView({ status, error, isDirty, restored }: DraftStatusProps) {
  let variant: Variant | null = null;

  if (status === 'error') {
    variant = {
      tone: 'border-transparent bg-danger-subtle text-danger-foreground',
      icon: CircleX,
      message: `Could not save${error ? `: ${error}` : ''}. Retrying automatically; your input is preserved.`,
    };
  } else if (status === 'saving') {
    variant = {
      tone: 'border-border bg-surface-muted text-muted-foreground',
      icon: Loader2,
      message: 'Saving…',
    };
  } else if (status === 'saved') {
    variant = {
      tone: 'border-transparent bg-success-subtle text-success-foreground',
      icon: CircleCheck,
      message: 'All changes saved.',
    };
  } else if (restored && isDirty) {
    variant = {
      tone: 'border-transparent bg-info-subtle text-info-foreground',
      icon: RotateCcw,
      message: 'Restored an unsaved draft from this browser.',
    };
  } else if (isDirty) {
    variant = {
      tone: 'border-transparent bg-warning-subtle text-warning-foreground',
      icon: CircleDashed,
      message: 'Unsaved changes.',
    };
  }

  if (!variant) {
    return null;
  }

  const Icon = variant.icon;
  const isAlert = status === 'error';

  return (
    <Badge
      variant="outline"
      role={isAlert ? 'alert' : 'status'}
      aria-live={isAlert ? undefined : 'polite'}
      className={cn('gap-1', variant.tone)}
    >
      <Icon aria-hidden="true" className={status === 'saving' ? 'animate-spin' : undefined} />
      {variant.message}
    </Badge>
  );
}
