'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { CircleCheck, TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { AgeTier, TrickDetail } from '@/lib/api-client';
import { AGE_TIERS, TIER_LABELS } from '@/lib/studio/fields';
import { VariantEditor } from './variant-editor';

interface AgeTierTabsProps {
  trick: TrickDetail;
  canWriteContent: boolean;
}

/**
 * Accessible age-tier tabs (roving tabindex + arrow keys) for the three variant
 * editors. All panels stay mounted so every tier's local draft is preserved and
 * registered with the shared action bar, while inactive panels are hidden.
 */
export function AgeTierTabs({ trick, canWriteContent }: AgeTierTabsProps) {
  const [selected, setSelected] = useState<AgeTier>(
    trick.completeness.missingTiers[0] ?? 'FORMATIVE',
  );
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number;
    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % AGE_TIERS.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + AGE_TIERS.length) % AGE_TIERS.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = AGE_TIERS.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    const nextTier = AGE_TIERS[nextIndex];
    if (!nextTier) {
      return;
    }
    setSelected(nextTier);
    tabRefs.current[nextTier]?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Age tiers"
        className="flex flex-wrap gap-1 border-b border-border"
      >
        {AGE_TIERS.map((tier, index) => {
          const isSelected = tier === selected;
          const missing = trick.completeness.missingTiers.includes(tier);
          return (
            <button
              key={tier}
              ref={(element) => {
                tabRefs.current[tier] = element;
              }}
              type="button"
              role="tab"
              id={`age-tier-tab-${tier}`}
              aria-selected={isSelected}
              aria-controls={`age-tier-panel-${tier}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setSelected(tier)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                'flex items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-2 text-sm transition-colors',
                isSelected
                  ? 'border-border bg-surface font-semibold text-foreground'
                  : 'border-transparent text-muted-foreground hover:bg-surface-muted hover:text-foreground',
              )}
            >
              {TIER_LABELS[tier]}
              {missing ? (
                <span className="flex items-center gap-1 text-xs font-normal text-warning-foreground">
                  <TriangleAlert aria-hidden="true" className="size-3.5" />
                  (missing)
                </span>
              ) : (
                <CircleCheck aria-hidden="true" className="size-3.5 text-success" />
              )}
            </button>
          );
        })}
      </div>

      {AGE_TIERS.map((tier) => (
        <div
          key={tier}
          role="tabpanel"
          id={`age-tier-panel-${tier}`}
          aria-labelledby={`age-tier-tab-${tier}`}
          hidden={tier !== selected}
          tabIndex={0}
          className="pt-4"
        >
          <VariantEditor
            trick={trick}
            ageTier={tier}
            canWriteContent={canWriteContent}
            onReveal={() => setSelected(tier)}
          />
        </div>
      ))}
    </div>
  );
}
