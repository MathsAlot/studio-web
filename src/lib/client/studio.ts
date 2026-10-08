import type {
  AgeTier,
  Comment,
  CreateCommentInput,
  CreateCurriculumInput,
  CreateFactInput,
  CreateFamilyInput,
  CreateSequenceInput,
  CreateTrickInput,
  CreateWorldInput,
  CurriculumDetail,
  CurriculumSummary,
  FactDetail,
  FactTypeMetadata,
  FactVersion,
  FamilyDetail,
  FamilySummary,
  Insertion,
  Preview,
  ReorderFactsResponse,
  ReorderResponse,
  SequenceDetail,
  SetFactVettingInput,
  SetInsertionsInput,
  SetReviewInput,
  SetSequenceTricksInput,
  SetTrickVettingInput,
  TrickDetail,
  TrickVersion,
  UpdateCommentInput,
  UpdateCurriculumInput,
  UpdateFactInput,
  UpdateFamilyInput,
  UpdateSequenceInput,
  UpdateTrickInput,
  UpdateWorldInput,
  UpsertVariantInput,
  WorldSummary,
} from '@/lib/api-client';
import { clientFetch, type ClientResult } from './http';

/**
 * Client calls to the same-origin Studio BFF proxies. The BFF attaches the
 * httpOnly Bearer token and the CSRF header; authorization is enforced by the
 * API on every call and its result is what the UI renders.
 */

export function listWorlds(): Promise<ClientResult<WorldSummary[]>> {
  return clientFetch<WorldSummary[]>('/api/studio/worlds');
}

export function createWorld(input: CreateWorldInput): Promise<ClientResult<WorldSummary>> {
  return clientFetch<WorldSummary>('/api/studio/worlds', { method: 'POST', body: input });
}

export function updateWorld(
  worldId: string,
  input: UpdateWorldInput,
): Promise<ClientResult<WorldSummary>> {
  return clientFetch<WorldSummary>(`/api/studio/worlds/${encodeURIComponent(worldId)}`, {
    method: 'PATCH',
    body: input,
  });
}

export function reorderWorlds(orderedIds: string[]): Promise<ClientResult<ReorderResponse>> {
  return clientFetch<ReorderResponse>('/api/studio/worlds/order', {
    method: 'PUT',
    body: { orderedIds },
  });
}

export function createTrick(
  worldId: string,
  input: CreateTrickInput,
): Promise<ClientResult<TrickDetail>> {
  return clientFetch<TrickDetail>(`/api/studio/worlds/${encodeURIComponent(worldId)}/tricks`, {
    method: 'POST',
    body: input,
  });
}

export function reorderTricks(
  worldId: string,
  orderedIds: string[],
): Promise<ClientResult<ReorderResponse>> {
  return clientFetch<ReorderResponse>(
    `/api/studio/worlds/${encodeURIComponent(worldId)}/tricks/order`,
    { method: 'PUT', body: { orderedIds } },
  );
}

export function getTrick(trickId: string): Promise<ClientResult<TrickDetail>> {
  return clientFetch<TrickDetail>(`/api/studio/tricks/${encodeURIComponent(trickId)}`);
}

export function updateTrick(
  trickId: string,
  input: UpdateTrickInput,
): Promise<ClientResult<TrickDetail>> {
  return clientFetch<TrickDetail>(`/api/studio/tricks/${encodeURIComponent(trickId)}`, {
    method: 'PATCH',
    body: input,
  });
}

export function upsertVariant(
  trickId: string,
  ageTier: AgeTier,
  input: UpsertVariantInput,
): Promise<ClientResult<TrickDetail>> {
  return clientFetch<TrickDetail>(
    `/api/studio/tricks/${encodeURIComponent(trickId)}/variants/${encodeURIComponent(ageTier)}`,
    { method: 'PUT', body: input },
  );
}

export function previewTrick(trickId: string, ageTier: AgeTier): Promise<ClientResult<Preview>> {
  return clientFetch<Preview>(
    `/api/studio/tricks/${encodeURIComponent(trickId)}/preview?ageTier=${encodeURIComponent(ageTier)}`,
  );
}

export function listTrickVersions(trickId: string): Promise<ClientResult<TrickVersion[]>> {
  return clientFetch<TrickVersion[]>(`/api/studio/tricks/${encodeURIComponent(trickId)}/versions`);
}

/* ------------------------------------------------------------------ *
 * Phase 03 — Curriculum / Sequence / Trick roles
 * ------------------------------------------------------------------ */

