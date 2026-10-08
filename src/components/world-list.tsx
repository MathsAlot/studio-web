'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, BookOpen, Plus, Settings2 } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { ErrorAlert } from '@/components/error-alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type { WorldSummary } from '@/lib/api-client';
import { createWorld, reorderWorlds } from '@/lib/client/studio';
import { asText, toNullableText } from '@/lib/studio/fields';
import { applyOrderById } from '@/lib/studio/order';
import type { StudioCapabilities } from '@/lib/studio/permissions';

interface WorldListProps {
  initialWorlds: WorldSummary[];
  capabilities: StudioCapabilities;
}

/**
 * Worlds index (D-035): a scannable table of Worlds with server-computed
 * rollup and completion, row actions, and reorder controls. Create lives in a
 * dialog rather than an always-open form. The reorder endpoint and capability
 * checks are unchanged.
 */
export function WorldList({ initialWorlds, capabilities }: WorldListProps) {
  const [worlds, setWorlds] = useState<WorldSummary[]>(initialWorlds);
  const [pendingWorldId, setPendingWorldId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length === 0) {
      setNameError('Enter a World name.');
      nameRef.current?.focus();
      return;
    }
    setNameError(undefined);
    setCreating(true);
    setError(null);
    setStatus(null);

    const trimmedDescription = toNullableText(description);
    const result = await createWorld({
      name: name.trim(),
      ...(trimmedDescription === null ? {} : { description: trimmedDescription }),
    });
    setCreating(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    setWorlds((current) => [...current, result.data]);
    setName('');
    setDescription('');
    setOpen(false);
    setStatus(`Created “${result.data.name}”.`);
  }

  async function moveWorld(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= worlds.length) {
      return;
    }
    const next = [...worlds];
    const [moved] = next.splice(index, 1);
    if (!moved) {
      return;
    }
    next.splice(target, 0, moved);

    setPendingWorldId(moved.id);
    setError(null);
    const result = await reorderWorlds(next.map((world) => world.id));
    setPendingWorldId(null);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    setWorlds(applyOrderById(worlds, result.data.orderedIds));
    setStatus('Reordered Worlds.');
  }

  return (
    <div className="space-y-6">
      {error ? <ErrorAlert>{error}</ErrorAlert> : null}
      {status ? (
        <p role="status" aria-live="polite" className="text-body-sm text-success-foreground">
          {status}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-sm text-muted-foreground">
          Completion and readiness are computed by the server; this view never infers them.
        </p>
        {capabilities.canWriteStructure ? (
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) {
                setNameError(undefined);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button type="button">
                <Plus aria-hidden="true" />
                New World
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New World</DialogTitle>
                <DialogDescription>
                  Worlds group Tricks into a deterministic curriculum sequence.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} aria-label="New World" autoComplete="off" noValidate>
                <div className="space-y-4">
                  <FormField
                    id="world-name"
                    label="Name"
                    required
                    error={nameError}
                    hint="Shown across the Studio and in Curricula."
                  >
                    {(control) => (
                      <Input
                        {...control}
                        ref={nameRef}
                        value={name}
                        placeholder="e.g. Addition"
                        onChange={(event) => setName(event.target.value)}
                        maxLength={200}
                      />
                    )}
                  </FormField>
                  <FormField
                    id="world-description"
                    label="Description"
                    hint="Optional. What this World covers."
                  >
                    {(control) => (
                      <Textarea
                        {...control}
                        value={description}
                        placeholder="What this World covers."
                        onChange={(event) => setDescription(event.target.value)}
                        maxLength={2000}
                        rows={2}
                      />
                    )}
                  </FormField>
                </div>
                <DialogFooter className="mt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating} aria-busy={creating}>
                    <Plus aria-hidden="true" />
                    {creating ? 'Creating…' : 'Create World'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : (
          <p role="status" className="text-body-sm text-muted-foreground">
            Read-only: you do not hold <code className="font-mono">world.structure.write</code>.
          </p>
        )}
      </div>

      {worlds.length === 0 ? (
        <EmptyState
          title="No Worlds yet."
          description="Create a World to start grouping Tricks into a curriculum sequence."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <Table>
            <TableCaption className="sr-only">Worlds</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Position</TableHead>
                <TableHead>World</TableHead>
                <TableHead className="w-20 text-right">Tricks</TableHead>
                <TableHead className="w-24 text-right">Complete</TableHead>
                <TableHead className="w-20 text-right">Ready</TableHead>
                <TableHead className="w-24 text-right">Complete %</TableHead>
                <TableHead className="w-64 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {worlds.map((world, index) => (
                <TableRow key={world.id}>
                  <TableCell className="font-mono text-muted-foreground">{world.order}</TableCell>
                  <TableCell className="whitespace-normal">
                    <Link
                      href={`/worlds/${world.id}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {world.name}
                    </Link>
                    {asText(world.description).length > 0 ? (
                      <p className="max-w-xl text-body-sm text-muted-foreground">
                        {asText(world.description)}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right font-mono">{world.rollup.trickCount}</TableCell>
                  <TableCell className="text-right font-mono">
                    {world.rollup.completeTrickCount}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {world.rollup.readyTrickCount}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {world.rollup.completionPercent}%
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/worlds/${world.id}`}>
                          <Settings2 aria-hidden="true" />
                          Open
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/worlds/${world.id}/curriculums`}>
                          <BookOpen aria-hidden="true" />
                          Curricula
                        </Link>
                      </Button>
                      {capabilities.canReorderWorlds ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() => void moveWorld(index, -1)}
                            disabled={pendingWorldId !== null || index === 0}
                            aria-label={`Move ${world.name} up`}
                            title="Move up"
                          >
                            <ArrowUp aria-hidden="true" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() => void moveWorld(index, 1)}
                            disabled={pendingWorldId !== null || index === worlds.length - 1}
                            aria-label={`Move ${world.name} down`}
                            title="Move down"
                          >
                            <ArrowDown aria-hidden="true" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
