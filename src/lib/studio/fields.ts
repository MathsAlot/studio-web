import type {
  AgeTier,
  ContentStatus,
  FactType,
  FamilyType,
  InsertionType,
  SequenceRole,
  TrickDetail,
  TrickKind,
} from '@/lib/api-client';

/**
 * Runtime narrowing for values read from the API, including untyped JSON
 * snapshots. Keeps rendering safe when a field is absent or the wrong shape.
 */
export function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function asTextOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/** Coerce an untyped JSON field to a plain object (e.g. Fact snapshot). */
export function asDataObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Map a trimmed editor value to the API's `null`-clears convention. */
export function toNullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export const AGE_TIERS: readonly AgeTier[] = ['FORMATIVE', 'MIDRANGE', 'MATURE'];

export const TIER_LABELS: Record<AgeTier, string> = {
  FORMATIVE: 'Formative',
  MIDRANGE: 'Midrange',
  MATURE: 'Mature',
};

export const KIND_LABELS: Record<TrickKind, string> = {
  STANDARD: 'Standard',
  CAPSTONE: 'Capstone',
};

export const VETTING_LABELS: Record<TrickDetail['vettingStatus'], string> = {
  DRAFT: 'Draft',
  UNDER_REVIEW: 'Under review',
  VERIFIED: 'Verified',
  NEEDS_REVISION: 'Needs revision',
};

export const REVIEW_LABELS: Record<TrickDetail['reviewStatus'], string> = {
  NEEDS_REVIEW: 'Needs review',
  APPROVED: 'Approved',
};

export const DRAFT_SOURCE_LABELS: Record<TrickDetail['draftSource'], string> = {
  HUMAN: 'Human-authored',
  AI: 'AI-drafted',
};

export const VETTING_STATUSES: readonly TrickDetail['vettingStatus'][] = [
  'DRAFT',
  'UNDER_REVIEW',
  'VERIFIED',
  'NEEDS_REVISION',
];

export const REVIEW_STATUSES: readonly TrickDetail['reviewStatus'][] = ['NEEDS_REVIEW', 'APPROVED'];

export function isVettingStatus(value: unknown): value is TrickDetail['vettingStatus'] {
  return (
    value === 'DRAFT' ||
    value === 'UNDER_REVIEW' ||
    value === 'VERIFIED' ||
    value === 'NEEDS_REVISION'
  );
}

export function isReviewStatus(value: unknown): value is TrickDetail['reviewStatus'] {
  return value === 'NEEDS_REVIEW' || value === 'APPROVED';
}

export const CONTENT_STATUSES: readonly ContentStatus[] = ['DRAFT', 'ACTIVE', 'ARCHIVED'];

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
};

/**
 * Reading level is a constrained grade band, not free text (D-033). Stored as
 * a short label on the variant; existing non-listed values are preserved.
 */
export const READING_LEVELS = [
  { value: 'K-1', label: 'Kindergarten to Grade 1' },
  { value: '2-3', label: 'Grades 2 to 3' },
  { value: '4-5', label: 'Grades 4 to 5' },
  { value: '6-8', label: 'Grades 6 to 8' },
] as const;

export const SEQUENCE_ROLES: readonly SequenceRole[] = ['INTRODUCE', 'RETAIN', 'REVISIT'];

export const SEQUENCE_ROLE_LABELS: Record<SequenceRole, string> = {
  INTRODUCE: 'Introduce',
  RETAIN: 'Retain',
  REVISIT: 'Revisit',
};

export function isContentStatus(value: unknown): value is ContentStatus {
  return value === 'DRAFT' || value === 'ACTIVE' || value === 'ARCHIVED';
}

export function isSequenceRole(value: unknown): value is SequenceRole {
  return value === 'INTRODUCE' || value === 'RETAIN' || value === 'REVISIT';
}

/* ------------------------------------------------------------------ *
 * Phase 04 — Nitty Gritty Families, Facts, Insertions
 * ------------------------------------------------------------------ */

export const FAMILY_TYPES: readonly FamilyType[] = ['WORLD_BOUND', 'GLOBAL'];

export const FAMILY_TYPE_LABELS: Record<FamilyType, string> = {
  WORLD_BOUND: 'World-bound',
  GLOBAL: 'Global',
};

export const FACT_TYPE_LABELS: Record<FactType, string> = {
  operation: 'Operation',
  equivalence: 'Equivalence',
  calendar: 'Calendar',
};

export const INSERTION_TYPES: readonly InsertionType[] = ['gating', 'alongside'];

export const INSERTION_TYPE_LABELS: Record<InsertionType, string> = {
  gating: 'Gating',
  alongside: 'Alongside',
};

export function isFamilyType(value: unknown): value is FamilyType {
  return value === 'WORLD_BOUND' || value === 'GLOBAL';
}

export function isFactType(value: unknown): value is FactType {
  return value === 'operation' || value === 'equivalence' || value === 'calendar';
}

export function isInsertionType(value: unknown): value is InsertionType {
  return value === 'gating' || value === 'alongside';
}

/* ------------------------------------------------------------------ *
 * Phase 05 — Vetting, review, comments, history
 * ------------------------------------------------------------------ */

export type CommentStatus = 'OPEN' | 'RESOLVED';

export const COMMENT_STATUSES: readonly CommentStatus[] = ['OPEN', 'RESOLVED'];

export const COMMENT_STATUS_LABELS: Record<CommentStatus, string> = {
  OPEN: 'Open',
  RESOLVED: 'Resolved',
};

export function isCommentStatus(value: unknown): value is CommentStatus {
  return value === 'OPEN' || value === 'RESOLVED';
}
