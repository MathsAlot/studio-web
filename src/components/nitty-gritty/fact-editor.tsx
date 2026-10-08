'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { DraftStatusView } from '@/components/draft-status';
import { ErrorAlert } from '@/components/error-alert';
import { FactDataEditor } from '@/components/nitty-gritty/fact-data-editor';
import { FactTrustPanel } from '@/components/trust/fact-trust-panel';
import { FormActions } from '@/components/form-actions';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import type { FactDetail, FactType, FactTypeMetadata, FamilyType } from '@/lib/api-client';
import { updateFact } from '@/lib/client/studio';
import { DRAFT_KEYS } from '@/lib/client/draft-store';
import { useDraft } from '@/lib/client/use-draft';
import { FACT_TYPE_LABELS, isFactType } from '@/lib/studio/fields';
import {
  factFormForType,
  factFormFromDetail,
  hasFactFormErrors,
  updateFactInputFromForm,
  validateFactForm,
  type FactForm,
  type FactFormErrors,
} from '@/lib/studio/nitty-gritty';

interface FactEditorProps {
  fact: FactDetail;
  familyType: FamilyType;
  factTypes: FactTypeMetadata[];
  canManageFamily: boolean;
  /** Phase 05: grants fact.vetting.write; defaults to view-only. */
  canVetFact?: boolean;
  retryDelaysMs?: number[];
  onSaved: (fact: FactDetail) => void;
}

/**
 * One Fact within a Family: `factType`, a registry-driven structured `data`
 * editor, `factText`, gating, and (WORLD_BOUND only) a number range. The local
 * draft survives a failed save; the server validates `data` against the type
 * and its message is surfaced without discarding input.
 */
