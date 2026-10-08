'use client';

import { useRef, useState } from 'react';
import { Save } from 'lucide-react';

import { AssignmentEditor } from '@/components/curriculum/assignment-editor';
import { SequenceCompletionSummary } from '@/components/curriculum/completion-summary';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DraftStatusView } from '@/components/draft-status';
import { FormActions } from '@/components/form-actions';
import { NittyGrittyInsertionEditor } from '@/components/nitty-gritty/nitty-gritty-insertion-editor';
import { ContentStatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import type { ContentStatus, SequenceDetail, TrickSummary } from '@/lib/api-client';
import { updateSequence } from '@/lib/client/studio';
import { DRAFT_KEYS } from '@/lib/client/draft-store';
import { useDraft } from '@/lib/client/use-draft';
import {
  CONTENT_STATUSES,
  CONTENT_STATUS_LABELS,
  asText,
  toNullableText,
} from '@/lib/studio/fields';

interface SequenceForm {
  name: string;
  objective: string;
  difficultyDescription: string;
  status: ContentStatus;
}

interface SequenceEditorProps {
  sequence: SequenceDetail;
  worldTricks: TrickSummary[];
  canWriteSequence: boolean;
  onSaved: (sequence: SequenceDetail) => void;
  retryDelaysMs?: number[];
}

function toSequenceForm(sequence: SequenceDetail): SequenceForm {
  return {
    name: sequence.name,
    objective: sequence.objective,
    difficultyDescription: asText(sequence.difficultyDescription),
    status: sequence.status,
  };
}

/**
 * One Curriculum Sequence: metadata editor plus its Trick-role assignments.
 * The metadata draft is namespaced per Sequence (D-027); the server is the
 * source of truth and the visible completeness reads only server values.
 */
export function SequenceEditor({
  sequence,
  worldTricks,
  canWriteSequence,
  onSaved,
  retryDelaysMs,
}: SequenceEditorProps) {
  // Capture the server-loaded baseline once; later server refreshes must not
  // wipe an in-progress local draft.
  const [initial] = useState<SequenceForm>(() => toSequenceForm(sequence));
  const nameRef = useRef<HTMLInputElement>(null);
  const objectiveRef = useRef<HTMLTextAreaElement>(null);
  const [errors, setErrors] = useState<{ name?: string; objective?: string }>({});

  const draft = useDraft<SequenceForm, SequenceForm>({
    storageKey: DRAFT_KEYS.sequence(sequence.id),
    serverValue: initial,
    toValue: (value) => value,
    retryDelaysMs,
    persist: async (value) => {
      const result = await updateSequence(sequence.id, {
        name: value.name,
        objective: value.objective,
        difficultyDescription: toNullableText(value.difficultyDescription),
        status: value.status,
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
      onSaved(result.data);
    },
  });

  function handleSave() {
    const nameError = draft.value.name.trim().length === 0 ? 'Enter a Sequence name.' : undefined;
    const objectiveError =
      draft.value.objective.trim().length === 0 ? 'Enter a Sequence objective.' : undefined;
    setErrors({ name: nameError, objective: objectiveError });
    if (nameError) {
      nameRef.current?.focus();
      return;
    }
    if (objectiveError) {
      objectiveRef.current?.focus();
      return;
    }
    draft.save();
  }

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>
            <h3
              id={`sequence-heading-${sequence.id}`}
              className="text-heading-2 font-semibold text-foreground"
            >
              {sequence.sequenceNumber}. {sequence.name}
            </h3>
          </CardTitle>
          <ContentStatusBadge status={sequence.status} />
        </div>
        <SequenceCompletionSummary sequence={sequence} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid max-w-2xl gap-4">
          <FormField id={`sequence-name-${sequence.id}`} label="Name" required error={errors.name}>
            {(control) => (
              <Input
                {...control}
                ref={nameRef}
                value={draft.value.name}
                onChange={(event) => {
                  setErrors((current) => ({ ...current, name: undefined }));
                  draft.setValue((current) => ({ ...current, name: event.target.value }));
                }}
                disabled={!canWriteSequence}
                maxLength={200}
              />
            )}
          </FormField>
          <FormField
            id={`sequence-objective-${sequence.id}`}
            label="Objective"
            required
            error={errors.objective}
            hint="What the learner should achieve in this Sequence."
          >
            {(control) => (
              <Textarea
                {...control}
                ref={objectiveRef}
                value={draft.value.objective}
                onChange={(event) => {
                  setErrors((current) => ({ ...current, objective: undefined }));
                  draft.setValue((current) => ({ ...current, objective: event.target.value }));
                }}
                disabled={!canWriteSequence}
                maxLength={2000}
                rows={2}
              />
            )}
          </FormField>
          <FormField
            id={`sequence-difficulty-${sequence.id}`}
            label="Difficulty description"
            hint="Optional. Note how difficulty builds across the Sequence."
          >
            {(control) => (
              <Textarea
                {...control}
                value={draft.value.difficultyDescription}
                onChange={(event) =>
                  draft.setValue((current) => ({
                    ...current,
                    difficultyDescription: event.target.value,
                  }))
                }
                disabled={!canWriteSequence}
                maxLength={500}
                rows={2}
              />
            )}
          </FormField>
          <FormField
            id={`sequence-status-${sequence.id}`}
            label="Status"
            required
            className="max-w-xs"
          >
            {(control) => (
              <NativeSelect
                {...control}
                value={draft.value.status}
                onChange={(event) =>
                  draft.setValue((current) => ({
                    ...current,
                    status: event.target.value as ContentStatus,
                  }))
                }
                disabled={!canWriteSequence}
              >
                {CONTENT_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {CONTENT_STATUS_LABELS[option]}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
        </div>

        {canWriteSequence ? (
          <FormActions>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!draft.isDirty || draft.status === 'saving'}
              aria-busy={draft.status === 'saving'}
            >
              <Save aria-hidden="true" />
              Save Sequence
            </Button>
            <ConfirmDialog
              title="Discard local draft?"
              description="This clears the unsaved changes stored in this browser. The saved Sequence is unaffected."
              confirmLabel="Discard draft"
              destructive
              onConfirm={draft.discard}
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  disabled={!draft.isDirty && !draft.restored}
                >
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
        ) : (
          <p role="status" className="text-body-sm text-muted-foreground">
            Read-only: you do not hold <code className="font-mono">sequence.write</code>.
          </p>
        )}

        <AssignmentEditor
          sequence={sequence}
          worldTricks={worldTricks}
          canWriteSequence={canWriteSequence}
          onSaved={onSaved}
          retryDelaysMs={retryDelaysMs}
        />

        <NittyGrittyInsertionEditor
          sequenceId={sequence.id}
          canWriteSequence={canWriteSequence}
          retryDelaysMs={retryDelaysMs}
        />
      </CardContent>
    </Card>
  );
}
