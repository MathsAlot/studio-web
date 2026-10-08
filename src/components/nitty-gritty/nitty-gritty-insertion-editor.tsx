'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ListOrdered, Plus, Save, Trash2 } from 'lucide-react';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { DraftStatusView } from '@/components/draft-status';
import { EmptyState } from '@/components/empty-state';
import { ErrorAlert } from '@/components/error-alert';
import { FormActions } from '@/components/form-actions';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { NativeSelect } from '@/components/ui/native-select';
import type { FactDetail, Insertion, InsertionType } from '@/lib/api-client';
import { getFamily, listFamilies, listInsertions, setInsertions } from '@/lib/client/studio';
import { DRAFT_KEYS } from '@/lib/client/draft-store';
import { useDraft } from '@/lib/client/use-draft';
import { INSERTION_TYPE_LABELS, INSERTION_TYPES } from '@/lib/studio/fields';

interface FactOption {
  factId: string;
  label: string;
  familyId: string;
  familyName: string;
}

interface InsertionRow {
  factId: string;
  insertionType: InsertionType;
}

interface NittyGrittyInsertionEditorProps {
  sequenceId: string;
  canWriteSequence: boolean;
  retryDelaysMs?: number[];
}

function factLabel(fact: FactDetail): string {
  return fact.factText.length > 0 ? fact.factText : fact.id;
}

/**
 * Nitty Gritty insertions for one Sequence (D-038). Loads on demand behind a
 * disclosure so browsing a Curriculum does not fan out family requests. Order is
 * gap-free 1..n; the full list is replaced via `PUT`, guarded by a draft so a
 * failed save keeps the working copy.
 */
