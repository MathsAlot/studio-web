'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Save } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { ErrorAlert } from '@/components/error-alert';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DraftStatusView } from '@/components/draft-status';
import { FactCreateForm } from '@/components/nitty-gritty/fact-create-form';
import { FactEditor } from '@/components/nitty-gritty/fact-editor';
import { FamilyTypeBadge } from '@/components/nitty-gritty/family-type-badge';
import { FormActions } from '@/components/form-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import type { FactDetail, FactTypeMetadata, FamilyDetail, WorldSummary } from '@/lib/api-client';
import { reorderFacts, updateFamily } from '@/lib/client/studio';
import { DRAFT_KEYS } from '@/lib/client/draft-store';
import { useDraft } from '@/lib/client/use-draft';
import {
  FACT_TYPE_LABELS,
  FAMILY_TYPES,
  FAMILY_TYPE_LABELS,
  isFamilyType,
} from '@/lib/studio/fields';
import {
  familyFormFromDetail,
  updateFamilyInputFromForm,
  validateFamilyForm,
  type FamilyForm,
  type FamilyFormErrors,
} from '@/lib/studio/nitty-gritty';
import { applyOrderById } from '@/lib/studio/order';

interface FamilyEditorProps {
  family: FamilyDetail;
  worlds: WorldSummary[];
  factTypes: FactTypeMetadata[];
  canManageFamily: boolean;
  /** Phase 05: grants fact.vetting.write; defaults to view-only. */
  canVetFact?: boolean;
  retryDelaysMs?: number[];
}

function factTypeLabel(fact: FactDetail): string {
  return FACT_TYPE_LABELS[fact.factType];
}

/**
 * Nitty Gritty Family detail: Family metadata (name, type-driven World binding,
 * recurrence, threshold) plus its ordered Facts. Family order is deterministic;
 * each Fact edits under its own draft. Type drives the form: World-bound shows a
 * bound World and per-Fact range; Global shows a trigger World and hides ranges.
 */
