import type {
  CreateFactInput,
  CreateFamilyInput,
  FactDetail,
  FactFieldMetadata,
  FactType,
  FactTypeMetadata,
  FamilyDetail,
  FamilyType,
  UpdateFactInput,
  UpdateFamilyInput,
} from '@/lib/api-client';

/**
 * Form models + pure mapping for Nitty Gritty authoring. These are UI shapes
 * (numbers and arrays held as editable text so partial input survives), never
 * API contracts: every payload is built from the generated input types and the
 * server remains the validator of record.
 */

export interface FamilyForm {
  name: string;
  type: FamilyType;
  boundWorldId: string;
  triggerWorldId: string;
  recurrenceInitialInterval: string;
  recurrenceGrowthFactor: string;
  instantRecallThresholdMs: string;
}

export interface FamilyFormErrors {
  name?: string;
  boundWorldId?: string;
  triggerWorldId?: string;
  recurrenceInitialInterval?: string;
  recurrenceGrowthFactor?: string;
  instantRecallThresholdMs?: string;
}

export interface FactForm {
  factType: FactType;
  /** Raw per-field text: numbers as typed, `string[]` as newline-separated. */
  data: Record<string, string>;
  factText: string;
  gatingRequired: boolean;
  numberRangeMin: string;
  numberRangeMax: string;
}

export interface FactFormErrors {
  factText?: string;
  data: Record<string, string>;
  numberRange?: string;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/* ------------------------------- Family ------------------------------- */

export function familyFormFromDetail(detail: FamilyDetail): FamilyForm {
  return {
    name: detail.name,
    type: detail.type,
    boundWorldId: detail.boundWorldId ?? '',
    triggerWorldId: detail.triggerWorldId ?? '',
    recurrenceInitialInterval: String(detail.recurrenceInitialInterval),
    recurrenceGrowthFactor: String(detail.recurrenceGrowthFactor),
    instantRecallThresholdMs: String(detail.instantRecallThresholdMs),
  };
}

export function blankFamilyForm(): FamilyForm {
  return {
    name: '',
    type: 'WORLD_BOUND',
    boundWorldId: '',
    triggerWorldId: '',
    recurrenceInitialInterval: '3',
    recurrenceGrowthFactor: '2',
    instantRecallThresholdMs: '2000',
  };
}

function isPositiveIntegerText(value: string): boolean {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
}

function isPositiveNumberText(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && value.trim().length > 0;
}

export function validateFamilyForm(form: FamilyForm): FamilyFormErrors {
  const errors: FamilyFormErrors = {};
  if (form.name.trim().length === 0) {
    errors.name = 'Enter a Family name.';
  }
  if (form.type === 'WORLD_BOUND' && form.boundWorldId.trim().length === 0) {
    errors.boundWorldId = 'Select the World this Family is bound to.';
  }
  if (form.type === 'GLOBAL' && form.triggerWorldId.trim().length === 0) {
    errors.triggerWorldId = 'Select the World that triggers this Family.';
  }
  if (!isPositiveIntegerText(form.recurrenceInitialInterval)) {
    errors.recurrenceInitialInterval = 'Enter a positive whole number.';
  }
  if (!isPositiveNumberText(form.recurrenceGrowthFactor)) {
    errors.recurrenceGrowthFactor = 'Enter a number greater than zero.';
  }
  if (!isPositiveIntegerText(form.instantRecallThresholdMs)) {
    errors.instantRecallThresholdMs = 'Enter a positive whole number of milliseconds.';
  }
  return errors;
}

function familyBindingFields(
  form: FamilyForm,
): Pick<UpdateFamilyInput, 'boundWorldId' | 'triggerWorldId'> {
  return form.type === 'WORLD_BOUND'
    ? { boundWorldId: emptyToNull(form.boundWorldId), triggerWorldId: null }
    : { boundWorldId: null, triggerWorldId: emptyToNull(form.triggerWorldId) };
}

export function createFamilyInputFromForm(form: FamilyForm): CreateFamilyInput {
  return {
    name: form.name.trim(),
    type: form.type,
    ...familyBindingFields(form),
    recurrenceInitialInterval: Number(form.recurrenceInitialInterval),
    recurrenceGrowthFactor: Number(form.recurrenceGrowthFactor),
    instantRecallThresholdMs: Number(form.instantRecallThresholdMs),
  };
}

export function updateFamilyInputFromForm(form: FamilyForm): UpdateFamilyInput {
  return createFamilyInputFromForm(form);
}

/* -------------------------------- Fact -------------------------------- */

function rawFieldValue(value: unknown, field: FactFieldMetadata): string {
  if (field.type === 'string[]') {
    return Array.isArray(value)
      ? value.filter((entry): entry is string => typeof entry === 'string').join('\n')
      : '';
  }
  if (field.type === 'number') {
    return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
  }
  return typeof value === 'string' ? value : '';
}

function metadataFor(
  factType: FactType,
  factTypes: FactTypeMetadata[],
): FactTypeMetadata | undefined {
  return factTypes.find((entry) => entry.type === factType);
}

export function factFormFromDetail(fact: FactDetail, factTypes: FactTypeMetadata[]): FactForm {
  const metadata = metadataFor(fact.factType, factTypes);
  const formData: Record<string, string> = {};
  for (const field of metadata?.fields ?? []) {
    formData[field.name] = rawFieldValue(fact.data[field.name], field);
  }
  return {
    factType: fact.factType,
    data: formData,
    factText: fact.factText,
    gatingRequired: fact.gatingRequired,
    numberRangeMin: fact.numberRangeMin === null ? '' : String(fact.numberRangeMin),
    numberRangeMax: fact.numberRangeMax === null ? '' : String(fact.numberRangeMax),
  };
}

/** Reset the raw data when the selected `factType` changes. */
export function factFormForType(factType: FactType, factTypes: FactTypeMetadata[]): FactForm {
  const metadata = metadataFor(factType, factTypes);
  const data: Record<string, string> = {};
  for (const field of metadata?.fields ?? []) {
    data[field.name] = '';
  }
  return {
    factType,
    data,
    factText: '',
    gatingRequired: false,
    numberRangeMin: '',
    numberRangeMax: '',
  };
}

export function buildFactData(
  form: FactForm,
  metadata: FactTypeMetadata | undefined,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of metadata?.fields ?? []) {
    const raw = form.data[field.name] ?? '';
    if (field.type === 'number') {
      result[field.name] = Number(raw);
    } else if (field.type === 'string[]') {
      result[field.name] = raw
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    } else {
      result[field.name] = raw;
    }
  }
  return result;
}

