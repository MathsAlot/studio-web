'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowDown, ArrowUp, ListOrdered } from 'lucide-react';

import { ErrorAlert } from '@/components/error-alert';
import { Button } from '@/components/ui/button';
import type { TrickSummary } from '@/lib/api-client';
import { reorderTricks } from '@/lib/client/studio';
import { applyOrderById } from '@/lib/studio/order';

interface TrickPositionControlProps {
  worldId: string;
  worldName: string;
  tricks: TrickSummary[];
  activeTrickId: string;
  canReorder: boolean;
}

/**
 * Compact position control on the Trick page (D-035). Full ordering lives on
 * the World page; here the user can nudge this Trick one slot and jump to the
 * World for the complete list. It reuses the same reorder endpoint and only
 * applies the server-confirmed order.
 */
export function TrickPositionControl({
  worldId,
  worldName,
  tricks,
  activeTrickId,
  canReorder,
}: TrickPositionControlProps) {
  const [ordered, setOrdered] = useState<TrickSummary[]>(tricks);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const index = ordered.findIndex((trick) => trick.id === activeTrickId);
  const position = index >= 0 ? index + 1 : null;

  async function move(delta: number) {
    const target = index + delta;
    if (target < 0 || target >= ordered.length) {
      return;
    }
    const next = [...ordered];
    const [moved] = next.splice(index, 1);
    if (!moved) {
      return;
    }
    next.splice(target, 0, moved);

    setPending(true);
    setError(null);
    const result = await reorderTricks(
      worldId,
      next.map((trick) => trick.id),
    );
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOrdered(applyOrderById(ordered, result.data.orderedIds));
  }

  return (
    <div className="space-y-2" data-slot="trick-position-control">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-body-sm text-muted-foreground">
          {position === null ? 'Not in this World’s list' : `Position ${position} in ${worldName}`}
        </span>
        {canReorder && index >= 0 ? (
          <span className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => void move(-1)}
              disabled={pending || index === 0}
              aria-label="Move this Trick up"
              title="Move up"
            >
              <ArrowUp aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => void move(1)}
              disabled={pending || index === ordered.length - 1}
              aria-label="Move this Trick down"
              title="Move down"
            >
              <ArrowDown aria-hidden="true" />
            </Button>
          </span>
        ) : null}
        <Button asChild variant="link" size="sm">
          <Link href={`/worlds/${worldId}`}>
            <ListOrdered aria-hidden="true" />
            Reorder in {worldName}
          </Link>
        </Button>
      </div>
      {error ? <ErrorAlert>{error}</ErrorAlert> : null}
    </div>
  );
}
