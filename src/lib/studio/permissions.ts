import type { MeView } from '@/lib/api-client';

/** Permission keys enforced by the API for Studio authoring. */
export const STUDIO_PERMISSIONS = {
  worldStructureWrite: 'world.structure.write',
  worldReorder: 'world.reorder',
  trickContentWrite: 'trick.content.write',
  curriculumWrite: 'curriculum.write',
  sequenceWrite: 'sequence.write',
  familyManage: 'family.manage',
  trickVettingWrite: 'trick.vetting.write',
  factVettingWrite: 'fact.vetting.write',
  commentCoordinate: 'comment.coordinate',
} as const;

/**
 * Server-derived capability flags. These only shape the UI (disable/hide
 * controls); the API remains the sole authority and every write is still
 * permission-checked server-side.
 */
export interface StudioCapabilities {
  isAdmin: boolean;
  canWriteStructure: boolean;
  canReorderWorlds: boolean;
  canWriteContent: boolean;
  canWriteCurriculum: boolean;
  canWriteSequence: boolean;
  canManageFamily: boolean;
  canVetTrick: boolean;
  canVetFact: boolean;
  canCoordinateComments: boolean;
}

export function capabilitiesFor(user: Pick<MeView, 'isAdmin' | 'permissions'>): StudioCapabilities {
  const has = (key: string): boolean => user.isAdmin || user.permissions.includes(key);
  return {
    isAdmin: user.isAdmin,
    canWriteStructure: has(STUDIO_PERMISSIONS.worldStructureWrite),
    canReorderWorlds: has(STUDIO_PERMISSIONS.worldReorder),
    canWriteContent: has(STUDIO_PERMISSIONS.trickContentWrite),
    canWriteCurriculum: has(STUDIO_PERMISSIONS.curriculumWrite),
    canWriteSequence: has(STUDIO_PERMISSIONS.sequenceWrite),
    canManageFamily: has(STUDIO_PERMISSIONS.familyManage),
    canVetTrick: has(STUDIO_PERMISSIONS.trickVettingWrite),
    canVetFact: has(STUDIO_PERMISSIONS.factVettingWrite),
    canCoordinateComments: has(STUDIO_PERMISSIONS.commentCoordinate),
  };
}