export function NittyGrittyInsertionEditor({
  sequenceId,
  canWriteSequence,
  retryDelaysMs,
}: NittyGrittyInsertionEditorProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [insertions, setInsertions] = useState<Insertion[]>([]);
  const [factOptions, setFactOptions] = useState<FactOption[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || status !== 'loading') {
      return;
    }
    let cancelled = false;

    void (async () => {
      const [insertionsResult, familiesResult] = await Promise.all([
        listInsertions(sequenceId),
        listFamilies(),
      ]);
      if (cancelled) {
        return;
      }
      if (!insertionsResult.ok) {
        setError(insertionsResult.message);
        setStatus('error');
        return;
      }
      if (!familiesResult.ok) {
        setInsertions(insertionsResult.data);
        setOptionsError(familiesResult.message);
        setStatus('ready');
        return;
      }

      const familyDetails = await Promise.all(
        familiesResult.data.map(async (family) => {
          const detail = await getFamily(family.id);
          return { family, detail };
        }),
      );
      if (cancelled) {
        return;
      }

      const options: FactOption[] = [];
      let firstOptionsError: string | null = null;
      for (const { family, detail } of familyDetails) {
        if (!detail.ok) {
          firstOptionsError ??= detail.message;
          continue;
        }
        for (const fact of detail.data.facts) {
          options.push({
            factId: fact.id,
            label: factLabel(fact),
            familyId: family.id,
            familyName: family.name,
          });
        }
      }

      setInsertions(insertionsResult.data);
      setFactOptions(options);
      setOptionsError(firstOptionsError);
      setStatus('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, [open, status, sequenceId]);

  function start() {
    setOpen(true);
    setStatus('loading');
    setError(null);
  }

  if (!open) {
    return (
      <div className="mt-4 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={start}>
          <ListOrdered aria-hidden="true" />
          Manage Nitty Gritty insertions
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-md border border-border bg-surface-muted p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-heading-2 font-semibold text-foreground">Nitty Gritty insertions</h4>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>

      {status === 'loading' ? (
        <p role="status" className="mt-2 text-body-sm text-muted-foreground">
          Loading insertions…
        </p>
      ) : null}

      {status === 'error' ? (
        <div className="mt-2 space-y-2">
          <ErrorAlert title="Could not load insertions">{error}</ErrorAlert>
          <Button type="button" variant="outline" onClick={start}>
            Retry
          </Button>
        </div>
      ) : null}

      {status === 'ready' ? (
        <InsertionForm
          key={sequenceId}
          sequenceId={sequenceId}
          initialInsertions={insertions}
          factOptions={factOptions}
          optionsError={optionsError}
          canWriteSequence={canWriteSequence}
          retryDelaysMs={retryDelaysMs}
        />
      ) : null}
    </div>
  );
}

interface InsertionFormProps {
  sequenceId: string;
  initialInsertions: Insertion[];
  factOptions: FactOption[];
  optionsError: string | null;
  canWriteSequence: boolean;
  retryDelaysMs?: number[];
}

function toRows(insertions: Insertion[]): InsertionRow[] {
  return [...insertions]
    .sort((a, b) => a.position - b.position)
    .map((insertion) => ({ factId: insertion.factId, insertionType: insertion.insertionType }));
}

function InsertionForm({
  sequenceId,
  initialInsertions,
  factOptions,
  optionsError,
  canWriteSequence,
  retryDelaysMs,
}: InsertionFormProps) {
  const [initial] = useState<InsertionRow[]>(() => toRows(initialInsertions));
  const [factToAdd, setFactToAdd] = useState('');
  const [typeToAdd, setTypeToAdd] = useState<InsertionType>('gating');

  const draft = useDraft<InsertionRow[], InsertionRow[]>({
    storageKey: DRAFT_KEYS.insertions(sequenceId),
    serverValue: initial,
    toValue: (value) => value,
    retryDelaysMs,
    persist: async (rows) => {
      const result = await setInsertions(sequenceId, {
        insertions: rows.map((row, index) => ({
          factId: row.factId,
          insertionType: row.insertionType,
          position: index + 1,
        })),
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
    },
  });

  const labelById = new Map(factOptions.map((option) => [option.factId, option.label]));
  const usedIds = new Set(draft.value.map((row) => row.factId));
  const availableOptions = factOptions.filter((option) => !usedIds.has(option.factId));
  const families = [...new Set(availableOptions.map((option) => option.familyId))].map(
    (familyId) => ({
      familyId,
      familyName:
        availableOptions.find((option) => option.familyId === familyId)?.familyName ?? familyId,
    }),
  );

  function labelFor(factId: string): string {
    return labelById.get(factId) ?? factId;
  }

  function addRow() {
    if (factToAdd.length === 0) {
      return;
    }
    draft.setValue((current) => [...current, { factId: factToAdd, insertionType: typeToAdd }]);
    setFactToAdd('');
    setTypeToAdd('gating');
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= draft.value.length) {
      return;
    }
    draft.setValue((current) => {
      const next = [...current];
      const [moved] = next.splice(index, 1);
      if (!moved) {
        return current;
      }
      next.splice(target, 0, moved);
      return next;
    });
  }

  function setType(index: number, insertionType: InsertionType) {
    draft.setValue((current) =>
      current.map((row, position) => (position === index ? { ...row, insertionType } : row)),
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {optionsError ? (
        <ErrorAlert title="Some Facts could not be listed">{optionsError}</ErrorAlert>
      ) : null}

      {draft.value.length === 0 ? (
        <EmptyState
          title="No insertions scheduled."
          description="Add Facts to weave Nitty Gritty repetitions into this Sequence."
        />
      ) : (
        <ol className="space-y-2" aria-label="Insertions">
          {draft.value.map((row, index) => (
            <li
              key={`${row.factId}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2"
            >
              <span className="text-body text-foreground">
                {index + 1}. {labelFor(row.factId)}
              </span>
              <span className="flex items-center gap-2">
                <FormField
                  id={`insertion-type-${sequenceId}-${row.factId}`}
                  label="Insertion type"
                  className="w-40"
                >
                  {(control) => (
                    <NativeSelect
                      {...control}
                      value={row.insertionType}
                      onChange={(event) => {
                        if (event.target.value === 'gating' || event.target.value === 'alongside') {
                          setType(index, event.target.value);
                        }
                      }}
                      disabled={!canWriteSequence}
                      className="h-7 text-body-sm"
                    >
                      {INSERTION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {INSERTION_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </NativeSelect>
                  )}
                </FormField>
                {canWriteSequence ? (
                  <span className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${labelFor(row.factId)} up`}
                      title="Move up"
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => move(index, 1)}
                      disabled={index === draft.value.length - 1}
                      aria-label={`Move ${labelFor(row.factId)} down`}
                      title="Move down"
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <ConfirmDialog
                      title="Remove insertion?"
                      description={`Remove “${labelFor(row.factId)}” from this Sequence. The Fact itself is not deleted.`}
                      confirmLabel="Remove"
                      destructive
                      onConfirm={() =>
                        draft.setValue((current) =>
                          current.filter((_, position) => position !== index),
                        )
                      }
                      trigger={
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-sm"
                          aria-label={`Remove ${labelFor(row.factId)}`}
                          title="Remove insertion"
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      }
                    />
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      )}

      {canWriteSequence ? (
        <div className="flex flex-wrap items-end gap-4 border-t border-border pt-3">
          <FormField id={`add-insertion-fact-${sequenceId}`} label="Fact" required className="w-64">
            {(control) => (
              <NativeSelect
                {...control}
                value={factToAdd}
                onChange={(event) => setFactToAdd(event.target.value)}
                disabled={availableOptions.length === 0}
              >
                <option value="">Select a Fact…</option>
                {families.map((family) => (
                  <optgroup key={family.familyId} label={family.familyName}>
                    {availableOptions
                      .filter((option) => option.familyId === family.familyId)
                      .map((option) => (
                        <option key={option.factId} value={option.factId}>
                          {option.label}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField
            id={`add-insertion-type-${sequenceId}`}
            label="Insertion type"
            required
            className="w-40"
          >
            {(control) => (
              <NativeSelect
                {...control}
                value={typeToAdd}
                onChange={(event) => {
                  if (event.target.value === 'gating' || event.target.value === 'alongside') {
                    setTypeToAdd(event.target.value);
                  }
                }}
              >
                {INSERTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {INSERTION_TYPE_LABELS[type]}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <Button
            type="button"
            variant="outline"
            onClick={addRow}
            disabled={factToAdd.length === 0}
          >
            <Plus aria-hidden="true" />
            Add insertion
          </Button>
        </div>
      ) : (
        <p role="status" className="text-body-sm text-muted-foreground">
          Read-only: you do not hold <code className="font-mono">sequence.write</code>.
        </p>
      )}

      {factOptions.length === 0 && canWriteSequence && optionsError === null ? (
        <p role="status" className="text-body-sm text-muted-foreground">
          No Facts are available to insert yet.
        </p>
      ) : null}

      {canWriteSequence ? (
        <FormActions>
          <Button
            type="button"
            onClick={draft.save}
            disabled={!draft.isDirty || draft.status === 'saving'}
            aria-busy={draft.status === 'saving'}
          >
            <Save aria-hidden="true" />
            Save insertions
          </Button>
          <ConfirmDialog
            title="Discard local draft?"
            description="This clears the unsaved insertion list stored in this browser. The saved Sequence is unaffected."
            confirmLabel="Discard draft"
            destructive
            onConfirm={draft.discard}
            trigger={
              <Button type="button" variant="outline" disabled={!draft.isDirty && !draft.restored}>
                Discard local draft
              </Button>
            }
          />
          <DraftStatusView
            status={draft.status}
            error={draft.error}
            isDirty={draft.isDirty}
            restored={draft.restored}
          />
        </FormActions>
      ) : null}
    </div>
  );
}
