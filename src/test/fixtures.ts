import type {
  AgeTier,
  Comment,
  Completeness,
  CurriculumCompletion,
  CurriculumDetail,
  CurriculumSummary,
  FactDetail,
  FactTypeMetadata,
  FamilyDetail,
  FamilySummary,
  Insertion,
  Preview,
  SequenceDetail,
  SequenceTrick,
  TrickDetail,
  TrickSummary,
  TrickVariant,
  UserSummary,
  WorldSummary,
} from '@/lib/api-client';
import type { StudioCapabilities } from '@/lib/studio/permissions';

const NOW = '2026-01-01T00:00:00.000Z';

type WorldInput = Omit<Partial<WorldSummary>, 'description'> & { description?: string | null };

export function completeness(overrides: Partial<Completeness> = {}): Completeness {
  return {
    variantCount: 3,
    totalTiers: 3,
    missingTiers: [],
    isComplete: true,
    isReady: false,
    ...overrides,
  };
}

export function trickSummary(overrides: Partial<TrickSummary> = {}): TrickSummary {
  return {
    id: 'trick-1',
    name: 'Basic Addition',
    kind: 'STANDARD',
    position: 1,
    completeness: completeness(),
    ...overrides,
  };
}

export function worldSummary(overrides: WorldInput = {}): WorldSummary {
  const { description = null, ...rest } = overrides;
  return {
    id: 'world-1',
    name: 'Addition',
    description: description as unknown as WorldSummary['description'],
    order: 1,
    createdAt: NOW,
    updatedAt: NOW,
    rollup: {
      trickCount: 1,
      completeTrickCount: 1,
      readyTrickCount: 0,
      completionPercent: 100,
    },
    tricks: [trickSummary()],
    ...rest,
  };
}

export function variant(overrides: Partial<TrickVariant> = {}): TrickVariant {
  return {
    id: 'variant-1',
    ageTier: 'FORMATIVE',
    wording: 'Count on from the larger number.',
    scenario: 'Seven birds, then five more.',
    readingLevel: null,
    draftSource: 'HUMAN',
    reviewStatus: 'APPROVED',
    updatedAt: NOW,
    ...overrides,
  };
}

type TrickInput = Omit<Partial<TrickDetail>, 'workedExample' | 'variants'> & {
  workedExample?: string | null;
  variants?: TrickVariant[];
};

export function trickDetail(overrides: TrickInput = {}): TrickDetail {
  const { workedExample = null, variants = [variant()], ...rest } = overrides;
  return {
    id: 'trick-1',
    worldId: 'world-1',
    name: 'Basic Addition',
    kind: 'STANDARD',
    position: 1,
    methodDescription: 'Add the values.',
    workedExample: workedExample as unknown as TrickDetail['workedExample'],
    vettingStatus: 'DRAFT',
    vettingValidity: null,
    vettingDomain: null,
    vettingEdgeCases: null,
    draftSource: 'HUMAN',
    reviewStatus: 'NEEDS_REVIEW',
    publishedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    variants,
    completeness: completeness(),
    ...rest,
  };
}

export function preview(overrides: Partial<Preview> = {}): Preview {
  return {
    trickId: 'trick-1',
    ageTier: 'FORMATIVE' as AgeTier,
    wording: 'Count on from the larger number.',
    scenario: 'Seven birds, then five more.',
    readingLevel: null,
    ...overrides,
  };
}

export function capabilities(overrides: Partial<StudioCapabilities> = {}): StudioCapabilities {
  return {
    isAdmin: false,
    canWriteStructure: true,
    canReorderWorlds: true,
    canWriteContent: true,
    canWriteCurriculum: true,
    canWriteSequence: true,
    canManageFamily: true,
    canVetTrick: true,
    canVetFact: true,
    canCoordinateComments: true,
    ...overrides,
  };
}

export function curriculumCompletion(
  overrides: Partial<CurriculumCompletion> = {},
): CurriculumCompletion {
  return {
    sequenceCount: 1,
    completeSequenceCount: 1,
    assignmentCount: 1,
    coveredTrickCount: 1,
    introduceCount: 1,
    retainCount: 0,
    revisitCount: 0,
    completionPercent: 100,
    ...overrides,
  };
}

type CurriculumInput = Omit<Partial<CurriculumSummary>, 'description'> & {
  description?: string | null;
};

export function curriculumSummary(overrides: CurriculumInput = {}): CurriculumSummary {
  const { description = 'Staged introduction of addition methods', ...rest } = overrides;
  return {
    id: 'curriculum-1',
    worldId: 'world-1',
    name: 'Addition Core',
    description: description as unknown as CurriculumSummary['description'],
    version: 'v1',
    status: 'DRAFT',
    createdAt: NOW,
    updatedAt: NOW,
    completion: curriculumCompletion(),
    ...rest,
  };
}

export function sequenceTrick(overrides: Partial<SequenceTrick> = {}): SequenceTrick {
  return {
    id: 'assignment-1',
    trickId: 'trick-1',
    role: 'INTRODUCE',
    position: 1,
    ...overrides,
  };
}

type SequenceInput = Omit<
  Partial<SequenceDetail>,
  'description' | 'difficultyDescription' | 'tricks'
> & {
  description?: string | null;
  difficultyDescription?: string | null;
  tricks?: SequenceTrick[];
};

