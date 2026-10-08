import { resolveApiUrl } from '@/lib/env';
import type { components } from '@/types/api';

/**
 * Server-side typed client for the Studio API.
 *
 * Every function is derived from the generated OpenAPI types — no hand-written
 * contract types. Import only from server code: it reads the server-only
 * `API_BASE_URL` and is never bundled to the browser.
 */

type Schema<K extends keyof components['schemas']> = components['schemas'][K];

export type AuthSession = Schema<'AuthSessionDto'>;
export type SessionUser = Schema<'SessionUserDto'>;
export type MeView = Schema<'MeDto'>;
export type UserSummary = Schema<'UserSummaryDto'>;
export type UserPermission = Schema<'UserPermissionDto'>;
export type Permission = Schema<'PermissionDto'>;
export type LoginInput = Schema<'LoginDto'>;
export type CreateUserInput = Schema<'CreateUserDto'>;

export type WorldSummary = Schema<'WorldSummaryDto'>;
export type WorldRollup = Schema<'WorldRollupDto'>;
export type TrickSummary = Schema<'TrickSummaryDto'>;
export type TrickDetail = Schema<'TrickDetailDto'>;
export type TrickVariant = Schema<'VariantDto'>;
export type Completeness = Schema<'CompletenessDto'>;
export type Preview = Schema<'PreviewDto'>;
export type TrickVersion = Schema<'TrickVersionDto'>;
export type ReorderResponse = Schema<'ReorderResponseDto'>;
export type TrickKind = TrickSummary['kind'];
export type AgeTier = Completeness['missingTiers'][number];

/* Phase 03 — Curriculum / Sequence / Trick roles */
export type CurriculumSummary = Schema<'CurriculumSummaryDto'>;
export type CurriculumDetail = Schema<'CurriculumDetailDto'>;
export type CurriculumCompletion = Schema<'CurriculumCompletionDto'>;
export type SequenceDetail = Schema<'SequenceDetailDto'>;
export type SequenceCompletion = Schema<'SequenceCompletionDto'>;
export type SequenceTrick = Schema<'SequenceTrickDto'>;
export type SequenceRole = SequenceTrick['role'];
export type ContentStatus = CurriculumSummary['status'];

export type CreateWorldInput = Schema<'CreateWorldDto'>;
export type UpdateWorldInput = Schema<'UpdateWorldDto'>;
export type CreateTrickInput = Schema<'CreateTrickDto'>;
export type UpdateTrickInput = Schema<'UpdateTrickDto'>;
export type UpsertVariantInput = Schema<'UpsertVariantDto'>;
export type CreateCurriculumInput = Schema<'CreateCurriculumDto'>;
export type UpdateCurriculumInput = Schema<'UpdateCurriculumDto'>;
export type CreateSequenceInput = Schema<'CreateSequenceDto'>;
export type UpdateSequenceInput = Schema<'UpdateSequenceDto'>;
export type SequenceTrickAssignment = Schema<'SequenceTrickAssignmentDto'>;
export type SetSequenceTricksInput = Schema<'SetSequenceTricksDto'>;

/* ------------------------------------------------------------------ *
 * Phase 04 — Nitty Gritty Families, Facts, Insertions
 * ------------------------------------------------------------------ */

export type FamilyType = Schema<'FamilySummaryDto'>['type'];
export type FactType = Schema<'FactDetailDto'>['factType'];
export type FactTypeMetadata = Schema<'FactTypeDto'>;
export type FactFieldMetadata = Schema<'FactFieldDto'>;
export type FamilySummary = Schema<'FamilySummaryDto'>;
export type FamilyDetail = Schema<'FamilyDetailDto'>;
export type FactDetail = Schema<'FactDetailDto'>;
export type FactValidation = Schema<'FactValidationDto'>;
export type FactVersion = Schema<'FactVersionDto'>;
export type Insertion = Schema<'InsertionDto'>;
export type InsertionType = Insertion['insertionType'];
export type ReorderFactsResponse = Schema<'OrderedIdsResponseDto'>;

