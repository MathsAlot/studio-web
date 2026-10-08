import type {
  ContentStatus,
  CreateCommentInput,
  CreateCurriculumInput,
  CreateFactInput,
  CreateFamilyInput,
  CreateSequenceInput,
  CreateTrickInput,
  CreateWorldInput,
  SequenceRole,
  SequenceTrickAssignment,
  SetFactVettingInput,
  SetInsertionsInput,
  SetReviewInput,
  SetSequenceTricksInput,
  SetTrickVettingInput,
  TrickKind,
  UpdateCommentInput,
  UpdateCurriculumInput,
  UpdateFactInput,
  UpdateFamilyInput,
  UpdateSequenceInput,
  UpdateTrickInput,
  UpdateWorldInput,
  UpsertVariantInput,
} from '@/lib/api-client';
import {
  isCommentStatus,
  isContentStatus,
  isFactType,
  isFamilyType,
  isInsertionType,
  isReviewStatus,
  isSequenceRole,
  isVettingStatus,
} from './fields';

/**
 * Minimal parsers for BFF request bodies. They guarantee the shape the typed
 * client expects; the API remains responsible for all business validation.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function parseCreateWorld(payload: unknown): CreateWorldInput | null {
  if (!isRecord(payload)) {
    return null;
  }
  const name = optionalString(payload.name);
  if (name === undefined || name.trim().length === 0) {
    return null;
  }
  const input: CreateWorldInput = { name };
  const description = optionalString(payload.description);
  if (description !== undefined) {
    input.description = description;
  }
  return input;
}

export function parseUpdateWorld(payload: unknown): UpdateWorldInput | null {
  if (!isRecord(payload)) {
    return null;
  }
  const input: UpdateWorldInput = {};
  const name = optionalString(payload.name);
  if (name !== undefined) {
    input.name = name;
  }
  if (payload.description === null) {
    input.description = null;
  } else {
    const description = optionalString(payload.description);
    if (description !== undefined) {
      input.description = description;
    }
  }
  return input;
}

export function parseReorder(payload: unknown): string[] | null {
  if (!isRecord(payload) || !Array.isArray(payload.orderedIds)) {
    return null;
  }
  const ids = payload.orderedIds;
  if (!ids.every((id): id is string => typeof id === 'string' && id.length > 0)) {
    return null;
  }
  return ids;
}

export function parseCreateTrick(payload: unknown): CreateTrickInput | null {
  if (!isRecord(payload)) {
    return null;
  }
  const name = optionalString(payload.name);
  const methodDescription = optionalString(payload.methodDescription);
  if (name === undefined || name.trim().length === 0) {
    return null;
  }
  if (methodDescription === undefined || methodDescription.trim().length === 0) {
    return null;
  }
  const requestedKind = optionalString(payload.kind);
  const input: CreateTrickInput = {
    name,
    methodDescription,
    kind: (requestedKind === 'CAPSTONE' ? 'CAPSTONE' : 'STANDARD') satisfies TrickKind,
    draftSource: 'HUMAN',
  };
  const workedExample = optionalString(payload.workedExample);
  if (workedExample !== undefined) {
    input.workedExample = workedExample;
  }
  return input;
}

export function parseUpdateTrick(payload: unknown): UpdateTrickInput | null {
  if (!isRecord(payload)) {
    return null;
  }
  const input: UpdateTrickInput = {};
  const name = optionalString(payload.name);
  if (name !== undefined) {
    input.name = name;
  }
  const kind = optionalString(payload.kind);
  if (kind === 'STANDARD' || kind === 'CAPSTONE') {
    input.kind = kind satisfies TrickKind;
  }
  const methodDescription = optionalString(payload.methodDescription);
  if (methodDescription !== undefined) {
    input.methodDescription = methodDescription;
  }
  if (payload.workedExample === null) {
    input.workedExample = null;
  } else {
    const workedExample = optionalString(payload.workedExample);
    if (workedExample !== undefined) {
      input.workedExample = workedExample;
    }
  }
  return input;
}

export function parseUpsertVariant(payload: unknown): UpsertVariantInput | null {
  if (!isRecord(payload)) {
    return null;
  }
  const wording = optionalString(payload.wording);
  const scenario = optionalString(payload.scenario);
  if (wording === undefined || wording.trim().length === 0) {
    return null;
  }
  if (scenario === undefined || scenario.trim().length === 0) {
    return null;
  }
  const input: UpsertVariantInput = { wording, scenario };
  if (payload.readingLevel === null) {
    input.readingLevel = null;
  } else {
    const readingLevel = optionalString(payload.readingLevel);
    if (readingLevel !== undefined) {
      input.readingLevel = readingLevel;
    }
  }
  return input;
}

/* ------------------------------------------------------------------ *
 * Phase 03 — Curriculum / Sequence / Trick roles
 * ------------------------------------------------------------------ */

