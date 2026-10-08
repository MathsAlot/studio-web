import { Globe, MapPin } from 'lucide-react';

import { StatusBadge } from '@/components/status-badge';
import type { FamilyType } from '@/lib/api-client';
import { FAMILY_TYPE_LABELS } from '@/lib/studio/fields';

/**
 * Family type pill: World-bound (pinned to one World) vs Global (triggered by a
 * finished World). Icon + label, never colour alone.
 */
export function FamilyTypeBadge({ type }: { type: FamilyType }) {
  const map: Record<FamilyType, { icon: typeof MapPin; tone: 'info' | 'neutral' }> = {
    WORLD_BOUND: { icon: MapPin, tone: 'info' },
    GLOBAL: { icon: Globe, tone: 'neutral' },
  };
  const { icon, tone } = map[type];
  return (
    <StatusBadge tone={tone} icon={icon}>
      {FAMILY_TYPE_LABELS[type]}
    </StatusBadge>
  );
}