export type CreateFamilyInput = Schema<'CreateFamilyDto'>;
export type UpdateFamilyInput = Schema<'UpdateFamilyDto'>;

export type CreateFactInput = Schema<'CreateFactDto'>;
export type UpdateFactInput = Schema<'UpdateFactDto'>;

export type SetInsertionsInput = Schema<'SetInsertionsDto'>;

/* ------------------------------------------------------------------ *
 * Phase 05 — Vetting, review, comments, history
 * ------------------------------------------------------------------ */

export type VettingStatus = TrickDetail['vettingStatus'];
export type ReviewStatus = TrickDetail['reviewStatus'];
export type DraftSource = TrickDetail['draftSource'];
export type Comment = Schema<'CommentDto'>;

/**
 * Phase 05 trust mutations return the authoritative re-read entity
 * (`TrickDetail`/`FactDetail`), so callers can render the server state directly
 * rather than through an untyped acknowledgement alias.
 */

export type SetTrickVettingInput = Schema<'SetTrickVettingDto'>;
export type SetFactVettingInput = Schema<'SetFactVettingDto'>;
export type SetReviewInput = Schema<'SetReviewDto'>;
export type CreateCommentInput = Schema<'CreateCommentDto'>;
export type UpdateCommentInput = Schema<'UpdateCommentDto'>;

/* ------------------------------------------------------------------ *
 * Phase 06 — Operations and administration
 * ------------------------------------------------------------------ */

export type CompletionReport = Schema<'CompletionReportDto'>;
export type WorldCompletion = Schema<'WorldCompletionDto'>;
export type CompletionSummary = Schema<'CompletionSummaryDto'>;
export type ActivityPage = Schema<'ActivityPageDto'>;
export type ActivityItem = Schema<'ActivityItemDto'>;
export type ResetUserPasswordInput = Schema<'ResetUserPasswordDto'>;
export type ResetPasswordResponse = Schema<'ResetPasswordResponseDto'>;

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

/** Network/transport failures use status 0 so callers can distinguish them. */
const NETWORK_ERROR = 'The service is unavailable. Please try again.';
const UNEXPECTED_ERROR = 'Something went wrong. Please try again.';

interface RequestOptions {
  method?: string;
  body?: unknown;
  accessToken?: string;
  signal?: AbortSignal;
}

async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
  fetchImpl: typeof fetch = fetch,
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  let response: Response;
  try {
    response = await fetchImpl(resolveApiUrl(path), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: 'no-store',
      signal: options.signal,
    });
  } catch {
    return { ok: false, status: 0, message: NETWORK_ERROR };
  }

  const payload = await readJson(response);

  if (!response.ok) {
    return { ok: false, status: response.status, message: errorMessage(payload, response) };
  }

  return { ok: true, data: payload as T };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function errorMessage(payload: unknown, response: Response): string {
  if (typeof payload === 'object' && payload !== null) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
    if (Array.isArray(message) && message.every((entry) => typeof entry === 'string')) {
      return message.join(' ');
    }
  }
  const label = `${response.status} ${response.statusText}`.trim();
  return label.length > 0 ? `Request failed (${label}).` : UNEXPECTED_ERROR;
}

