'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface FormActionsProps {
  children: ReactNode;
  /** Pin the bar to the bottom of the viewport on long forms. */
  sticky?: boolean;
  className?: string;
}

/**
 * Consistent action row for every authoring form: Save, an optional clear
 * action, and the draft state readout share one placement and rhythm.
 */
export function FormActions({ children, sticky = false, className }: FormActionsProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3',
        sticky && 'sticky bottom-0 z-10 border-t border-border bg-surface/95 py-3 backdrop-blur',
        className,
      )}
    >
      {children}
    </div>
  );
}