export function validateFactForm(
  form: FactForm,
  familyType: FamilyType,
  metadata: FactTypeMetadata | undefined,
): FactFormErrors {
  const errors: FactFormErrors = { data: {} };
  if (form.factText.trim().length === 0) {
    errors.factText = 'Enter the display text for this Fact.';
  }
  for (const field of metadata?.fields ?? []) {
    if (!field.required) {
      continue;
    }
    const raw = form.data[field.name] ?? '';
    if (field.type === 'number') {
      if (raw.trim().length === 0 || !Number.isFinite(Number(raw))) {
        errors.data[field.name] = `Enter a number for ${field.description || field.name}.`;
      }
    } else if (field.type === 'string[]') {
      const entries = raw
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      if (entries.length === 0) {
        errors.data[field.name] = 'Enter at least one entry, one per line.';
      }
    } else if (raw.trim().length === 0) {
      errors.data[field.name] = `Enter a value for ${field.description || field.name}.`;
    }
  }
  if (familyType === 'WORLD_BOUND') {
    const min = Number(form.numberRangeMin);
    const max = Number(form.numberRangeMax);
    if (form.numberRangeMin.trim().length === 0 || !Number.isFinite(min)) {
      errors.numberRange = 'Enter a number for the minimum.';
    } else if (form.numberRangeMax.trim().length === 0 || !Number.isFinite(max)) {
      errors.numberRange = 'Enter a number for the maximum.';
    } else if (min > max) {
      errors.numberRange = 'The minimum must be less than or equal to the maximum.';
    }
  }
  return errors;
}

export function hasFactFormErrors(errors: FactFormErrors): boolean {
  return (
    errors.factText !== undefined ||
    errors.numberRange !== undefined ||
    Object.keys(errors.data).length > 0
  );
}

function rangePayload(
  form: FactForm,
  familyType: FamilyType,
): { numberRangeMin: number | null; numberRangeMax: number | null } {
  if (familyType !== 'WORLD_BOUND') {
    return { numberRangeMin: null, numberRangeMax: null };
  }
  return {
    numberRangeMin: form.numberRangeMin.trim().length === 0 ? null : Number(form.numberRangeMin),
    numberRangeMax: form.numberRangeMax.trim().length === 0 ? null : Number(form.numberRangeMax),
  };
}

export function createFactInputFromForm(
  form: FactForm,
  familyType: FamilyType,
  factTypes: FactTypeMetadata[],
): CreateFactInput {
  return {
    factType: form.factType,
    data: buildFactData(form, metadataFor(form.factType, factTypes)),
    factText: form.factText.trim(),
    gatingRequired: form.gatingRequired,
    draftSource: 'HUMAN',
    ...rangePayload(form, familyType),
  };
}

export function updateFactInputFromForm(
  form: FactForm,
  familyType: FamilyType,
  factTypes: FactTypeMetadata[],
): UpdateFactInput {
  return {
    factType: form.factType,
    data: buildFactData(form, metadataFor(form.factType, factTypes)),
    factText: form.factText.trim(),
    gatingRequired: form.gatingRequired,
    ...rangePayload(form, familyType),
  };
}

/* ------------------------------- Dates ------------------------------- */

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    date,
  );
}