export function listCurriculums(worldId: string): Promise<ClientResult<CurriculumSummary[]>> {
  return clientFetch<CurriculumSummary[]>(
    `/api/studio/worlds/${encodeURIComponent(worldId)}/curriculums`,
  );
}

export function createCurriculum(
  worldId: string,
  input: CreateCurriculumInput,
): Promise<ClientResult<CurriculumSummary>> {
  return clientFetch<CurriculumSummary>(
    `/api/studio/worlds/${encodeURIComponent(worldId)}/curriculums`,
    { method: 'POST', body: input },
  );
}

export function getCurriculum(curriculumId: string): Promise<ClientResult<CurriculumDetail>> {
  return clientFetch<CurriculumDetail>(
    `/api/studio/curriculums/${encodeURIComponent(curriculumId)}`,
  );
}

export function updateCurriculum(
  curriculumId: string,
  input: UpdateCurriculumInput,
): Promise<ClientResult<CurriculumDetail>> {
  return clientFetch<CurriculumDetail>(
    `/api/studio/curriculums/${encodeURIComponent(curriculumId)}`,
    { method: 'PATCH', body: input },
  );
}

export function createSequence(
  curriculumId: string,
  input: CreateSequenceInput,
): Promise<ClientResult<SequenceDetail>> {
  return clientFetch<SequenceDetail>(
    `/api/studio/curriculums/${encodeURIComponent(curriculumId)}/sequences`,
    { method: 'POST', body: input },
  );
}

export function updateSequence(
  sequenceId: string,
  input: UpdateSequenceInput,
): Promise<ClientResult<SequenceDetail>> {
  return clientFetch<SequenceDetail>(`/api/studio/sequences/${encodeURIComponent(sequenceId)}`, {
    method: 'PATCH',
    body: input,
  });
}

export function reorderSequences(
  curriculumId: string,
  orderedIds: string[],
): Promise<ClientResult<ReorderResponse>> {
  return clientFetch<ReorderResponse>(
    `/api/studio/curriculums/${encodeURIComponent(curriculumId)}/sequences/order`,
    { method: 'PUT', body: { orderedIds } },
  );
}

export function setSequenceTricks(
  sequenceId: string,
  input: SetSequenceTricksInput,
): Promise<ClientResult<SequenceDetail>> {
  return clientFetch<SequenceDetail>(
    `/api/studio/sequences/${encodeURIComponent(sequenceId)}/tricks`,
    { method: 'PUT', body: input },
  );
}

/* ------------------------------------------------------------------ *
 * Phase 04 — Nitty Gritty Families, Facts, Insertions
 * ------------------------------------------------------------------ */

export function listFactTypes(): Promise<ClientResult<FactTypeMetadata[]>> {
  return clientFetch<FactTypeMetadata[]>('/api/studio/fact-types');
}

export function listFamilies(): Promise<ClientResult<FamilySummary[]>> {
  return clientFetch<FamilySummary[]>('/api/studio/families');
}

export function createFamily(input: CreateFamilyInput): Promise<ClientResult<FamilyDetail>> {
  return clientFetch<FamilyDetail>('/api/studio/families', { method: 'POST', body: input });
}

export function getFamily(familyId: string): Promise<ClientResult<FamilyDetail>> {
  return clientFetch<FamilyDetail>(`/api/studio/families/${encodeURIComponent(familyId)}`);
}

export function updateFamily(
  familyId: string,
  input: UpdateFamilyInput,
): Promise<ClientResult<FamilyDetail>> {
  return clientFetch<FamilyDetail>(`/api/studio/families/${encodeURIComponent(familyId)}`, {
    method: 'PATCH',
    body: input,
  });
}

export function createFact(
  familyId: string,
  input: CreateFactInput,
): Promise<ClientResult<FactDetail>> {
  return clientFetch<FactDetail>(`/api/studio/families/${encodeURIComponent(familyId)}/facts`, {
    method: 'POST',
    body: input,
  });
}

export function reorderFacts(
  familyId: string,
  orderedIds: string[],
): Promise<ClientResult<ReorderFactsResponse>> {
  return clientFetch<ReorderFactsResponse>(
    `/api/studio/families/${encodeURIComponent(familyId)}/facts/order`,
    { method: 'PUT', body: { orderedIds } },
  );
}

export function getFact(factId: string): Promise<ClientResult<FactDetail>> {
  return clientFetch<FactDetail>(`/api/studio/facts/${encodeURIComponent(factId)}`);
}

export function updateFact(
  factId: string,
  input: UpdateFactInput,
): Promise<ClientResult<FactDetail>> {
  return clientFetch<FactDetail>(`/api/studio/facts/${encodeURIComponent(factId)}`, {
    method: 'PATCH',
    body: input,
  });
}

