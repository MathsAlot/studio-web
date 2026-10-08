'use client';

import { useRef, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, Plus, Save } from 'lucide-react';

import { CurriculumCompletionSummary } from '@/components/curriculum/completion-summary';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { SequenceEditor } from '@/components/curriculum/sequence-editor';
import { DraftStatusView } from '@/components/draft-status';
import { EmptyState } from '@/components/empty-state';
import { ErrorAlert } from '@/components/error-alert';
import { FormActions } from '@/components/form-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { VersionField, versionError } from '@/components/ui/version-field';
import type {
  ContentStatus,
  CurriculumCompletion,
  CurriculumDetail,
  SequenceDetail,
  TrickSummary,
} from '@/lib/api-client';
import {
  createSequence,
  getCurriculum,
  reorderSequences,
  updateCurriculum,
} from '@/lib/client/studio';
import { DRAFT_KEYS } from '@/lib/client/draft-store';
import { useDraft } from '@/lib/client/use-draft';
import {
  CONTENT_STATUSES,
  CONTENT_STATUS_LABELS,
  asText,
  toNullableText,
} from '@/lib/studio/fields';
import { applyOrderById } from '@/lib/studio/order';
import type { StudioCapabilities } from '@/lib/studio/permissions';

interface CurriculumBuilderProps {
  worldId: string;
  curriculum: CurriculumDetail;
  worldTricks: TrickSummary[];
  capabilities: StudioCapabilities;
  retryDelaysMs?: number[];
}

interface CurriculumForm {
  name: string;
  description: string;
  version: string;
  status: ContentStatus;
}

interface CurriculumErrors {
  name?: string;
  version?: string;
}

function toCurriculumForm(curriculum: CurriculumDetail): CurriculumForm {
  return {
    name: curriculum.name,
    description: asText(curriculum.description),
    version: curriculum.version,
    status: curriculum.status,
  };
}

/**
 * Curriculum & Sequence Builder (FR-12/FR-13/FR-14). Curricula and Sequences
 * are edited with draft preservation; completion is only ever the last value
 * the server reported, refreshed after each successful mutation.
 */
