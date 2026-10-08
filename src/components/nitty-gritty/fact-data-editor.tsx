'use client';

import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { FactType, FactTypeMetadata } from '@/lib/api-client';

interface FactDataEditorProps {
  factType: FactType;
  factTypes: FactTypeMetadata[];
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  errors: Record<string, string>;
  disabled?: boolean;
  /** Stable prefix so multiple editors on one page keep unique control ids. */
  idPrefix: string;
}

/**
 * Structured `data` editor driven by the server's `factType` registry metadata
 * (D-036): the fields shown for a Fact follow the selected type, so the client
 * never hard-codes a schema. Numbers are typed as text and arrays as one entry
 * per line; the payload is assembled on save and validated by the server.
 */
export function FactDataEditor({
  factType,
  factTypes,
  value,
  onChange,
  errors,
  disabled = false,
  idPrefix,
}: FactDataEditorProps) {
  const metadata = factTypes.find((entry) => entry.type === factType);

  if (!metadata) {
    return (
      <p role="status" className="text-body-sm text-muted-foreground">
        Structured fields for <code className="font-mono">{factType}</code> are unavailable. Reload
        the page to refresh the Fact type registry.
      </p>
    );
  }

  function setField(name: string, next: string) {
    onChange({ ...value, [name]: next });
  }

  return (
    <div className="grid gap-4">
      {metadata.fields.map((field) => {
        const fieldId = `${idPrefix}-${field.name}`;
        const error = errors[field.name] ?? null;
        const fieldValue = value[field.name] ?? '';

        if (field.type === 'string[]') {
          return (
            <FormField
              key={field.name}
              id={fieldId}
              label={field.name}
              required={field.required}
              hint={`${field.description} One entry per line.`}
              error={error}
            >
              {(control) => (
                <Textarea
                  {...control}
                  value={fieldValue}
                  onChange={(event) => setField(field.name, event.target.value)}
                  disabled={disabled}
                  rows={3}
                  spellCheck={false}
                />
              )}
            </FormField>
          );
        }

        return (
          <FormField
            key={field.name}
            id={fieldId}
            label={field.name}
            required={field.required}
            hint={field.description}
            error={error}
            className="max-w-xs"
          >
            {(control) => (
              <Input
                {...control}
                type={field.type === 'number' ? 'number' : 'text'}
                inputMode={field.type === 'number' ? 'decimal' : undefined}
                step={field.type === 'number' ? 'any' : undefined}
                value={fieldValue}
                onChange={(event) => setField(field.name, event.target.value)}
                disabled={disabled}
                spellCheck={false}
              />
            )}
          </FormField>
        );
      })}
    </div>
  );
}