export function FamilyEditor({
  family,
  worlds,
  factTypes,
  canManageFamily,
  canVetFact = false,
  retryDelaysMs,
}: FamilyEditorProps) {
  const [initial] = useState<FamilyForm>(() => familyFormFromDetail(family));
  const [detail, setDetail] = useState<FamilyDetail>(family);
  const [facts, setFacts] = useState<FactDetail[]>(family.facts);
  const [selectedFactId, setSelectedFactId] = useState<string | null>(family.facts[0]?.id ?? null);
  const [errors, setErrors] = useState<FamilyFormErrors>({});
  const [orderPending, setOrderPending] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const readOnly = !canManageFamily;

  const draft = useDraft<FamilyForm, FamilyForm>({
    storageKey: DRAFT_KEYS.family(family.id),
    serverValue: initial,
    toValue: (value) => value,
    retryDelaysMs,
    persist: async (value) => {
      const result = await updateFamily(family.id, updateFamilyInputFromForm(value));
      if (!result.ok) {
        throw new Error(result.message);
      }
      setDetail(result.data);
    },
  });

  const selectedFact = facts.find((fact) => fact.id === selectedFactId) ?? facts[0] ?? null;

  function handleSave() {
    const nextErrors = validateFamilyForm(draft.value);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    draft.save();
  }

  async function moveFact(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= facts.length) {
      return;
    }
    const next = [...facts];
    const [moved] = next.splice(index, 1);
    if (!moved) {
      return;
    }
    next.splice(target, 0, moved);

    setOrderPending(true);
    setOrderError(null);
    const result = await reorderFacts(
      family.id,
      next.map((fact) => fact.id),
    );
    setOrderPending(false);
    if (!result.ok) {
      setOrderError(result.message);
      return;
    }
    setFacts(applyOrderById(facts, result.data.orderedIds));
    setNotice('Reordered Facts.');
  }

  const boundWorld = isFamilyType(draft.value.type) ? draft.value.type : detail.type;

  return (
    <div className="space-y-6">
      {orderError ? <ErrorAlert title="Could not reorder Facts">{orderError}</ErrorAlert> : null}
      {notice ? (
        <p role="status" aria-live="polite" className="text-body-sm text-success-foreground">
          {notice}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>
              <h2
                id="family-details-heading"
                className="text-heading-2 font-semibold text-foreground"
              >
                Family details
              </h2>
            </CardTitle>
            <FamilyTypeBadge type={detail.type} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {readOnly ? (
            <p role="status" className="text-body-sm text-muted-foreground">
              Read-only: you do not hold <code className="font-mono">family.manage</code>.
            </p>
          ) : null}

          <div className="grid max-w-2xl gap-4">
            <FormField id="family-name" label="Name" required error={errors.name}>
              {(control) => (
                <Input
                  {...control}
                  value={draft.value.name}
                  onChange={(event) => {
                    setErrors((current) => ({ ...current, name: undefined }));
                    draft.setValue((current) => ({ ...current, name: event.target.value }));
                  }}
                  disabled={readOnly}
                  maxLength={200}
                />
              )}
            </FormField>

            <FormField
              id="family-type"
              label="Type"
              required
              className="max-w-xs"
              hint="World-bound pins the Family to one World; Global triggers after a chosen World."
            >
              {(control) => (
                <NativeSelect
                  {...control}
                  value={draft.value.type}
                  onChange={(event) => {
                    if (isFamilyType(event.target.value)) {
                      const type = event.target.value;
                      setErrors((current) => ({
                        ...current,
                        boundWorldId: undefined,
                        triggerWorldId: undefined,
                      }));
                      draft.setValue((current) => ({ ...current, type }));
                    }
                  }}
                  disabled={readOnly}
                >
                  {FAMILY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {FAMILY_TYPE_LABELS[type]}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>

            {boundWorld === 'WORLD_BOUND' ? (
              <FormField
                id="family-bound-world"
                label="Bound World"
                required
                error={errors.boundWorldId}
                className="max-w-sm"
              >
                {(control) => (
                  <NativeSelect
                    {...control}
                    value={draft.value.boundWorldId}
                    onChange={(event) => {
                      setErrors((current) => ({ ...current, boundWorldId: undefined }));
                      draft.setValue((current) => ({
                        ...current,
                        boundWorldId: event.target.value,
                      }));
                    }}
                    disabled={readOnly}
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
                id="family-trigger-world"
                label="Trigger World"
                required
                error={errors.triggerWorldId}
                className="max-w-sm"
                hint="The Family unlocks once this World is complete."
              >
                {(control) => (
                  <NativeSelect
                    {...control}
                    value={draft.value.triggerWorldId}
                    onChange={(event) => {
                      setErrors((current) => ({ ...current, triggerWorldId: undefined }));
                      draft.setValue((current) => ({
                        ...current,
                        triggerWorldId: event.target.value,
                      }));
                    }}
                    disabled={readOnly}
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
                id="family-recurrence-initial"
                label="Initial interval"
                required
                error={errors.recurrenceInitialInterval}
                hint="Repetitions before first review."
              >
                {(control) => (
                  <Input
                    {...control}
                    type="number"
                    inputMode="numeric"
                    value={draft.value.recurrenceInitialInterval}
                    onChange={(event) => {
                      setErrors((current) => ({
                        ...current,
                        recurrenceInitialInterval: undefined,
                      }));
                      draft.setValue((current) => ({
                        ...current,
                        recurrenceInitialInterval: event.target.value,
                      }));
                    }}
                    disabled={readOnly}
                  />
                )}
              </FormField>
              <FormField
                id="family-recurrence-growth"
                label="Growth factor"
                required
                error={errors.recurrenceGrowthFactor}
                hint="Multiplier applied each interval."
              >
                {(control) => (
                  <Input
                    {...control}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={draft.value.recurrenceGrowthFactor}
                    onChange={(event) => {
                      setErrors((current) => ({ ...current, recurrenceGrowthFactor: undefined }));
                      draft.setValue((current) => ({
                        ...current,
                        recurrenceGrowthFactor: event.target.value,
                      }));
                    }}
                    disabled={readOnly}
                  />
                )}
              </FormField>
              <FormField
                id="family-instant-recall"
                label="Instant recall threshold (ms)"
                required
                error={errors.instantRecallThresholdMs}
              >
                {(control) => (
                  <Input
                    {...control}
                    type="number"
                    inputMode="numeric"
                    value={draft.value.instantRecallThresholdMs}
                    onChange={(event) => {
                      setErrors((current) => ({ ...current, instantRecallThresholdMs: undefined }));
                      draft.setValue((current) => ({
                        ...current,
                        instantRecallThresholdMs: event.target.value,
                      }));
                    }}
                    disabled={readOnly}
                  />
                )}
              </FormField>
            </div>
          </div>

          {readOnly ? null : (
            <FormActions>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!draft.isDirty || draft.status === 'saving'}
                aria-busy={draft.status === 'saving'}
              >
                <Save aria-hidden="true" />
                Save Family
              </Button>
              <ConfirmDialog
                title="Discard local draft?"
                description="This clears the unsaved Family changes stored in this browser. The saved Family is unaffected."
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
          )}
        </CardContent>
      </Card>

      <section aria-labelledby="facts-heading" className="space-y-4">
        <div>
          <h2 id="facts-heading" className="text-heading-1 font-semibold text-foreground">
            Facts
          </h2>
          <p className="mt-1 max-w-2xl text-body-sm text-muted-foreground">
            Fact order is deterministic; move with the explicit controls and the server confirms the
            new order before it is shown.
          </p>
        </div>

        {facts.length === 0 ? (
          <EmptyState
            title="No Facts in this Family yet."
            description="Add a Fact to define its structured data and display text."
          />
        ) : (
          <ol className="space-y-2" aria-label="Facts">
            {facts.map((fact, index) => {
              const isSelected = selectedFact?.id === fact.id;
              return (
                <li
                  key={fact.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedFactId(fact.id)}
                    aria-current={isSelected ? 'true' : undefined}
                    className="flex min-w-0 items-center gap-2 rounded-md px-1 py-0.5 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <span className="font-mono text-xs text-muted-foreground">{fact.order}</span>
                    <Badge
                      variant="outline"
                      className="border-border bg-surface-muted text-muted-foreground"
                    >
                      {factTypeLabel(fact)}
                    </Badge>
                    <span className="truncate text-body text-foreground">{fact.factText}</span>
                  </button>
                  {canManageFamily ? (
                    <span className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => void moveFact(index, -1)}
                        disabled={orderPending || index === 0}
                        aria-label={`Move Fact ${fact.factText} up`}
                        title="Move up"
                      >
                        <ArrowUp aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => void moveFact(index, 1)}
                        disabled={orderPending || index === facts.length - 1}
                        aria-label={`Move Fact ${fact.factText} down`}
                        title="Move down"
                      >
                        <ArrowDown aria-hidden="true" />
                      </Button>
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}

        {selectedFact ? (
          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle>
                <h3 className="text-heading-2 font-semibold text-foreground">
                  Fact {selectedFact.order}: {selectedFact.factText}
                </h3>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FactEditor
                key={selectedFact.id}
                fact={selectedFact}
                familyType={detail.type}
                factTypes={factTypes}
                canManageFamily={canManageFamily}
                canVetFact={canVetFact}
                retryDelaysMs={retryDelaysMs}
                onSaved={(updated) =>
                  setFacts((current) =>
                    current.map((entry) => (entry.id === updated.id ? updated : entry)),
                  )
                }
              />
            </CardContent>
          </Card>
        ) : null}

        {canManageFamily ? (
          <FactCreateForm
            familyId={family.id}
            familyType={detail.type}
            factTypes={factTypes}
            canManageFamily={canManageFamily}
            onCreated={(created) => {
              setFacts((current) => [...current, created]);
              setSelectedFactId(created.id);
              setNotice(`Added Fact “${created.factText}”.`);
            }}
          />
        ) : null}
      </section>
    </div>
  );
}