export function CurriculumBuilder({
  curriculum,
  worldTricks,
  capabilities,
  retryDelaysMs,
}: CurriculumBuilderProps) {
  const [initial] = useState<CurriculumForm>(() => toCurriculumForm(curriculum));
  const [sequences, setSequences] = useState<SequenceDetail[]>(curriculum.sequences);
  const [completion, setCompletion] = useState<CurriculumCompletion>(curriculum.completion);
  const [pendingOrder, setPendingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<CurriculumErrors>({});

  const nameRef = useRef<HTMLInputElement>(null);
  const versionRef = useRef<HTMLInputElement>(null);

  const readOnly = !capabilities.canWriteCurriculum;
  const canWriteSequence = capabilities.canWriteSequence;

  const draft = useDraft<CurriculumForm, CurriculumForm>({
    storageKey: DRAFT_KEYS.curriculum(curriculum.id),
    serverValue: initial,
    toValue: (value) => value,
    retryDelaysMs,
    persist: async (value) => {
      const result = await updateCurriculum(curriculum.id, {
        name: value.name,
        description: toNullableText(value.description),
        version: value.version,
        status: value.status,
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
      setSequences(result.data.sequences);
      setCompletion(result.data.completion);
    },
  });

  function handleSaveCurriculum() {
    const nameError = draft.value.name.trim().length === 0 ? 'Enter a Curriculum name.' : undefined;
    const versionValidation = versionError(draft.value.version) ?? undefined;
    setErrors({ name: nameError, version: versionValidation });
    if (nameError) {
      nameRef.current?.focus();
      return;
    }
    if (versionValidation) {
      versionRef.current?.focus();
      return;
    }
    draft.save();
  }

  async function refresh() {
    const result = await getCurriculum(curriculum.id);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSequences(result.data.sequences);
    setCompletion(result.data.completion);
  }

  function handleSequenceSaved(updated: SequenceDetail) {
    setSequences((current) =>
      current.map((sequence) => (sequence.id === updated.id ? updated : sequence)),
    );
    void refresh();
  }

  async function moveSequence(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= sequences.length) {
      return;
    }
    const next = [...sequences];
    const [moved] = next.splice(index, 1);
    if (!moved) {
      return;
    }
    next.splice(target, 0, moved);

    setPendingOrder(true);
    setError(null);
    const result = await reorderSequences(
      curriculum.id,
      next.map((sequence) => sequence.id),
    );
    setPendingOrder(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSequences(applyOrderById(sequences, result.data.orderedIds));
    setNotice('Reordered Sequences.');
  }

  return (
    <div className="space-y-6">
      {error ? <ErrorAlert>{error}</ErrorAlert> : null}
      {notice ? (
        <p role="status" aria-live="polite" className="text-body-sm text-success-foreground">
          {notice}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            <h2
              id="curriculum-details-heading"
              className="text-heading-2 font-semibold text-foreground"
            >
              Curriculum details
            </h2>
          </CardTitle>
          <CurriculumCompletionSummary completion={completion} />
        </CardHeader>
        <CardContent className="space-y-4">
          {readOnly ? (
            <p role="status" className="text-body-sm text-muted-foreground">
              Read-only: you do not hold <code className="font-mono">curriculum.write</code>.
            </p>
          ) : null}

          <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
            <FormField
              id="edit-curriculum-name"
              label="Name"
              required
              error={errors.name}
              hint="Shown in the World list and page title."
            >
              {(control) => (
                <Input
                  {...control}
                  ref={nameRef}
                  value={draft.value.name}
                  placeholder="e.g. Addition Core"
                  onChange={(event) =>
                    draft.setValue((current) => ({ ...current, name: event.target.value }))
                  }
                  disabled={readOnly}
                  maxLength={200}
                />
              )}
            </FormField>
            <VersionField
              id="edit-curriculum-version"
              value={draft.value.version}
              inputRef={versionRef}
              onChange={(version) => draft.setValue((current) => ({ ...current, version }))}
              disabled={readOnly}
              error={errors.version}
            />
          </div>
          <FormField
            id="edit-curriculum-description"
            label="Description"
            hint="Optional. Leave blank to clear."
            className="max-w-2xl"
          >
            {(control) => (
              <Textarea
                {...control}
                value={draft.value.description}
                placeholder="What this Curriculum covers."
                onChange={(event) =>
                  draft.setValue((current) => ({ ...current, description: event.target.value }))
                }
                disabled={readOnly}
                maxLength={2000}
                rows={2}
              />
            )}
          </FormField>
          <FormField id="edit-curriculum-status" label="Status" required className="max-w-xs">
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
                disabled={readOnly}
              >
                {CONTENT_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {CONTENT_STATUS_LABELS[option]}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
        </CardContent>
      </Card>

      {readOnly ? null : (
        <FormActions sticky className="rounded-md border border-border bg-surface px-4">
          <Button
            type="button"
            onClick={handleSaveCurriculum}
            disabled={!draft.isDirty || draft.status === 'saving'}
            aria-busy={draft.status === 'saving'}
          >
            <Save aria-hidden="true" />
            Save Curriculum
          </Button>
          <ConfirmDialog
            title="Discard local draft?"
            description="This clears the unsaved changes stored in this browser. The saved Curriculum is unaffected."
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
      )}

      <section aria-labelledby="sequences-heading" className="space-y-4">
        <div>
          <h2 id="sequences-heading" className="text-heading-1 font-semibold text-foreground">
            Sequences
          </h2>
          <p className="mt-1 max-w-2xl text-body-sm text-muted-foreground">
            Sequence order is deterministic; move with the explicit controls and the server confirms
            the new order before it is shown.
          </p>
        </div>

        {sequences.length === 0 ? (
          <EmptyState
            title="No Sequences in this Curriculum yet."
            description="Add a Sequence to begin assigning Trick roles."
          />
        ) : (
          <ul className="space-y-4" aria-label="Sequences">
            {sequences.map((sequence, index) => (
              <li key={sequence.id}>
                <div className="mb-1 flex items-center justify-end gap-1">
                  {canWriteSequence ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => void moveSequence(index, -1)}
                        disabled={pendingOrder || index === 0}
                        aria-label={`Move Sequence ${sequence.name} up`}
                        title="Move Sequence up"
                      >
                        <ArrowUp aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => void moveSequence(index, 1)}
                        disabled={pendingOrder || index === sequences.length - 1}
                        aria-label={`Move Sequence ${sequence.name} down`}
                        title="Move Sequence down"
                      >
                        <ArrowDown aria-hidden="true" />
                      </Button>
                    </>
                  ) : null}
                </div>
                <SequenceEditor
                  sequence={sequence}
                  worldTricks={worldTricks}
                  canWriteSequence={canWriteSequence}
                  onSaved={handleSequenceSaved}
                  retryDelaysMs={retryDelaysMs}
                />
              </li>
            ))}
          </ul>
        )}

        {canWriteSequence ? (
          <CreateSequenceForm
            curriculumId={curriculum.id}
            onCreated={(created) => {
              setSequences((current) => [...current, created]);
              setNotice(`Added Sequence “${created.name}”.`);
              void refresh();
            }}
          />
        ) : (
          <p role="status" className="text-body-sm text-muted-foreground">
            Read-only: you do not hold <code className="font-mono">sequence.write</code>.
          </p>
        )}
      </section>
    </div>
  );
}

interface CreateSequenceFormProps {
  curriculumId: string;
  onCreated: (sequence: SequenceDetail) => void;
}

interface SequenceFormErrors {
  name?: string;
  objective?: string;
}

function CreateSequenceForm({ curriculumId, onCreated }: CreateSequenceFormProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const objectiveRef = useRef<HTMLTextAreaElement>(null);

  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [difficultyDescription, setDifficultyDescription] = useState('');
  const [status, setStatus] = useState<ContentStatus>('DRAFT');
  const [errors, setErrors] = useState<SequenceFormErrors>({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: SequenceFormErrors = {};
    if (name.trim().length === 0) {
      nextErrors.name = 'Enter a Sequence name.';
    }
    if (objective.trim().length === 0) {
      nextErrors.objective = 'Enter a Sequence objective.';
    }
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.objective) {
      (nextErrors.name ? nameRef : objectiveRef).current?.focus();
      return;
    }
    setCreating(true);
    setError(null);
    const result = await createSequence(curriculumId, {
      name: name.trim(),
      objective: objective.trim(),
      difficultyDescription: toNullableText(difficultyDescription),
      status,
    });
    setCreating(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setName('');
    setObjective('');
    setDifficultyDescription('');
    setStatus('DRAFT');
    setErrors({});
    onCreated(result.data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3 id="create-sequence-heading" className="text-heading-2 font-semibold text-foreground">
            Add a Sequence
          </h3>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          aria-labelledby="create-sequence-heading"
          autoComplete="off"
          noValidate
          className="space-y-4"
        >
          {error ? <ErrorAlert>{error}</ErrorAlert> : null}
          <div className="grid max-w-2xl gap-4">
            <FormField
              id="new-sequence-name"
              label="Name"
              required
              error={errors.name}
              className="max-w-md"
            >
              {(control) => (
                <Input
                  {...control}
                  ref={nameRef}
                  value={name}
                  placeholder="e.g. First steps"
                  onChange={(event) => setName(event.target.value)}
                  maxLength={200}
                />
              )}
            </FormField>
            <FormField
              id="new-sequence-objective"
              label="Objective"
              required
              error={errors.objective}
              hint="What the learner should achieve by the end of the Sequence."
            >
              {(control) => (
                <Textarea
                  {...control}
                  ref={objectiveRef}
                  value={objective}
                  placeholder="e.g. Add single-digit numbers without carrying."
                  onChange={(event) => setObjective(event.target.value)}
                  maxLength={2000}
                  rows={2}
                />
              )}
            </FormField>
            <FormField
              id="new-sequence-difficulty"
              label="Difficulty description"
              hint="Optional. Note how difficulty builds across the Sequence."
            >
              {(control) => (
                <Textarea
                  {...control}
                  value={difficultyDescription}
                  placeholder="e.g. Starts with single digits, ends with carrying."
                  onChange={(event) => setDifficultyDescription(event.target.value)}
                  maxLength={500}
                  rows={2}
                />
              )}
            </FormField>
            <FormField id="new-sequence-status" label="Status" required className="max-w-xs">
              {(control) => (
                <NativeSelect
                  {...control}
                  value={status}
                  onChange={(event) => setStatus(event.target.value as ContentStatus)}
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
          <Button type="submit" disabled={creating} aria-busy={creating}>
            <Plus aria-hidden="true" />
            {creating ? 'Creating…' : 'Create Sequence'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
