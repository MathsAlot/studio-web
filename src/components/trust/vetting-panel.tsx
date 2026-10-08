'use client';

import { useRef, useState } from 'react';
import { Save } from 'lucide-react';

import { ErrorAlert } from '@/components/error-alert';
import { VettingBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import type { VettingStatus } from '@/lib/api-client';
import { VETTING_LABELS, VETTING_STATUSES } from '@/lib/studio/fields';

export interface VettingFieldValues {
  validity: string;
  domain: string;
  edgeCases: string;
}

const EMPTY_VALUES: VettingFieldValues = { validity: '', domain: '', edgeCases: '' };

interface VettingPanelProps {
  /** 'Trick' or 'Fact' — used in headings and copy. */
  entityLabel: string;
  status: VettingStatus;
  /** Present for Tricks; omitted for Facts, which only carry a status. */
  values?: VettingFieldValues;
  canWrite: boolean;
  /** Permission key shown in the read-only notice. */
  permissionKey: string;
  busy: boolean;
  error: string | null;
  onSubmit: (input: { status: VettingStatus; values: VettingFieldValues }) => void;
  idPrefix: string;
}

type FieldErrors = Partial<Record<keyof VettingFieldValues, string>>;

/**
 * Vetting control (D-041). `VERIFIED` requires validity, domain, and edge cases;
 * this form gives immediate, inline feedback when they are missing, while the
 * API remains the enforcer. Facts carry only a status.
 */
export function VettingPanel({
  entityLabel,
  status,
  values,
  canWrite,
  permissionKey,
  busy,
  error,
  onSubmit,
  idPrefix,
}: VettingPanelProps) {
  const [selectedStatus, setSelectedStatus] = useState<VettingStatus>(status);
  const [fields, setFields] = useState<VettingFieldValues>(values ?? EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const validityRef = useRef<HTMLTextAreaElement>(null);
  const domainRef = useRef<HTMLTextAreaElement>(null);
  const edgeCasesRef = useRef<HTMLTextAreaElement>(null);

  const hasFields = values !== undefined;
  const requiresFields = hasFields && selectedStatus === 'VERIFIED';

  function changeField(key: keyof VettingFieldValues, next: string) {
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setFormError(null);
    setFields((current) => ({ ...current, [key]: next }));
  }

  function handleSubmit() {
    if (requiresFields) {
      const next: FieldErrors = {};
      if (fields.validity.trim().length === 0) {
        next.validity = 'Describe the validity check.';
      }
      if (fields.domain.trim().length === 0) {
        next.domain = 'Describe the domain.';
      }
      if (fields.edgeCases.trim().length === 0) {
        next.edgeCases = 'Describe the edge cases.';
      }
      setFieldErrors(next);
      if (Object.keys(next).length > 0) {
        setFormError(
          'Validity, domain, and edge cases are required before this can be marked Verified.',
        );
        // Move focus to the first invalid field so keyboard users can fix it.
        if (next.validity) {
          validityRef.current?.focus();
        } else if (next.domain) {
          domainRef.current?.focus();
        } else {
          edgeCasesRef.current?.focus();
        }
        return;
      }
    }
    setFieldErrors({});
    setFormError(null);
    onSubmit({ status: selectedStatus, values: fields });
  }

  return (
    <Card data-slot="vetting-panel">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>
            <h2 className="text-heading-2 font-semibold text-foreground">Vetting</h2>
          </CardTitle>
          <VettingBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <ErrorAlert title="Could not save vetting">{error}</ErrorAlert> : null}
        {formError ? <ErrorAlert title="Vetting incomplete">{formError}</ErrorAlert> : null}

        {!canWrite ? (
          <p role="status" className="text-body-sm text-muted-foreground">
            Vetting is view-only — you do not hold{' '}
            <code className="font-mono">{permissionKey}</code>.
          </p>
        ) : null}

        <div className="grid max-w-2xl gap-4">
          <FormField
            id={`vetting-status-${idPrefix}`}
            label="Vetting status"
            required
            className="max-w-xs"
            hint={`Set to Verified only once the ${entityLabel.toLowerCase()} has been checked.`}
          >
            {(control) => (
              <NativeSelect
                {...control}
                value={selectedStatus}
                onChange={(event) => {
                  setFormError(null);
                  setSelectedStatus(event.target.value as VettingStatus);
                }}
                disabled={!canWrite}
              >
                {VETTING_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {VETTING_LABELS[option]}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>

          {hasFields ? (
            <>
              <FormField
                id={`vetting-validity-${idPrefix}`}
                label="Validity"
                required={requiresFields}
                error={fieldErrors.validity}
                hint="Why the method is mathematically valid."
              >
                {(control) => (
                  <Textarea
                    {...control}
                    ref={validityRef}
                    value={fields.validity}
                    onChange={(event) => changeField('validity', event.target.value)}
                    disabled={!canWrite}
                    maxLength={8000}
                    rows={2}
                  />
                )}
              </FormField>
              <FormField
                id={`vetting-domain-${idPrefix}`}
                label="Domain"
                required={requiresFields}
                error={fieldErrors.domain}
                hint="The number domain and any constraints the method relies on."
              >
                {(control) => (
                  <Textarea
                    {...control}
                    ref={domainRef}
                    value={fields.domain}
                    onChange={(event) => changeField('domain', event.target.value)}
                    disabled={!canWrite}
                    maxLength={8000}
                    rows={2}
                  />
                )}
              </FormField>
              <FormField
                id={`vetting-edge-${idPrefix}`}
                label="Edge cases"
                required={requiresFields}
                error={fieldErrors.edgeCases}
                hint="Edge cases that were checked, e.g. zero, carrying, or boundaries."
              >
                {(control) => (
                  <Textarea
                    {...control}
                    ref={edgeCasesRef}
                    value={fields.edgeCases}
                    onChange={(event) => changeField('edgeCases', event.target.value)}
                    disabled={!canWrite}
                    maxLength={8000}
                    rows={2}
                  />
                )}
              </FormField>
            </>
          ) : null}
        </div>

        {canWrite ? (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            aria-busy={busy}
            data-action="save-vetting"
          >
            <Save aria-hidden="true" />
            Save vetting
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
