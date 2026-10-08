import { CircleCheck, TriangleAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { Completeness } from '@/lib/api-client';
import { TIER_LABELS } from '@/lib/studio/fields';

/**
 * Completeness badge (FR-17). Reads only server-reported completeness: it
 * never infers readiness. Status is conveyed with text and an icon, not colour
 * alone.
 */
export function CompletenessIndicator({ completeness }: { completeness: Completeness }) {
  if (completeness.isComplete) {
    const ready = completeness.isReady;
    return (
      <Badge
        variant="outline"
        className="gap-1 border-transparent bg-success-subtle text-success-foreground"
      >
        <CircleCheck aria-hidden="true" />
        {ready ? 'Complete · Ready' : 'Complete · Not ready to publish'}
      </Badge>
    );
  }

  const missing = completeness.missingTiers.map((tier) => TIER_LABELS[tier]).join(', ');
  return (
    <Badge
      variant="outline"
      className="gap-1 border-transparent bg-warning-subtle text-warning-foreground"
    >
      <TriangleAlert aria-hidden="true" />
      {completeness.variantCount}/{completeness.totalTiers} tiers · Missing: {missing || 'unknown'}
    </Badge>
  );
}
