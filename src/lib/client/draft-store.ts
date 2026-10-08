/**
 * Local draft persistence for authoring forms (D-021). Drafts live in
 * localStorage per entity so a failed or interrupted save never silently loses
 * input. The server stays the source of truth: drafts are cleared only after a
 * confirmed save or an explicit discard.
 */

function defaultStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readDraft<T>(key: string, storage: Storage | null = defaultStorage()): T | null {
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(key);
    if (raw === null) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeDraft(
  key: string,
  value: unknown,
  storage: Storage | null = defaultStorage(),
): void {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or privacy mode: drafts are best-effort, never fatal.
  }
}

export function clearDraft(key: string, storage: Storage | null = defaultStorage()): void {
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(key);
  } catch {
    // Ignore; the draft will be overwritten on the next edit.
  }
}

/** Namespaced draft keys keep entities isolated from each other. */
export const DRAFT_KEYS = {
  world: (worldId: string): string => `studio:draft:world:${worldId}`,
  trickStructure: (trickId: string): string => `studio:draft:trick-structure:${trickId}`,
  trickContent: (trickId: string): string => `studio:draft:trick-content:${trickId}`,
  variant: (trickId: string, ageTier: string): string =>
    `studio:draft:variant:${trickId}:${ageTier}`,
  curriculum: (curriculumId: string): string => `studio:draft:curriculum:${curriculumId}`,
  sequence: (sequenceId: string): string => `studio:draft:sequence:${sequenceId}`,
  sequenceAssignments: (sequenceId: string): string =>
    `studio:draft:sequence-assignments:${sequenceId}`,
  family: (familyId: string): string => `studio:draft:family:${familyId}`,
  fact: (factId: string): string => `studio:draft:fact:${factId}`,
  insertions: (sequenceId: string): string => `studio:draft:insertions:${sequenceId}`,
} as const;
