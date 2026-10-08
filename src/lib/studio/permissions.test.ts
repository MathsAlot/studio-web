import { describe, expect, it } from 'vitest';
import { capabilitiesFor } from '@/lib/studio/permissions';
import type { MeView } from '@/lib/api-client';

function user(overrides: Partial<MeView> = {}): MeView {
  return {
    id: 'u1',
    email: 'user@example.com',
    displayName: 'User',
    role: 'STAFF',
    isAdmin: false,
    permissions: [],
    ...overrides,
  };
}

describe('capabilitiesFor', () => {
  it('grants nothing to a Staff account with no permissions', () => {
    expect(capabilitiesFor(user())).toEqual({
      isAdmin: false,
      canWriteStructure: false,
      canReorderWorlds: false,
      canWriteContent: false,
      canWriteCurriculum: false,
      canWriteSequence: false,
      canManageFamily: false,
      canVetTrick: false,
      canVetFact: false,
      canCoordinateComments: false,
    });
  });

  it('maps individual grants to capabilities', () => {
    const caps = capabilitiesFor(user({ permissions: ['world.structure.write'] }));
    expect(caps.canWriteStructure).toBe(true);
    expect(caps.canReorderWorlds).toBe(false);
    expect(caps.canWriteContent).toBe(false);
    expect(caps.canWriteCurriculum).toBe(false);
    expect(caps.canWriteSequence).toBe(false);
    expect(caps.canManageFamily).toBe(false);
  });

  it('maps curriculum and sequence grants', () => {
    const caps = capabilitiesFor(user({ permissions: ['curriculum.write', 'sequence.write'] }));
    expect(caps.canWriteCurriculum).toBe(true);
    expect(caps.canWriteSequence).toBe(true);
    expect(caps.canWriteContent).toBe(false);
  });

  it('maps the Nitty Gritty family grant', () => {
    const caps = capabilitiesFor(user({ permissions: ['family.manage'] }));
    expect(caps.canManageFamily).toBe(true);
    expect(caps.canWriteCurriculum).toBe(false);
  });

  it('maps the Phase 05 trust grants independently', () => {
    const caps = capabilitiesFor(
      user({ permissions: ['trick.vetting.write', 'fact.vetting.write', 'comment.coordinate'] }),
    );
    expect(caps.canVetTrick).toBe(true);
    expect(caps.canVetFact).toBe(true);
    expect(caps.canCoordinateComments).toBe(true);
    expect(caps.canManageFamily).toBe(false);
  });

  it('lets Admin bypass grant checks for the UI too', () => {
    expect(capabilitiesFor(user({ role: 'ADMIN', isAdmin: true }))).toEqual({
      isAdmin: true,
      canWriteStructure: true,
      canReorderWorlds: true,
      canWriteContent: true,
      canWriteCurriculum: true,
      canWriteSequence: true,
      canManageFamily: true,
      canVetTrick: true,
      canVetFact: true,
      canCoordinateComments: true,
    });
  });
});