export function sequenceDetail(overrides: SequenceInput = {}): SequenceDetail {
  const {
    description = null,
    difficultyDescription = 'Single digit addition',
    tricks = [sequenceTrick()],
    ...rest
  } = overrides;
  return {
    id: 'sequence-1',
    curriculumId: 'curriculum-1',
    sequenceNumber: 1,
    name: 'First steps',
    objective: 'Introduce Basic Addition',
    description: description as unknown as SequenceDetail['description'],
    difficultyDescription:
      difficultyDescription as unknown as SequenceDetail['difficultyDescription'],
    status: 'DRAFT',
    completion: {
      assignmentCount: tricks.length,
      introduceCount: tricks.filter((trick) => trick.role === 'INTRODUCE').length,
      retainCount: tricks.filter((trick) => trick.role === 'RETAIN').length,
      revisitCount: tricks.filter((trick) => trick.role === 'REVISIT').length,
      isComplete: true,
    },
    tricks,
    ...rest,
  };
}

type CurriculumDetailInput = Omit<Partial<CurriculumDetail>, 'description' | 'sequences'> & {
  description?: string | null;
  sequences?: SequenceDetail[];
};

export function curriculumDetail(overrides: CurriculumDetailInput = {}): CurriculumDetail {
  const { description = 'Staged introduction of addition methods', sequences, ...rest } = overrides;
  const base = curriculumSummary({ description });
  return {
    id: base.id,
    worldId: base.worldId,
    name: base.name,
    description: description as unknown as CurriculumDetail['description'],
    version: base.version,
    status: base.status,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
    completion: base.completion,
    sequences: sequences ?? [sequenceDetail()],
    ...rest,
  };
}

/* ------------------------------------------------------------------ *
 * Phase 04 — Nitty Gritty
 * ------------------------------------------------------------------ */

type FamilyInput = Partial<FamilySummary>;

export function familySummary(overrides: FamilyInput = {}): FamilySummary {
  const { boundWorldId = 'world-1', triggerWorldId = null, ...rest } = overrides;
  return {
    id: 'family-1',
    name: 'Doubles',
    type: 'WORLD_BOUND',
    boundWorldId,
    triggerWorldId,
    recurrenceInitialInterval: 3,
    recurrenceGrowthFactor: 2,
    instantRecallThresholdMs: 2000,
    factCount: 1,
    createdAt: NOW,
    updatedAt: NOW,
    ...rest,
  };
}

type FamilyDetailInput = Omit<FamilyInput, 'factCount'> & {
  facts?: FactDetail[];
};

export function familyDetail(overrides: FamilyDetailInput = {}): FamilyDetail {
  const { facts = [factDetail()], ...rest } = overrides;
  const base = familySummary(rest);
  return {
    id: base.id,
    name: base.name,
    type: base.type,
    boundWorldId: base.boundWorldId,
    triggerWorldId: base.triggerWorldId,
    recurrenceInitialInterval: base.recurrenceInitialInterval,
    recurrenceGrowthFactor: base.recurrenceGrowthFactor,
    instantRecallThresholdMs: base.instantRecallThresholdMs,
    factCount: facts.length,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
    facts,
  };
}

type FactInput = Partial<FactDetail>;

export function factDetail(overrides: FactInput = {}): FactDetail {
  return {
    id: 'fact-1',
    familyId: 'family-1',
    order: 1,
    factType: 'operation',
    data: { operation: '+', a: 2, b: 3, answer: 5 },
    factText: '2 + 3 = 5',
    numberRangeMin: 1,
    numberRangeMax: 10,
    gatingRequired: false,
    vettingStatus: 'DRAFT',
    draftSource: 'HUMAN',
    reviewStatus: 'NEEDS_REVIEW',
    publishedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    validation: { valid: true, errors: [] },
    ...overrides,
  };
}

export function defaultFactTypes(): FactTypeMetadata[] {
  return [
    {
      type: 'operation',
      description: 'Arithmetic operation with two operands and its answer.',
      fields: [
        { name: 'operation', type: 'string', required: true, description: 'Operator symbol.' },
        { name: 'a', type: 'number', required: true, description: 'Left operand.' },
        { name: 'b', type: 'number', required: true, description: 'Right operand.' },
        { name: 'answer', type: 'number', required: true, description: 'Correct result.' },
      ],
    },
    {
      type: 'equivalence',
      description: 'One value together with its equivalent representations.',
      fields: [
        { name: 'value', type: 'string', required: true, description: 'Canonical value.' },
        {
          name: 'equivalents',
          type: 'string[]',
          required: true,
          description: 'Equivalent representations (at least one).',
        },
      ],
    },
    {
      type: 'calendar',
      description: 'Calendar-based prompt and its answer.',
      fields: [
        { name: 'prompt', type: 'string', required: true, description: 'Question shown.' },
        { name: 'answer', type: 'string', required: true, description: 'Expected answer.' },
      ],
    },
  ];
}

export function insertion(overrides: Partial<Insertion> = {}): Insertion {
  return {
    id: 'insertion-1',
    sequenceId: 'sequence-1',
    factId: 'fact-1',
    insertionType: 'gating',
    position: 1,
    ...overrides,
  };
}

/* ------------------------------------------------------------------ *
 * Phase 05 — Vetting, review, comments
 * ------------------------------------------------------------------ */

export function comment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 'comment-1',
    trickId: 'trick-1',
    parentCommentId: null,
    authorId: 'user-1',
    body: 'Should the worked example show carrying?',
    status: 'OPEN',
    assignedToId: null,
    createdAt: NOW,
    updatedAt: NOW,
    replies: [],
    ...overrides,
  };
}

export function userSummary(overrides: Partial<UserSummary> = {}): UserSummary {
  return {
    id: 'user-1',
    email: 'staff@mathsalot.example',
    displayName: 'Staff One',
    role: 'STAFF',
    createdAt: NOW,
    lastLoginAt: null,
    permissions: [],
    ...overrides,
  };
}
