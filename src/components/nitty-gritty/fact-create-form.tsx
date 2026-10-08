'use client';

import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';

import { ErrorAlert } from '@/components/error-alert';
import { FactDataEditor } from '@/components/nitty-gritty/fact-data-editor';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import type { FactDetail, FactType, FactTypeMetadata, FamilyType } from '@/lib/api-client';
import { createFact } from '@/lib/client/studio';
import { FACT_TYPE_LABELS, isFactType } from '@/lib/studio/fields';
import {
  createFactInputFromForm,
  factFormForType,
  hasFactFormErrors,
  validateFactForm,
  type FactForm,
  type FactFormErrors,
} from '@/lib/studio/nitty-gritty';

interface FactCreateFormProps {
  familyId: string;
  familyType: FamilyType;
  factTypes: FactTypeMetadata[];
  canManageFamily: boolean;
  onCreated: (fact: FactDetail) => void;
}

/**
 * Create a Fact at the next order. Not a draft target: the form holds its input
 * in component state and only clears it after a confirmed 201, so a failed
 * create loses nothing. The server assigns order and writes the first snapshot.
 */
export function FactCreateForm({
  familyId,
  familyType,
  factTypes,
  canManageFamily,
  onCreated,
}: FactCreateFormProps) {
  const [form, setForm] = useState<FactForm>(() => factFormForType('operation', factTypes));
  const [errors, setErrors] = useState<FactFormErrors>({ data: {} });
  const [creating, setCreating] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  if (!canManageFamily) {
    return (
      <p role="status" className="text-body-sm text-muted-foreground">
        Read-only: you do not hold <code className="font-mono">family.manage</code>.
      </p>
    );
  }

  const metadata = factTypes.find((entry) => entry.type === form.factType);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateFactForm(form, familyType, metadata);
    setErrors(nextErrors);
    if (hasFactFormErrors(nextErrors)) {
      return;
    }
    setCreating(true);
    setServerError(null);
    const result = await createFact(familyId, createFactInputFromForm(form, familyType, factTypes));
    setCreating(false);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    setForm(factFormForType(form.factType, factTypes));
    setErrors({ data: {} });
    onCreated(result.data);
  }

  function changeType(nextType: FactType) {
    setErrors({ data: {} });
    setForm(factFormForType(nextType, factTypes));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3 id="create-fact-heading" className="text-heading-2 font-semibold text-foreground">
            Add a Fact
          </h3>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          aria-labelledby="create-fact-heading"
          autoComplete="off"
          noValidate
          className="space-y-4"
        >
          {serverError ? (
            <ErrorAlert title="Could not create the Fact">{serverError}</ErrorAlert>
          ) : null}

          <div className="grid max-w-2xl gap-4">
            <FormField
              id="new-fact-type"
              label="Fact type"
              required
              className="max-w-xs"
              hint="Structured fields follow the selected type."
            >
              {(control) => (
                <NativeSelect
                  {...control}
                  value={form.factType}
                  onChange={(event) => {
                    if (isFactType(event.target.value)) {
                      changeType(event.target.value);
                    }
                  }}
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
              factType={form.factType}
              factTypes={factTypes}
              value={form.data}
              onChange={(data) => {
                setErrors({ data: {} });
                setForm((current) => ({ ...current, data }));
              }}
              errors={errors.data}
              idPrefix="new-fact"
            />

            <FormField
              id="new-fact-text"
              label="Display text"
              required
              error={errors.factText}
              hint="Human label shown in the Studio."
            >
              {(control) => (
                <Input
                  {...control}
                  value={form.factText}
                  onChange={(event) => {
                    setErrors((current) => ({ ...current, factText: undefined }));
                    setForm((current) => ({ ...current, factText: event.target.value }));
                  }}
                  maxLength={1000}
                />
              )}
            </FormField>

            <FormField id="new-fact-gating" label="Gating required">
              {(control) => (
                <Switch
                  {...control}
                  checked={form.gatingRequired}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, gatingRequired: checked }))
                  }
                />
              )}
            </FormField>

            {familyType === 'WORLD_BOUND' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id="new-fact-range-min"
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
                      value={form.numberRangeMin}
                      onChange={(event) => {
                        setErrors((current) => ({ ...current, numberRange: undefined }));
                        setForm((current) => ({ ...current, numberRangeMin: event.target.value }));
                      }}
                    />
                  )}
                </FormField>
                <FormField
                  id="new-fact-range-max"
                  label="Number range maximum"
                  required
                  className="max-w-xs"
                >
                  {(control) => (
                    <Input
                      {...control}
                      type="number"
                      inputMode="numeric"
                      value={form.numberRangeMax}
                      onChange={(event) => {
                        setErrors((current) => ({ ...current, numberRange: undefined }));
                        setForm((current) => ({ ...current, numberRangeMax: event.target.value }));
                      }}
                    />
                  )}
                </FormField>
              </div>
            ) : null}
          </div>

          <Button type="submit" disabled={creating} aria-busy={creating}>
            <Plus aria-hidden="true" />
            {creating ? 'Creating…' : 'Create Fact'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