export function apiLogin(
  input: LoginInput,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<AuthSession>> {
  return apiRequest<AuthSession>('/api/auth/login', { method: 'POST', body: input }, fetchImpl);
}

export function apiRefresh(
  refreshToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<AuthSession>> {
  return apiRequest<AuthSession>(
    '/api/auth/refresh',
    { method: 'POST', body: { refreshToken } },
    fetchImpl,
  );
}

export function apiLogout(
  refreshToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<{ success: true }>> {
  return apiRequest<{ success: true }>(
    '/api/auth/logout',
    { method: 'POST', body: { refreshToken } },
    fetchImpl,
  );
}

export function apiGetMe(
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<MeView>> {
  return apiRequest<MeView>('/api/me', { accessToken }, fetchImpl);
}

export function apiListUsers(
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<UserSummary[]>> {
  return apiRequest<UserSummary[]>('/api/users', { accessToken }, fetchImpl);
}

export function apiListPermissions(
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<Permission[]>> {
  return apiRequest<Permission[]>('/api/permissions', { accessToken }, fetchImpl);
}

export function apiListUserPermissions(
  userId: string,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<UserPermission[]>> {
  return apiRequest<UserPermission[]>(
    `/api/users/${encodeURIComponent(userId)}/permissions`,
    { accessToken },
    fetchImpl,
  );
}

export function apiGrantPermission(
  userId: string,
  key: string,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<UserPermission[]>> {
  return apiRequest<UserPermission[]>(
    `/api/users/${encodeURIComponent(userId)}/permissions`,
    { method: 'POST', body: { key }, accessToken },
    fetchImpl,
  );
}

export function apiRevokePermission(
  userId: string,
  key: string,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<{ success: true; removed: boolean }>> {
  return apiRequest<{ success: true; removed: boolean }>(
    `/api/users/${encodeURIComponent(userId)}/permissions/${encodeURIComponent(key)}`,
    { method: 'DELETE', accessToken },
    fetchImpl,
  );
}

export function apiCreateUser(
  input: CreateUserInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<UserSummary>> {
  return apiRequest<UserSummary>(
    '/api/users',
    { method: 'POST', body: input, accessToken },
    fetchImpl,
  );
}

/* ------------------------------------------------------------------ *
 * Phase 06 — Operations and administration
 * ------------------------------------------------------------------ */

export function apiGetCompletion(
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<CompletionReport>> {
  return apiRequest<CompletionReport>('/api/ops/completion', { accessToken }, fetchImpl);
}

export function apiGetActivity(
  limit: number,
  offset: number,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<ActivityPage>> {
  const query = `?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`;
  return apiRequest<ActivityPage>(`/api/ops/activity${query}`, { accessToken }, fetchImpl);
}

export function apiResetUserPassword(
  userId: string,
  input: ResetUserPasswordInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<ResetPasswordResponse>> {
  return apiRequest<ResetPasswordResponse>(
    `/api/users/${encodeURIComponent(userId)}/reset-password`,
    { method: 'POST', body: input, accessToken },
    fetchImpl,
  );
}

/* ------------------------------------------------------------------ *
 * Phase 02 — World / Trick / age-tier content
 * ------------------------------------------------------------------ */

export function apiListWorlds(
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<WorldSummary[]>> {
  return apiRequest<WorldSummary[]>('/api/worlds', { accessToken }, fetchImpl);
}

export function apiCreateWorld(
  input: CreateWorldInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<WorldSummary>> {
  return apiRequest<WorldSummary>(
    '/api/worlds',
    { method: 'POST', body: input, accessToken },
    fetchImpl,
  );
}

export function apiUpdateWorld(
  worldId: string,
  input: UpdateWorldInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<WorldSummary>> {
  return apiRequest<WorldSummary>(
    `/api/worlds/${encodeURIComponent(worldId)}`,
    { method: 'PATCH', body: input, accessToken },
    fetchImpl,
  );
}

export function apiReorderWorlds(
  orderedIds: string[],
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<ReorderResponse>> {
  return apiRequest<ReorderResponse>(
    '/api/worlds/order',
    { method: 'PUT', body: { orderedIds }, accessToken },
    fetchImpl,
  );
}

export function apiCreateTrick(
  worldId: string,
  input: CreateTrickInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<TrickDetail>> {
  return apiRequest<TrickDetail>(
    `/api/worlds/${encodeURIComponent(worldId)}/tricks`,
    { method: 'POST', body: input, accessToken },
    fetchImpl,
  );
}

export function apiReorderTricks(
  worldId: string,
  orderedIds: string[],
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<ReorderResponse>> {
  return apiRequest<ReorderResponse>(
    `/api/worlds/${encodeURIComponent(worldId)}/tricks/order`,
    { method: 'PUT', body: { orderedIds }, accessToken },
    fetchImpl,
  );
}

export function apiGetTrick(
  trickId: string,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<TrickDetail>> {
  return apiRequest<TrickDetail>(
    `/api/tricks/${encodeURIComponent(trickId)}`,
    { accessToken },
    fetchImpl,
  );
}

export function apiUpdateTrick(
  trickId: string,
  input: UpdateTrickInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<TrickDetail>> {
  return apiRequest<TrickDetail>(
    `/api/tricks/${encodeURIComponent(trickId)}`,
    { method: 'PATCH', body: input, accessToken },
    fetchImpl,
  );
}

export function apiUpsertVariant(
  trickId: string,
  ageTier: AgeTier,
  input: UpsertVariantInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<TrickDetail>> {
  return apiRequest<TrickDetail>(
    `/api/tricks/${encodeURIComponent(trickId)}/variants/${encodeURIComponent(ageTier)}`,
    { method: 'PUT', body: input, accessToken },
    fetchImpl,
  );
}

export function apiPreviewTrick(
  trickId: string,
  ageTier: AgeTier,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<Preview>> {
  return apiRequest<Preview>(
    `/api/tricks/${encodeURIComponent(trickId)}/preview?ageTier=${encodeURIComponent(ageTier)}`,
    { accessToken },
    fetchImpl,
  );
}

export function apiListTrickVersions(
  trickId: string,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<TrickVersion[]>> {
  return apiRequest<TrickVersion[]>(
    `/api/tricks/${encodeURIComponent(trickId)}/versions`,
    { accessToken },
    fetchImpl,
  );
}

/* ------------------------------------------------------------------ *
 * Phase 03 — Curriculum / Sequence / Trick roles
 * ------------------------------------------------------------------ */

export function apiListCurriculums(
  worldId: string,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<CurriculumSummary[]>> {
  return apiRequest<CurriculumSummary[]>(
    `/api/worlds/${encodeURIComponent(worldId)}/curriculums`,
    { accessToken },
    fetchImpl,
  );
}

export function apiCreateCurriculum(
  worldId: string,
  input: CreateCurriculumInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<CurriculumSummary>> {
  return apiRequest<CurriculumSummary>(
    `/api/worlds/${encodeURIComponent(worldId)}/curriculums`,
    { method: 'POST', body: input, accessToken },
    fetchImpl,
  );
}

export function apiGetCurriculum(
  curriculumId: string,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<CurriculumDetail>> {
  return apiRequest<CurriculumDetail>(
    `/api/curriculums/${encodeURIComponent(curriculumId)}`,
    { accessToken },
    fetchImpl,
  );
}

export function apiUpdateCurriculum(
  curriculumId: string,
  input: UpdateCurriculumInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<CurriculumDetail>> {
  return apiRequest<CurriculumDetail>(
    `/api/curriculums/${encodeURIComponent(curriculumId)}`,
    { method: 'PATCH', body: input, accessToken },
    fetchImpl,
  );
}

export function apiCreateSequence(
  curriculumId: string,
  input: CreateSequenceInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<SequenceDetail>> {
  return apiRequest<SequenceDetail>(
    `/api/curriculums/${encodeURIComponent(curriculumId)}/sequences`,
    { method: 'POST', body: input, accessToken },
    fetchImpl,
  );
}

export function apiUpdateSequence(
  sequenceId: string,
  input: UpdateSequenceInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<SequenceDetail>> {
  return apiRequest<SequenceDetail>(
    `/api/sequences/${encodeURIComponent(sequenceId)}`,
    { method: 'PATCH', body: input, accessToken },
    fetchImpl,
  );
}

export function apiReorderSequences(
  curriculumId: string,
  orderedIds: string[],
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<ReorderResponse>> {
  return apiRequest<ReorderResponse>(
    `/api/curriculums/${encodeURIComponent(curriculumId)}/sequences/order`,
    { method: 'PUT', body: { orderedIds }, accessToken },
    fetchImpl,
  );
}

export function apiSetSequenceTricks(
  sequenceId: string,
  input: SetSequenceTricksInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<SequenceDetail>> {
  return apiRequest<SequenceDetail>(
    `/api/sequences/${encodeURIComponent(sequenceId)}/tricks`,
    { method: 'PUT', body: input, accessToken },
    fetchImpl,
  );
}

/* ------------------------------------------------------------------ *
 * Phase 04 — Nitty Gritty Families, Facts, Insertions
 * ------------------------------------------------------------------ */

export function apiListFactTypes(
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<FactTypeMetadata[]>> {
  return apiRequest<FactTypeMetadata[]>('/api/fact-types', { accessToken }, fetchImpl);
}

export function apiListFamilies(
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<FamilySummary[]>> {
  return apiRequest<FamilySummary[]>('/api/families', { accessToken }, fetchImpl);
}

export function apiCreateFamily(
  input: CreateFamilyInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<FamilyDetail>> {
  return apiRequest<FamilyDetail>(
    '/api/families',
    { method: 'POST', body: input, accessToken },
    fetchImpl,
  );
}

export function apiGetFamily(
  familyId: string,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<FamilyDetail>> {
  return apiRequest<FamilyDetail>(
    `/api/families/${encodeURIComponent(familyId)}`,
    { accessToken },
    fetchImpl,
  );
}

export function apiUpdateFamily(
  familyId: string,
  input: UpdateFamilyInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<FamilyDetail>> {
  return apiRequest<FamilyDetail>(
    `/api/families/${encodeURIComponent(familyId)}`,
    { method: 'PATCH', body: input, accessToken },
    fetchImpl,
  );
}

export function apiCreateFact(
  familyId: string,
  input: CreateFactInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<FactDetail>> {
  return apiRequest<FactDetail>(
    `/api/families/${encodeURIComponent(familyId)}/facts`,
    { method: 'POST', body: input, accessToken },
    fetchImpl,
  );
}

export function apiReorderFacts(
  familyId: string,
  orderedIds: string[],
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<ReorderFactsResponse>> {
  return apiRequest<ReorderFactsResponse>(
    `/api/families/${encodeURIComponent(familyId)}/facts/order`,
    { method: 'PUT', body: { orderedIds }, accessToken },
    fetchImpl,
  );
}

export function apiGetFact(
  factId: string,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<FactDetail>> {
  return apiRequest<FactDetail>(
    `/api/facts/${encodeURIComponent(factId)}`,
    { accessToken },
    fetchImpl,
  );
}

export function apiUpdateFact(
  factId: string,
  input: UpdateFactInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<FactDetail>> {
  return apiRequest<FactDetail>(
    `/api/facts/${encodeURIComponent(factId)}`,
    { method: 'PATCH', body: input, accessToken },
    fetchImpl,
  );
}

export function apiListFactVersions(
  factId: string,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<FactVersion[]>> {
  return apiRequest<FactVersion[]>(
    `/api/facts/${encodeURIComponent(factId)}/versions`,
    { accessToken },
    fetchImpl,
  );
}

export function apiListInsertions(
  sequenceId: string,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<Insertion[]>> {
  return apiRequest<Insertion[]>(
    `/api/sequences/${encodeURIComponent(sequenceId)}/insertions`,
    { accessToken },
    fetchImpl,
  );
}

export function apiSetInsertions(
  sequenceId: string,
  input: SetInsertionsInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<Insertion[]>> {
  return apiRequest<Insertion[]>(
    `/api/sequences/${encodeURIComponent(sequenceId)}/insertions`,
    { method: 'PUT', body: input, accessToken },
    fetchImpl,
  );
}

/* ------------------------------------------------------------------ *
 * Phase 05 — Vetting, review, publish, comments, restore
 * ------------------------------------------------------------------ */

export function apiSetTrickVetting(
  trickId: string,
  input: SetTrickVettingInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<TrickDetail>> {
  return apiRequest<TrickDetail>(
    `/api/tricks/${encodeURIComponent(trickId)}/vetting`,
    { method: 'PUT', body: input, accessToken },
    fetchImpl,
  );
}

export function apiSetFactVetting(
  factId: string,
  input: SetFactVettingInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<FactDetail>> {
  return apiRequest<FactDetail>(
    `/api/facts/${encodeURIComponent(factId)}/vetting`,
    { method: 'PUT', body: input, accessToken },
    fetchImpl,
  );
}

export function apiSetTrickReview(
  trickId: string,
  input: SetReviewInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<TrickDetail>> {
  return apiRequest<TrickDetail>(
    `/api/tricks/${encodeURIComponent(trickId)}/review`,
    { method: 'PUT', body: input, accessToken },
    fetchImpl,
  );
}

export function apiSetVariantReview(
  variantId: string,
  input: SetReviewInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<TrickDetail>> {
  return apiRequest<TrickDetail>(
    `/api/trick-variants/${encodeURIComponent(variantId)}/review`,
    { method: 'PUT', body: input, accessToken },
    fetchImpl,
  );
}

export function apiSetFactReview(
  factId: string,
  input: SetReviewInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<FactDetail>> {
  return apiRequest<FactDetail>(
    `/api/facts/${encodeURIComponent(factId)}/review`,
    { method: 'PUT', body: input, accessToken },
    fetchImpl,
  );
}

export function apiPublishTrick(
  trickId: string,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<TrickDetail>> {
  return apiRequest<TrickDetail>(
    `/api/tricks/${encodeURIComponent(trickId)}/publish`,
    { method: 'POST', accessToken },
    fetchImpl,
  );
}

export function apiUnpublishTrick(
  trickId: string,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<TrickDetail>> {
  return apiRequest<TrickDetail>(
    `/api/tricks/${encodeURIComponent(trickId)}/unpublish`,
    { method: 'POST', accessToken },
    fetchImpl,
  );
}

export function apiPublishFact(
  factId: string,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<FactDetail>> {
  return apiRequest<FactDetail>(
    `/api/facts/${encodeURIComponent(factId)}/publish`,
    { method: 'POST', accessToken },
    fetchImpl,
  );
}

export function apiListComments(
  trickId: string,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<Comment[]>> {
  return apiRequest<Comment[]>(
    `/api/tricks/${encodeURIComponent(trickId)}/comments`,
    { accessToken },
    fetchImpl,
  );
}

export function apiCreateComment(
  trickId: string,
  input: CreateCommentInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<Comment>> {
  return apiRequest<Comment>(
    `/api/tricks/${encodeURIComponent(trickId)}/comments`,
    { method: 'POST', body: input, accessToken },
    fetchImpl,
  );
}

export function apiUpdateComment(
  commentId: string,
  input: UpdateCommentInput,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<Comment>> {
  return apiRequest<Comment>(
    `/api/comments/${encodeURIComponent(commentId)}`,
    { method: 'PATCH', body: input, accessToken },
    fetchImpl,
  );
}

export function apiRestoreTrickVersion(
  trickId: string,
  versionId: string,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<TrickDetail>> {
  return apiRequest<TrickDetail>(
    `/api/tricks/${encodeURIComponent(trickId)}/versions/${encodeURIComponent(versionId)}/restore`,
    { method: 'POST', accessToken },
    fetchImpl,
  );
}

export function apiRestoreFactVersion(
  factId: string,
  versionId: string,
  accessToken: string,
  fetchImpl?: typeof fetch,
): Promise<ApiResult<FactDetail>> {
  return apiRequest<FactDetail>(
    `/api/facts/${encodeURIComponent(factId)}/versions/${encodeURIComponent(versionId)}/restore`,
    { method: 'POST', accessToken },
    fetchImpl,
  );
}
