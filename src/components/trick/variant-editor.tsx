'use client';

import { useEffect, useRef, useState } from 'react';
import { Save, TriangleAlert } from 'lucide-react';

import { DraftStatusView } from '@/components/draft-status';
import { FormActions } from '@/components/form-actions';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import type { AgeTier, TrickDetail, TrickVariant } from '@/lib/api-client';
import { upsertVariant } from '@/lib/client/studio';
import { DRAFT_KEYS } from '@/lib/client/draft-store';
import { useDraft } from '@/lib/client/use-draft';
import {
  AGE_TIERS,
  READING_LEVELS,
  TIER_LABELS,
  asText,
  toNullableText,
} from '@/lib/studio/fields';
import { useRegisterDraftSection } from './draft-registry';

interface VariantEditorProps {
  trick: TrickDetail;
  ageTier: AgeTier;
  canWriteContent: boolean;
  /** Reveal this tier (e.g. when a nested tab hosts the invalid field). */
  onReveal?: () => void;
}

interface VariantForm {
  wording: string;
  scenario: string;
  readingLevel: string;
}

function toForm(variant: TrickVariant | undefined): VariantForm {
  return {
    wording: asText(variant?.wording),
    scenario: asText(variant?.scenario),
    readingLevel: asText(variant?.readingLevel),
  };
}

/**
 * Editor for one age-tier content variant with per-tier draft preservation.
 * Inside the Trick editor it registers with the shared draft registry so the
 * single action bar saves it; rendered standalone it keeps its own controls.
 */
export function VariantEditor({ trick, ageTier, canWriteContent, onReveal }: VariantEditorProps) {
  const existing = trick.variants.find((variant) => variant.ageTier === ageTier);
  const missing = trick.completeness.missingTiers.includes(ageTier);

  const draft = useDraft<VariantForm, VariantForm>({
    storageKey: DRAFT_KEYS.variant(trick.id, ageTier),
    serverValue: toForm(existing),
    toValue: (value) => value,
    persist: async (value) => {
      const result = await upsertVariant(trick.id, ageTier, {
        wording: value.wording,
        scenario: value.scenario,
        readingLevel: toNullableText(value.readingLevel),
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
    },
  });

  const readingLevel = draft.value.readingLevel;
  const knownReadingLevel = READING_LEVELS.some((option) => option.value === readingLevel);
  const wordingRef = useRef<HTMLTextAreaElement>(null);
  const scenarioRef = useRef<HTMLTextAreaElement>(null);
  const [errors, setErrors] = useState<{ wording?: string; scenario?: string }>({});
  const [pendingFocus, setPendingFocus] = useState<HTMLTextAreaElement | null>(null);

  // The field may live in a hidden age-tier panel. Reveal it, then focus once
  // the panel is visible (F-09): focusing a hidden control silently no-ops.
  useEffect(() => {
    if (!pendingFocus) {
      return;
    }
    pendingFocus.focus();
    setPendingFocus(null);
  }, [pendingFocus]);

  function validate(): boolean {
    const wordingError =
      draft.value.wording.trim().length === 0 ? 'Enter the tier wording.' : undefined;
    const scenarioError =
      draft.value.scenario.trim().length === 0 ? 'Enter the tier scenario.' : undefined;
    setErrors({ wording: wordingError, scenario: scenarioError });
    return !wordingError && !scenarioError;
  }

  function focusFirstInvalid() {
    const target =
      draft.value.wording.trim().length === 0 ? wordingRef.current : scenarioRef.current;
    if (!target) {
      return;
    }
    if (target.closest('[hidden]')) {
      onReveal?.();
      setPendingFocus(target);
      return;
    }
    target.focus();
  }

  /** Standalone save (own button): validate, focus if invalid, else persist. */
  function handleSave(): boolean {
    if (!validate()) {
      focusFirstInvalid();
      return false;
    }
    draft.save();
    return true;
  }

  const embedded = useRegisterDraftSection({
    id: `variant-${ageTier}`,
    label: `${TIER_LABELS[ageTier]} content`,
    order: 2 + AGE_TIERS.indexOf(ageTier),
    tab: 'content',
    isDirty: draft.isDirty,
    status: draft.status,
    error: draft.error,
    restored: draft.restored,
    save: () => {
      if (!validate()) {
        return false;
      }
      draft.save();
      return true;
    },
    focusFirstInvalid,
    discard: draft.discard,
  });

  return (
    <div className="space-y-4">
      {missing ? (
        <p
          role="status"
          className="flex items-center gap-2 text-body-sm font-medium text-warning-foreground"
        >
          <TriangleAlert aria-hidden="true" className="size-4" />
          This tier is missing. Save it to complete the Trick.
        </p>
      ) : null}

      <div className="grid max-w-2xl gap-4">
        <FormField
          id={`wording-${ageTier}`}
          label="Wording"
          required
          error={errors.wording}
          hint="The wording the learner reads for this age tier."
        >
          {(control) => (
            <Textarea
              {...control}
              ref={wordingRef}
              value={draft.value.wording}
              placeholder="Age-appropriate wording."
              onChange={(event) => {
                setErrors((current) => ({ ...current, wording: undefined }));
                draft.setValue((current) => ({ ...current, wording: event.target.value }));
              }}
              disabled={!canWriteContent}
              maxLength={8000}
              rows={3}
            />
          )}
        </FormField>
        <FormField
          id={`scenario-${ageTier}`}
          label="Scenario"
          required
          error={errors.scenario}
          hint="The situation that frames the Trick for this tier."
        >
          {(control) => (
            <Textarea
              {...control}
              ref={scenarioRef}
              value={draft.value.scenario}
              placeholder="Describe the scenario."
              onChange={(event) => {
                setErrors((current) => ({ ...current, scenario: undefined }));
                draft.setValue((current) => ({ ...current, scenario: event.target.value }));
              }}
              disabled={!canWriteContent}
              maxLength={8000}
              rows={3}
            />
          )}
        </FormField>
        <FormField
          id={`reading-level-${ageTier}`}
          label="Reading level"
          hint="Optional grade band for this tier."
          className="max-w-sm"
        >
          {(control) => (
            <NativeSelect
              {...control}
              value={readingLevel}
              onChange={(event) =>
                draft.setValue((current) => ({ ...current, readingLevel: event.target.value }))
              }
              disabled={!canWriteContent}
            >
              <option value="">Not set</option>
              {READING_LEVELS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              {!knownReadingLevel && readingLevel.length > 0 ? (
                <option value={readingLevel}>{readingLevel} (existing)</option>
              ) : null}
            </NativeSelect>
          )}
        </FormField>
      </div>

      {!embedded && canWriteContent ? (
        <FormActions>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!draft.isDirty || draft.status === 'saving'}
            aria-busy={draft.status === 'saving'}
          >
            <Save aria-hidden="true" />
            Save tier
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={draft.discard}
            disabled={!draft.isDirty && !draft.restored}
          >
            Discard local draft
          </Button>
          <DraftStatusView
            status={draft.status}
            error={draft.error}
            isDirty={draft.isDirty}
            restored={draft.restored}
          />
        </FormActions>
      ) : null}

      {!embedded && !canWriteContent ? (
        <p role="status" className="text-body-sm text-muted-foreground">
          Read-only: you do not hold <code className="font-mono">trick.content.write</code>.
        </p>
      ) : null}
    </div>
  );
}