function optionalStatus(value: unknown): ContentStatus | undefined {
  return isContentStatus(value) ? value : undefined;
}

function optionalRole(value: unknown): SequenceRole | undefined {
  return isSequenceRole(value) ? value : undefined;
}

export function parseCreateCurriculum(payload: unknown): CreateCurriculumInput | null {
  if (!isRecord(payload)) {
    return null;
  }
  const name = optionalString(payload.name);
  const version = optionalString(payload.version);
  if (name === undefined || name.trim().length === 0) {
    return null;
  }
  if (version === undefined || version.trim().length === 0) {
    return null;
  }
  const input: CreateCurriculumInput = {
    name,
    version,
    status: optionalStatus(payload.status) ?? 'DRAFT',
  };
  const description = optionalString(payload.description);
  if (description !== undefined) {
    input.description = description;
  }
  return input;
}

export function parseUpdateCurriculum(payload: unknown): UpdateCurriculumInput | null {
  if (!isRecord(payload)) {
    return null;
  }
  const input: UpdateCurriculumInput = {};
  const name = optionalString(payload.name);
  if (name !== undefined) {
    input.name = name;
  }
  const version = optionalString(payload.version);
  if (version !== undefined) {
    input.version = version;
  }
  if (payload.description === null) {
    input.description = null;
  } else {
    const description = optionalString(payload.description);
    if (description !== undefined) {
      input.description = description;
    }
  }
  const status = optionalStatus(payload.status);
  if (status !== undefined) {
    input.status = status;
  }
  return input;
}

export function parseCreateSequence(payload: unknown): CreateSequenceInput | null {
  if (!isRecord(payload)) {
    return null;
  }
  const name = optionalString(payload.name);
  const objective = optionalString(payload.objective);
  if (name === undefined || name.trim().length === 0) {
    return null;
  }
  if (objective === undefined || objective.trim().length === 0) {
    return null;
  }
  const input: CreateSequenceInput = {
    name,
    objective,
    status: optionalStatus(payload.status) ?? 'DRAFT',
  };
  const description = optionalString(payload.description);
  if (description !== undefined) {
    input.description = description;
  }
  const difficultyDescription = optionalString(payload.difficultyDescription);
  if (difficultyDescription !== undefined) {
    input.difficultyDescription = difficultyDescription;
  }
  return input;
}

export function parseUpdateSequence(payload: unknown): UpdateSequenceInput | null {
  if (!isRecord(payload)) {
    return null;
  }
  const input: UpdateSequenceInput = {};
  const name = optionalString(payload.name);
  if (name !== undefined) {
    input.name = name;
  }
  const objective = optionalString(payload.objective);
  if (objective !== undefined) {
    input.objective = objective;
  }
  if (payload.description === null) {
    input.description = null;
  } else {
    const description = optionalString(payload.description);
    if (description !== undefined) {
      input.description = description;
    }
  }
  if (payload.difficultyDescription === null) {
    input.difficultyDescription = null;
  } else {
    const difficultyDescription = optionalString(payload.difficultyDescription);
    if (difficultyDescription !== undefined) {
      input.difficultyDescription = difficultyDescription;
    }
  }
  const status = optionalStatus(payload.status);
  if (status !== undefined) {
    input.status = status;
  }
  return input;
}

