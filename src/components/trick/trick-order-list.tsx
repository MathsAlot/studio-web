'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

import { CompletenessIndicator } from '@/components/completeness-indicator';
import { EmptyState } from '@/components/empty-state';
import { ErrorAlert } from '@/components/error-alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TrickSummary } from '@/lib/api-client';
import { reorderTricks } from '@/lib/client/studio';
import { KIND_LABELS } from '@/lib/studio/fields';
import { applyOrderById } from '@/lib/studio/order';

interface TrickOrderListProps {
  worldId: string;
  initialTricks: TrickSummary[];
  canReorder: boolean;
  activeTrickId?: string;
  heading?: string;
}

/**
 * Ordered Trick list with explicit move controls (D-018). The visible order
 * only changes after the API confirms the new ordered id array, so a rejected
 * reorder is never shown as applied.
 */
export function TrickOrderList({
  worldId,
  initialTricks,
  canReorder,
  activeTrickId,
  heading,
}: TrickOrderListProps) {
  const [tricks, setTricks] = useState<TrickSummary[]>(initialTricks);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= tricks.length) {
      return;
    }
    const next = [...tricks];
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
    setTricks(applyOrderById(tricks, result.data.orderedIds));
  }

  if (tricks.length === 0) {
    return <EmptyState title="No Tricks yet." description="Add a Trick to begin ordering." />;
  }

  return (
    <div className="space-y-3">
      {error ? <ErrorAlert>{error}</ErrorAlert> : null}
      <div className="overflow-hidden rounded-md border border-border bg-surface">
        <Table>
          <TableCaption className="sr-only">{heading ?? 'Tricks in order'}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Position</TableHead>
              <TableHead>Trick</TableHead>
              <TableHead className="w-28">Kind</TableHead>
              <TableHead>Completeness</TableHead>
              {canReorder ? <TableHead className="w-28 text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tricks.map((trick, index) => {
              const active = trick.id === activeTrickId;
              return (
                <TableRow
                  key={trick.id}
                  aria-current={active ? 'true' : undefined}
                  className={active ? 'bg-primary-subtle hover:bg-primary-subtle' : undefined}
                >
                  <TableCell className="font-mono text-muted-foreground">
                    {trick.position}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <Link
                      href={`/tricks/${trick.id}`}
                      className="text-body font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {trick.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-border bg-surface-muted text-muted-foreground"
                    >
                      {KIND_LABELS[trick.kind]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <CompletenessIndicator completeness={trick.completeness} />
                  </TableCell>
                  {canReorder ? (
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => void move(index, -1)}
                          disabled={pending || index === 0}
                          aria-label={`Move ${trick.name} up`}
                          title="Move up"
                        >
                          <ArrowUp aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => void move(index, 1)}
                          disabled={pending || index === tricks.length - 1}
                          aria-label={`Move ${trick.name} down`}
                          title="Move down"
                        >
                          <ArrowDown aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
