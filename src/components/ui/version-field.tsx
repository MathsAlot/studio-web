'use client';

import type { Ref } from 'react';

import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

/** Schema-valid Curriculum versions: `v` followed by a whole number of 1+. */
export const VERSION_PATTERN = /^v[1-9]\d{0,3}$/;

const NUMERIC_VERSION = /^v\d+$/;

export function versionError(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'Enter a version.';
  }
  if (!VERSION_PATTERN.test(trimmed)) {
    return 'Use a whole number of 1 or more, for example v1.';
  }
  return null;
}

/** True when the stored value is already in the structured `vN` shape. */
export function isNumericVersion(value: string): boolean {
  return value.trim().length === 0 || NUMERIC_VERSION.test(value.trim());
}

/** The digits shown next to the fixed `v` prefix. Legacy values pass through. */
export function versionDigits(value: string): string {
  const match = /^v(\d+)$/.exec(value.trim());
  return match ? (match[1] ?? '') : value.trim();
}

function toVersion(raw: string, numericMode: boolean): string | null {
  const stripped = raw.replace(/^\s*v\s*/i, '').trim();
  if (stripped.length === 0) {
    return '';
  }
  if (/^\d+$/.test(stripped)) {
    return `v${stripped.replace(/^0+(?=\d)/, '')}`;
  }
  // Legacy edits are preserved as typed (the prefix is hidden in this mode), so
  // a stored non-numeric value is never doubled into `v<value>`.
  return numericMode ? null : raw.trim();
}

interface VersionFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string | null;
  inputRef?: Ref<HTMLInputElement>;
  hint?: string;
}

/**
 * Structured Curriculum version control (D-033): a numeric input with a fixed
 * `v` prefix. Still submits the plain `vN` string the schema expects. Any
 * legacy non-numeric stored value is shown as-is with the prefix hidden, so it
 * is neither doubled nor uneditable.
 */
export function VersionField({
  id,
  value,
  onChange,
  disabled = false,
  required = true,
  error = null,
  inputRef,
  hint = 'Whole number only. Saved as v1, v2, and so on.',
}: VersionFieldProps) {
  const numericMode = isNumericVersion(value);

  return (
    <FormField id={id} label="Version" required={required} hint={hint} error={error}>
      {(control) => (
        <div className="relative">
          {numericMode ? (
            <span
              aria-hidden="true"
              data-testid="version-prefix"
              className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground"
            >
              v
            </span>
          ) : null}
          <Input
            {...control}
            ref={inputRef}
            type="text"
            inputMode={numericMode ? 'numeric' : 'text'}
            pattern={numericMode ? '[0-9]*' : undefined}
            autoComplete="off"
            spellCheck={false}
            className={numericMode ? 'pl-6' : undefined}
            value={versionDigits(value)}
            disabled={disabled}
            onChange={(event) => {
              const next = toVersion(event.target.value, numericMode);
              if (next !== null) {
                onChange(next);
              }
            }}
          />
        </div>
      )}
    </FormField>
  );
}
