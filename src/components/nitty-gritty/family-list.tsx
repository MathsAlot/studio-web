'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Plus, Settings2 } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { ErrorAlert } from '@/components/error-alert';
import { FamilyTypeBadge } from '@/components/nitty-gritty/family-type-badge';
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
import { NativeSelect } from '@/components/ui/native-select';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { FamilySummary, WorldSummary } from '@/lib/api-client';
import { createFamily } from '@/lib/client/studio';
import { FAMILY_TYPES, FAMILY_TYPE_LABELS, isFamilyType } from '@/lib/studio/fields';
import {
  blankFamilyForm,
  createFamilyInputFromForm,
  validateFamilyForm,
  type FamilyForm,
} from '@/lib/studio/nitty-gritty';

interface FamilyListProps {
  initialFamilies: FamilySummary[];
  worlds: WorldSummary[];
  canManageFamily: boolean;
}

function worldLabel(
  family: FamilySummary,
  worldNames: Map<string, string>,
): { kind: string; name: string } {
  if (family.type === 'WORLD_BOUND') {
    const id = family.boundWorldId;
    return { kind: 'Bound', name: id ? (worldNames.get(id) ?? id) : '—' };
  }
  const id = family.triggerWorldId;
  return { kind: 'Trigger', name: id ? (worldNames.get(id) ?? id) : '—' };
}

/**
 * Nitty Gritty Families index (FR-15): scannable table of Families with their
 * type, Fact count, and World binding, plus a create dialog. Reads are open to
 * every signed-in user; creation is gated on `family.manage`.
 */
export function FamilyList({ initialFamilies, worlds, canManageFamily }: FamilyListProps) {
  const [families, setFamilies] = useState<FamilySummary[]>(initialFamilies);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FamilyForm>(() => blankFamilyForm());
  const [errors, setErrors] = useState<ReturnType<typeof validateFamilyForm>>({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const worldNames = new Map(worlds.map((world) => [world.id, world.name]));

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateFamilyForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const result = await createFamily(createFamilyInputFromForm(form));
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setFamilies((current) => [...current, result.data]);
      setForm(blankFamilyForm());
      setErrors({});
      setOpen(false);
      setNotice(`Created “${result.data.name}”.`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? <ErrorAlert title="Could not create the Family">{error}</ErrorAlert> : null}
      {notice ? (
        <p role="status" aria-live="polite" className="text-body-sm text-success-foreground">
          {notice}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-sm text-muted-foreground">
          World-bound Families need a bound World and per-Fact number ranges; Global Families use a
          trigger World and set no ranges.
        </p>
        {canManageFamily ? (
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) {
                setErrors({});
              }
            }}
          >
            <DialogTrigger asChild>
              <Button type="button">
                <Plus aria-hidden="true" />
                New Family
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Family</DialogTitle>
                <DialogDescription>
                  A Family groups related Nitty Gritty Facts and their recurrence schedule.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} aria-label="New Family" autoComplete="off" noValidate>
                <div className="space-y-4">
                  <FormField id="new-family-name" label="Name" required error={errors.name}>
                    {(control) => (
                      <Input
                        {...control}
                        value={form.name}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, name: event.target.value }))
                        }
                        maxLength={200}
                      />
                    )}
                  </FormField>
                  <FormField id="new-family-type" label="Type" required className="max-w-xs">
                    {(control) => (
                      <NativeSelect
                        {...control}
                        value={form.type}
                        onChange={(event) => {
                          if (isFamilyType(event.target.value)) {
                            const type = event.target.value;
                            setForm((current) => ({ ...current, type }));
                          }
                        }}
                      >
                        {FAMILY_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {FAMILY_TYPE_LABELS[type]}
                          </option>
                        ))}
                      </NativeSelect>
                    )}
                  </FormField>
                  {form.type === 'WORLD_BOUND' ? (
                    <FormField
                      id="new-family-bound-world"
                      label="Bound World"
                      required
                      error={errors.boundWorldId}
                    >
                      {(control) => (
                        <NativeSelect
                          {...control}
                          value={form.boundWorldId}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, boundWorldId: event.target.value }))
                          }
                        >
                          <option value="">Select a World…</option>
                          {worlds.map((world) => (
                            <option key={world.id} value={world.id}>
                              {world.name}
                            </option>
                          ))}
                        </NativeSelect>
                      )}
                    </FormField>
                  ) : (
                    <FormField
                      id="new-family-trigger-world"
                      label="Trigger World"
                      required
                      error={errors.triggerWorldId}
                    >
                      {(control) => (
                        <NativeSelect
                          {...control}
                          value={form.triggerWorldId}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              triggerWorldId: event.target.value,
                            }))
                          }
                        >
                          <option value="">Select a World…</option>
                          {worlds.map((world) => (
                            <option key={world.id} value={world.id}>
                              {world.name}
                            </option>
                          ))}
                        </NativeSelect>
                      )}
                    </FormField>
                  )}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      id="new-family-recurrence-initial"
                      label="Initial interval"
                      required
                      error={errors.recurrenceInitialInterval}
                    >
                      {(control) => (
                        <Input
                          {...control}
                          type="number"
                          inputMode="numeric"
                          value={form.recurrenceInitialInterval}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              recurrenceInitialInterval: event.target.value,
                            }))
                          }
                        />
                      )}
                    </FormField>
                    <FormField
                      id="new-family-recurrence-growth"
                      label="Growth factor"
                      required
                      error={errors.recurrenceGrowthFactor}
                    >
                      {(control) => (
                        <Input
                          {...control}
                          type="number"
                          inputMode="decimal"
                          step="any"
                          value={form.recurrenceGrowthFactor}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              recurrenceGrowthFactor: event.target.value,
                            }))
                          }
                        />
                      )}
                    </FormField>
                    <FormField
                      id="new-family-instant-recall"
                      label="Threshold (ms)"
                      required
                      error={errors.instantRecallThresholdMs}
                    >
                      {(control) => (
                        <Input
                          {...control}
                          type="number"
                          inputMode="numeric"
                          value={form.instantRecallThresholdMs}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              instantRecallThresholdMs: event.target.value,
                            }))
                          }
                        />
                      )}
                    </FormField>
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating} aria-busy={creating}>
                    <Plus aria-hidden="true" />
                    {creating ? 'Creating…' : 'Create Family'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : (
          <p role="status" className="text-body-sm text-muted-foreground">
            Read-only: you do not hold <code className="font-mono">family.manage</code>.
          </p>
        )}
      </div>

      {families.length === 0 ? (
        <EmptyState
          title="No Nitty Gritty Families yet."
          description="Create a Family to group Facts and schedule their repetition."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <Table>
            <TableCaption className="sr-only">Nitty Gritty Families</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Family</TableHead>
                <TableHead className="w-36">Type</TableHead>
                <TableHead className="w-24 text-right">Facts</TableHead>
                <TableHead className="w-56">World</TableHead>
                <TableHead className="w-40">Recurrence</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {families.map((family) => {
                const world = worldLabel(family, worldNames);
                return (
                  <TableRow key={family.id}>
                    <TableCell className="whitespace-normal">
                      <Link
                        href={`/families/${family.id}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {family.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <FamilyTypeBadge type={family.type} />
                    </TableCell>
                    <TableCell className="text-right font-mono">{family.factCount}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {world.kind}: {world.name}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {family.recurrenceInitialInterval} × {family.recurrenceGrowthFactor} ·{' '}
                      {family.instantRecallThresholdMs}ms
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/families/${family.id}`}>
                          <Settings2 aria-hidden="true" />
                          Open
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
