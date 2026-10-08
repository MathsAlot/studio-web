'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { DraftStatusView } from '@/components/draft-status';
import { FormActions } from '@/components/form-actions';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import type { SequenceDetail, SequenceRole, TrickSummary } from '@/lib/api-client';
import { setSequenceTricks } from '@/lib/client/studio';
import { DRAFT_KEYS } from '@/lib/client/draft-store';
import { useDraft } from '@/lib/client/use-draft';
import { SEQUENCE_ROLES, SEQUENCE_ROLE_LABELS } from '@/lib/studio/fields';

interface AssignmentRow {
  trickId: string;
  role: SequenceRole;
}

interface AssignmentEditorProps {
  sequence: SequenceDetail;
  worldTricks: TrickSummary[];
  canWriteSequence: boolean;
  onSaved: (sequence: SequenceDetail) => void;
  retryDelaysMs?: number[];
}

function toAssignmentForm(sequence: SequenceDetail): AssignmentRow[] {
  return [...sequence.tricks]
    .sort((a, b) => a.position - b.position)
    .map((trick) => ({ trickId: trick.trickId, role: trick.role }));
}

/**
 * Per-Sequence Trick role assignment (FR-14, D-026). Positions are recomputed
 * 1..n on every change and sent as one ordered list; the server re-validates
 * cross-World and duplicate rules. The local draft (D-027) survives a failed
 * save and retries with backoff.
 */
export function AssignmentEditor({
  sequence,
  worldTricks,
  canWriteSequence,
  onSaved,
  retryDelaysMs,
}: AssignmentEditorProps) {
  // Capture the server-loaded order once; server refreshes must not clobber a
  // dirty draft.
  const [initial] = useState<AssignmentRow[]>(() => toAssignmentForm(sequence));

  const draft = useDraft<AssignmentRow[], AssignmentRow[]>({
    storageKey: DRAFT_KEYS.sequenceAssignments(sequence.id),
    serverValue: initial,
    toValue: (value) => value,
    retryDelaysMs,
    persist: async (rows) => {
      const result = await setSequenceTricks(sequence.id, {
        tricks: rows.map((row, index) => ({
          trickId: row.trickId,
          role: row.role,
          position: index + 1,
        })),
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
      onSaved(result.data);
    },
  });

  const [trickToAdd, setTrickToAdd] = useState('');
  const [roleToAdd, setRoleToAdd] = useState<SequenceRole>('INTRODUCE');

  const assignedIds = new Set(draft.value.map((row) => row.trickId));
  const available = worldTricks.filter((trick) => !assignedIds.has(trick.id));
  const trickById = new Map(worldTricks.map((trick) => [trick.id, trick]));

  function trickLabel(trickId: string): string {
    const trick = trickById.get(trickId);
    return trick ? `${trick.position}. ${trick.name}` : trickId;
  }

  function addAssignment() {
    if (trickToAdd.length === 0) {
      return;
    }
    draft.setValue((current) => [...current, { trickId: trickToAdd, role: roleToAdd }]);
    setTrickToAdd('');
    setRoleToAdd('INTRODUCE');
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

  function remove(index: number) {
    draft.setValue((current) => current.filter((_, position) => position !== index));
  }

  function setRole(index: number, role: SequenceRole) {
    draft.setValue((current) =>
      current.map((row, position) => (position === index ? { ...row, role } : row)),
    );
  }

  return (
    <div className="rounded-md border border-border bg-surface-muted p-4">
      <h4 className="text-heading-2 font-semibold text-foreground">Trick roles</h4>
      <p className="mt-1 text-body-sm text-muted-foreground">
        Assigned Tricks must belong to this Curriculum&rsquo;s World; a Trick may appear once, and
        positions are server-enforced 1..n.
      </p>

      {draft.value.length === 0 ? (
        <p role="status" className="mt-3 text-body-sm text-muted-foreground">
          No Tricks assigned to this Sequence yet.
        </p>
      ) : (
        <ol className="mt-3 space-y-2" aria-label="Assigned Tricks">
          {draft.value.map((row, index) => (
            <li
              key={`${row.trickId}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2"
            >
              <span className="text-body text-foreground">
                {index + 1}. {trickLabel(row.trickId)}
              </span>
              <span className="flex items-center gap-2">
                <Label
                  htmlFor={`assignment-role-${sequence.id}-${row.trickId}`}
                  className="text-body-sm text-muted-foreground"
                >
                  Role
                </Label>
                <NativeSelect
                  id={`assignment-role-${sequence.id}-${row.trickId}`}
                  name={`assignment-role-${row.trickId}`}
                  value={row.role}
                  onChange={(event) => setRole(index, event.target.value as SequenceRole)}
                  disabled={!canWriteSequence}
                  className="h-7 w-auto text-body-sm"
                >
                  {SEQUENCE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {SEQUENCE_ROLE_LABELS[role]}
                    </option>
                  ))}
                </NativeSelect>
                {canWriteSequence ? (
                  <span className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${trickLabel(row.trickId)} up`}
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
                      aria-label={`Move ${trickLabel(row.trickId)} down`}
                      title="Move down"
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <ConfirmDialog
                      title="Remove role assignment?"
                      description={`Remove “${trickLabel(row.trickId)}” from this Sequence. The Trick itself is not deleted.`}
                      confirmLabel="Remove"
                      destructive
                      onConfirm={() => remove(index)}
                      trigger={
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-sm"
                          aria-label={`Remove ${trickLabel(row.trickId)}`}
                          title="Remove assignment"
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
        <div className="mt-4 flex flex-wrap items-end gap-4 border-t border-border pt-4">
          <FormField id={`add-trick-${sequence.id}`} label="Trick" required className="w-56">
            {(control) => (
              <NativeSelect
                {...control}
                value={trickToAdd}
                onChange={(event) => setTrickToAdd(event.target.value)}
                disabled={available.length === 0}
              >
                <option value="">Select a Trick…</option>
                {available.map((trick) => (
                  <option key={trick.id} value={trick.id}>
                    {trick.position}. {trick.name}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField id={`add-role-${sequence.id}`} label="Role" required className="w-40">
            {(control) => (
              <NativeSelect
                {...control}
                value={roleToAdd}
                onChange={(event) => setRoleToAdd(event.target.value as SequenceRole)}
              >
                {SEQUENCE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {SEQUENCE_ROLE_LABELS[role]}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <Button
            type="button"
            variant="outline"
            onClick={addAssignment}
            disabled={trickToAdd.length === 0}
          >
            <Plus aria-hidden="true" />
            Add role assignment
          </Button>
        </div>
      ) : (
        <p role="status" className="mt-4 text-body-sm text-muted-foreground">
          Read-only: you do not hold <code className="font-mono">sequence.write</code>.
        </p>
      )}

      {available.length === 0 && canWriteSequence ? (
        <p role="status" className="mt-2 text-body-sm text-muted-foreground">
          {worldTricks.length === 0
            ? 'This World has no Tricks to assign.'
            : 'Every Trick in this World is already assigned.'}
        </p>
      ) : null}

      {canWriteSequence ? (
        <FormActions className="mt-4">
          <Button
            type="button"
            onClick={draft.save}
            disabled={!draft.isDirty || draft.status === 'saving'}
            aria-busy={draft.status === 'saving'}
          >
            <Save aria-hidden="true" />
            Save assignments
          </Button>
          <ConfirmDialog
            title="Discard local draft?"
            description="This clears the unsaved role assignments stored in this browser. The saved Sequence is unaffected."
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