export function parseSetSequenceTricks(payload: unknown): SetSequenceTricksInput | null {
  if (!isRecord(payload) || !Array.isArray(payload.tricks)) {
    return null;
  }
  const tricks: SequenceTrickAssignment[] = [];
  for (const entry of payload.tricks) {
    if (!isRecord(entry)) {
      return null;
    }
    const trickId = optionalString(entry.trickId);
    const role = optionalRole(entry.role);
    const position = entry.position;
    if (trickId === undefined || trickId.length === 0 || role === undefined) {
      return null;
    }
    if (typeof position !== 'number' || !Number.isInteger(position) || position < 1) {
      return null;
    }
    tricks.push({ trickId, role, position });
  }
  return { tricks };
}

/* ------------------------------------------------------------------ *
 * Phase 04 — Nitty Gritty Families, Facts, Insertions
 * ------------------------------------------------------------------ */

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/** `undefined` leaves a binding untouched; `null` clears it. */
function optionalBinding(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return undefined;
}

/** `undefined` leaves a range untouched; `null` clears it. */
function optionalRange(value: unknown): number | null | undefined {
  if (value === null) {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return undefined;
}

export function parseCreateFamily(payload: unknown): CreateFamilyInput | null {
  if (!isRecord(payload)) {
    return null;
  }
  const name = optionalString(payload.name);
  const type = payload.type;
  if (name === undefined || name.trim().length === 0 || !isFamilyType(type)) {
    return null;
  }
  const recurrenceInitialInterval = payload.recurrenceInitialInterval;
  const recurrenceGrowthFactor = payload.recurrenceGrowthFactor;
  const instantRecallThresholdMs = payload.instantRecallThresholdMs;
  if (!isPositiveInteger(recurrenceInitialInterval)) {
    return null;
  }
  if (!isPositiveNumber(recurrenceGrowthFactor)) {
    return null;
  }
  if (!isPositiveInteger(instantRecallThresholdMs)) {
    return null;
  }
  const input: CreateFamilyInput = {
    name,
    type,
    recurrenceInitialInterval,
    recurrenceGrowthFactor,
    instantRecallThresholdMs,
  };
  const boundWorldId = optionalBinding(payload.boundWorldId);
  if (boundWorldId !== undefined) {
    input.boundWorldId = boundWorldId;
  }
  const triggerWorldId = optionalBinding(payload.triggerWorldId);
  if (triggerWorldId !== undefined) {
    input.triggerWorldId = triggerWorldId;
  }
  return input;
}

export function parseUpdateFamily(payload: unknown): UpdateFamilyInput | null {
  if (!isRecord(payload)) {
    return null;
  }
  const input: UpdateFamilyInput = {};
  const name = optionalString(payload.name);
  if (name !== undefined && name.trim().length > 0) {
    input.name = name;
  }
  if (isFamilyType(payload.type)) {
    input.type = payload.type;
  }
  if (isPositiveInteger(payload.recurrenceInitialInterval)) {
    input.recurrenceInitialInterval = payload.recurrenceInitialInterval;
  }
  if (isPositiveNumber(payload.recurrenceGrowthFactor)) {
    input.recurrenceGrowthFactor = payload.recurrenceGrowthFactor;
  }
  if (isPositiveInteger(payload.instantRecallThresholdMs)) {
    input.instantRecallThresholdMs = payload.instantRecallThresholdMs;
  }
  const boundWorldId = optionalBinding(payload.boundWorldId);
  if (boundWorldId !== undefined) {
    input.boundWorldId = boundWorldId;
  }
  const triggerWorldId = optionalBinding(payload.triggerWorldId);
  if (triggerWorldId !== undefined) {
    input.triggerWorldId = triggerWorldId;
  }
  return input;
}

export function parseCreateFact(payload: unknown): CreateFactInput | null {
  if (!isRecord(payload)) {
    return null;
  }
  const factText = optionalString(payload.factText);
  if (!isFactType(payload.factType) || !isRecord(payload.data)) {
    return null;
  }
  if (factText === undefined || factText.trim().length === 0) {
    return null;
  }
  const input: CreateFactInput = {
    factType: payload.factType,
    data: payload.data,
    factText,
    gatingRequired: typeof payload.gatingRequired === 'boolean' ? payload.gatingRequired : false,
    draftSource: 'HUMAN',
  };
  const numberRangeMin = optionalRange(payload.numberRangeMin);
  if (numberRangeMin !== undefined) {
    input.numberRangeMin = numberRangeMin;
  }
  const numberRangeMax = optionalRange(payload.numberRangeMax);
  if (numberRangeMax !== undefined) {
    input.numberRangeMax = numberRangeMax;
  }
  return input;
}

export function parseUpdateFact(payload: unknown): UpdateFactInput | null {
  if (!isRecord(payload)) {
    return null;
  }
  const input: UpdateFactInput = {};
  if (isFactType(payload.factType)) {
    input.factType = payload.factType;
  }
  if (isRecord(payload.data)) {
    input.data = payload.data;
  }
  const factText = optionalString(payload.factText);
  if (factText !== undefined && factText.trim().length > 0) {
    input.factText = factText;
  }
  const numberRangeMin = optionalRange(payload.numberRangeMin);
  if (numberRangeMin !== undefined) {
    input.numberRangeMin = numberRangeMin;
  }
  const numberRangeMax = optionalRange(payload.numberRangeMax);
  if (numberRangeMax !== undefined) {
    input.numberRangeMax = numberRangeMax;
  }
  if (typeof payload.gatingRequired === 'boolean') {
    input.gatingRequired = payload.gatingRequired;
  }
  return input;
}

export function parseSetInsertions(payload: unknown): SetInsertionsInput | null {
  if (!isRecord(payload) || !Array.isArray(payload.insertions)) {
    return null;
  }
  const insertions: SetInsertionsInput['insertions'] = [];
  for (const entry of payload.insertions) {
    if (!isRecord(entry)) {
      return null;
    }
    const factId = optionalString(entry.factId);
    if (factId === undefined || factId.length === 0 || !isInsertionType(entry.insertionType)) {
      return null;
    }
    const position = entry.position;
    if (typeof position !== 'number' || !Number.isInteger(position) || position < 1) {
      return null;
    }
    insertions.push({ factId, insertionType: entry.insertionType, position });
  }
  return { insertions };
}

/* ------------------------------------------------------------------ *
 * Phase 05 — Vetting, review, comments, restore
 * ------------------------------------------------------------------ */

/** `undefined` omits a field; `null` clears it; a string sets it. */
function optionalNullableText(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
}

export function parseSetTrickVetting(payload: unknown): SetTrickVettingInput | null {
  if (!isRecord(payload) || !isVettingStatus(payload.status)) {
    return null;
  }
  const input: SetTrickVettingInput = { status: payload.status };
  const validity = optionalNullableText(payload.vettingValidity);
  if (validity !== undefined) {
    input.vettingValidity = validity;
  }
  const domain = optionalNullableText(payload.vettingDomain);
  if (domain !== undefined) {
    input.vettingDomain = domain;
  }
  const edgeCases = optionalNullableText(payload.vettingEdgeCases);
  if (edgeCases !== undefined) {
    input.vettingEdgeCases = edgeCases;
  }
  return input;
}

export function parseSetFactVetting(payload: unknown): SetFactVettingInput | null {
  if (!isRecord(payload) || !isVettingStatus(payload.status)) {
    return null;
  }
  return { status: payload.status };
}

export function parseSetReview(payload: unknown): SetReviewInput | null {
  if (!isRecord(payload) || !isReviewStatus(payload.reviewStatus)) {
    return null;
  }
  return { reviewStatus: payload.reviewStatus };
}

export function parseCreateComment(payload: unknown): CreateCommentInput | null {
  if (!isRecord(payload)) {
    return null;
  }
  const body = optionalString(payload.body);
  if (body === undefined || body.trim().length === 0) {
    return null;
  }
  const input: CreateCommentInput = { body };
  const parent = optionalBinding(payload.parentCommentId);
  if (parent !== undefined) {
    input.parentCommentId = parent;
  }
  return input;
}

export function parseUpdateComment(payload: unknown): UpdateCommentInput | null {
  if (!isRecord(payload)) {
    return null;
  }
  const input: UpdateCommentInput = {};
  if (isCommentStatus(payload.status)) {
    input.status = payload.status;
  }
  const assignedToId = optionalBinding(payload.assignedToId);
  if (assignedToId !== undefined) {
    input.assignedToId = assignedToId;
  }
  if (input.status === undefined && input.assignedToId === undefined) {
    return null;
  }
  return input;
}