export function FactEditor({
  fact,
  familyType,
  factTypes,
  canManageFamily,
  canVetFact = false,
  retryDelaysMs,
  onSaved,
}: FactEditorProps) {
  const [initial] = useState<FactForm>(() => factFormFromDetail(fact, factTypes));
  const [errors, setErrors] = useState<FactFormErrors>({ data: {} });
  const [live, setLive] = useState<FactDetail>(fact);

  useEffect(() => {
    setLive(fact);
  }, [fact.id, fact.updatedAt]);

  const draft = useDraft<FactForm, FactForm>({
    storageKey: DRAFT_KEYS.fact(fact.id),
    serverValue: initial,
    toValue: (value) => value,
    retryDelaysMs,
    persist: async (value) => {
      const result = await updateFact(
        fact.id,
        updateFactInputFromForm(value, familyType, factTypes),
      );
      if (!result.ok) {
        throw new Error(result.message);
      }
      onSaved(result.data);
    },
  });

  const metadata = factTypes.find((entry) => entry.type === draft.value.factType);
  const readOnly = !canManageFamily;

  function handleSave() {
    const nextErrors = validateFactForm(draft.value, familyType, metadata);
    setErrors(nextErrors);
    if (hasFactFormErrors(nextErrors)) {
      return;
    }
    draft.save();
  }

  function changeType(nextType: FactType) {
    setErrors({ data: {} });
    draft.setValue((current) => {
      const reset = factFormForType(nextType, factTypes);
      return {
        ...reset,
        factText: current.factText,
        gatingRequired: current.gatingRequired,
        numberRangeMin: current.numberRangeMin,
        numberRangeMax: current.numberRangeMax,
      };
    });
  }

  function handleFactChange(updated: FactDetail) {
    setLive(updated);
    onSaved(updated);
  }

  return (
    <div className="space-y-4 rounded-md border border-border bg-surface p-4">
      {!fact.validation.valid ? (
        <ErrorAlert title="Stored data fails validation">
          {fact.validation.errors.length > 0
            ? fact.validation.errors.join(' ')
            : 'The stored structured data does not match its Fact type.'}
        </ErrorAlert>
      ) : null}

      <div className="grid max-w-2xl gap-4">
        <FormField
          id={`fact-type-${fact.id}`}
          label="Fact type"
          required
          hint="Fields below follow the selected type; changing it resets the structured data."
          className="max-w-xs"
        >
          {(control) => (
            <NativeSelect
              {...control}
              value={draft.value.factType}
              onChange={(event) => {
                if (isFactType(event.target.value)) {
                  changeType(event.target.value);
                }
              }}
              disabled={readOnly}
            >
              {factTypes.map((entry) => (
                <option key={entry.type} value={entry.type}>
                  {isFactType(entry.type) ? FACT_TYPE_LABELS[entry.type] : entry.type}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>

        <FactDataEditor
          factType={draft.value.factType}
          factTypes={factTypes}
          value={draft.value.data}
          onChange={(data) => {
            setErrors({ data: {} });
            draft.setValue((current) => ({ ...current, data }));
          }}
          errors={errors.data}
          disabled={readOnly}
          idPrefix={`fact-${fact.id}`}
        />

        <FormField
          id={`fact-text-${fact.id}`}
          label="Display text"
          required
          error={errors.factText}
          hint="Human label shown in the Studio; it never replaces validation."
        >
          {(control) => (
            <Input
              {...control}
              value={draft.value.factText}
              onChange={(event) => {
                setErrors((current) => ({ ...current, factText: undefined }));
                draft.setValue((current) => ({ ...current, factText: event.target.value }));
              }}
              disabled={readOnly}
              maxLength={1000}
            />
          )}
        </FormField>

        <FormField
          id={`fact-gating-${fact.id}`}
          label="Gating required"
          hint="When on, the learner must answer this Fact correctly before progressing."
        >
          {(control) => (
            <Switch
              {...control}
              checked={draft.value.gatingRequired}
              onCheckedChange={(checked) =>
                draft.setValue((current) => ({ ...current, gatingRequired: checked }))
              }
              disabled={readOnly}
            />
          )}
        </FormField>

        {familyType === 'WORLD_BOUND' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id={`fact-range-min-${fact.id}`}
              label="Number range minimum"
              required
              error={errors.numberRange}
              className="max-w-xs"
            >
              {(control) => (
                <Input
                  {...control}
                  type="number"
                  inputMode="numeric"
                  value={draft.value.numberRangeMin}
                  onChange={(event) => {
                    setErrors((current) => ({ ...current, numberRange: undefined }));
                    draft.setValue((current) => ({
                      ...current,
                      numberRangeMin: event.target.value,
                    }));
                  }}
                  disabled={readOnly}
                />
              )}
            </FormField>
            <FormField
              id={`fact-range-max-${fact.id}`}
              label="Number range maximum"
              required
              className="max-w-xs"
            >
              {(control) => (
                <Input
                  {...control}
                  type="number"
                  inputMode="numeric"
                  value={draft.value.numberRangeMax}
                  onChange={(event) => {
                    setErrors((current) => ({ ...current, numberRange: undefined }));
                    draft.setValue((current) => ({
                      ...current,
                      numberRangeMax: event.target.value,
                    }));
                  }}
                  disabled={readOnly}
                />
              )}
            </FormField>
          </div>
        ) : (
          <p className="text-body-sm text-muted-foreground">
            Global Families never set a number range on Facts.
          </p>
        )}
      </div>

      {readOnly ? (
        <p role="status" className="text-body-sm text-muted-foreground">
          Read-only: you do not hold <code className="font-mono">family.manage</code>.
        </p>
      ) : (
        <FormActions>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!draft.isDirty || draft.status === 'saving'}
            aria-busy={draft.status === 'saving'}
          >
            <Save aria-hidden="true" />
            Save Fact
          </Button>
          <ConfirmDialog
            title="Discard local draft?"
            description="This clears the unsaved Fact changes stored in this browser. The saved Fact is unaffected."
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

      <FactTrustPanel
        fact={live}
        canVetFact={canVetFact}
        canManageFamily={canManageFamily}
        onFactChange={handleFactChange}
      />
    </div>
  );
}