export function listFactVersions(factId: string): Promise<ClientResult<FactVersion[]>> {
  return clientFetch<FactVersion[]>(`/api/studio/facts/${encodeURIComponent(factId)}/versions`);
}

export function listInsertions(sequenceId: string): Promise<ClientResult<Insertion[]>> {
  return clientFetch<Insertion[]>(
    `/api/studio/sequences/${encodeURIComponent(sequenceId)}/insertions`,
  );
}

export function setInsertions(
  sequenceId: string,
  input: SetInsertionsInput,
): Promise<ClientResult<Insertion[]>> {
  return clientFetch<Insertion[]>(
    `/api/studio/sequences/${encodeURIComponent(sequenceId)}/insertions`,
    { method: 'PUT', body: input },
  );
}

/* ------------------------------------------------------------------ *
 * Phase 05 — Vetting, review, publish, comments, restore
 * ------------------------------------------------------------------ */

export function setTrickVetting(
  trickId: string,
  input: SetTrickVettingInput,
): Promise<ClientResult<TrickDetail>> {
  return clientFetch<TrickDetail>(`/api/studio/tricks/${encodeURIComponent(trickId)}/vetting`, {
    method: 'PUT',
    body: input,
  });
}

export function setFactVetting(
  factId: string,
  input: SetFactVettingInput,
): Promise<ClientResult<FactDetail>> {
  return clientFetch<FactDetail>(`/api/studio/facts/${encodeURIComponent(factId)}/vetting`, {
    method: 'PUT',
    body: input,
  });
}

export function setTrickReview(
  trickId: string,
  input: SetReviewInput,
): Promise<ClientResult<TrickDetail>> {
  return clientFetch<TrickDetail>(`/api/studio/tricks/${encodeURIComponent(trickId)}/review`, {
    method: 'PUT',
    body: input,
  });
}

export function setVariantReview(
  variantId: string,
  input: SetReviewInput,
): Promise<ClientResult<TrickDetail>> {
  return clientFetch<TrickDetail>(
    `/api/studio/trick-variants/${encodeURIComponent(variantId)}/review`,
    { method: 'PUT', body: input },
  );
}

export function setFactReview(
  factId: string,
  input: SetReviewInput,
): Promise<ClientResult<FactDetail>> {
  return clientFetch<FactDetail>(`/api/studio/facts/${encodeURIComponent(factId)}/review`, {
    method: 'PUT',
    body: input,
  });
}

export function publishTrick(trickId: string): Promise<ClientResult<TrickDetail>> {
  return clientFetch<TrickDetail>(`/api/studio/tricks/${encodeURIComponent(trickId)}/publish`, {
    method: 'POST',
  });
}

export function unpublishTrick(trickId: string): Promise<ClientResult<TrickDetail>> {
  return clientFetch<TrickDetail>(`/api/studio/tricks/${encodeURIComponent(trickId)}/unpublish`, {
    method: 'POST',
  });
}

export function publishFact(factId: string): Promise<ClientResult<FactDetail>> {
  return clientFetch<FactDetail>(`/api/studio/facts/${encodeURIComponent(factId)}/publish`, {
    method: 'POST',
  });
}

export function listComments(trickId: string): Promise<ClientResult<Comment[]>> {
  return clientFetch<Comment[]>(`/api/studio/tricks/${encodeURIComponent(trickId)}/comments`);
}

export function createComment(
  trickId: string,
  input: CreateCommentInput,
): Promise<ClientResult<Comment>> {
  return clientFetch<Comment>(`/api/studio/tricks/${encodeURIComponent(trickId)}/comments`, {
    method: 'POST',
    body: input,
  });
}

export function updateComment(
  commentId: string,
  input: UpdateCommentInput,
): Promise<ClientResult<Comment>> {
  return clientFetch<Comment>(`/api/studio/comments/${encodeURIComponent(commentId)}`, {
    method: 'PATCH',
    body: input,
  });
}

export function restoreTrickVersion(
  trickId: string,
  versionId: string,
): Promise<ClientResult<TrickDetail>> {
  return clientFetch<TrickDetail>(
    `/api/studio/tricks/${encodeURIComponent(trickId)}/versions/${encodeURIComponent(versionId)}/restore`,
    { method: 'POST' },
  );
}

export function restoreFactVersion(
  factId: string,
  versionId: string,
): Promise<ClientResult<FactDetail>> {
  return clientFetch<FactDetail>(
    `/api/studio/facts/${encodeURIComponent(factId)}/versions/${encodeURIComponent(versionId)}/restore`,
    { method: 'POST' },
  );
}
