'use client';

import type { ReactNode } from 'react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Props every field control receives from `FormField`. Spreading these keeps
 * the label association, required semantics, inline error wiring, and
 * help-text wiring identical across every authoring form (D-033).
 */
export interface FieldControlProps {
  id: string;
  name: string;
  'aria-required': boolean;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

interface FormFieldProps {
  id: string;
  label: ReactNode;
  /** Form control name; defaults to the id. */
  name?: string;
  required?: boolean;
  /** Help text rendered below the control and linked via aria-describedby. */
  hint?: ReactNode;
  /** Field-level validation error; rendered below the control and announced. */
  error?: string | null;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}

/**
 * One field anatomy for the whole console: visible label with a required
 * indicator, the control, optional helper text, and an inline field-level
 * error. Errors are placed with the field and never rely on colour alone.
 */
export function FormField({
  id,
  label,
  name,
  required = false,
  hint,
  error,
  className,
  children,
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-1">
        <Label htmlFor={id}>{label}</Label>
        {required ? (
          <span aria-hidden="true" className="text-sm leading-none text-danger">
            *
          </span>
        ) : null}
      </div>
      {children({
        id,
        name: name ?? id,
        'aria-required': required,
        ...(error ? { 'aria-invalid': true as const } : {}),
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      })}
      {hint ? (
        <p id={hintId} className="text-body-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
