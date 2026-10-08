import type {
  ActivityPage,
  CompletionReport,
  Permission,
  ResetPasswordResponse,
  UserPermission,
  UserSummary,
} from '@/lib/api-client';
import { clientFetch, type ClientResult } from './http';

/** Client calls to the Admin BFF proxies; the server authorizes each one. */

export function listUsers(): Promise<ClientResult<UserSummary[]>> {
  return clientFetch<UserSummary[]>('/api/admin/users');
}

export function listPermissionCatalogue(): Promise<ClientResult<Permission[]>> {
  return clientFetch<Permission[]>('/api/admin/permissions');
}

export function listUserPermissions(userId: string): Promise<ClientResult<UserPermission[]>> {
  return clientFetch<UserPermission[]>(
    `/api/admin/users/${encodeURIComponent(userId)}/permissions`,
  );
}

export function grantPermission(
  userId: string,
  key: string,
): Promise<ClientResult<UserPermission[]>> {
  return clientFetch<UserPermission[]>(
    `/api/admin/users/${encodeURIComponent(userId)}/permissions`,
    { method: 'POST', body: { key } },
  );
}

export function revokePermission(
  userId: string,
  key: string,
): Promise<ClientResult<{ success: true; removed: boolean }>> {
  return clientFetch<{ success: true; removed: boolean }>(
    `/api/admin/users/${encodeURIComponent(userId)}/permissions/${encodeURIComponent(key)}`,
    { method: 'DELETE' },
  );
}

/**
 * Lockout recovery (D-047). The plaintext is sent once and never echoed back;
 * the server revokes the target's sessions and audits the action.
 */
export function resetUserPassword(
  userId: string,
  password: string,
): Promise<ClientResult<ResetPasswordResponse>> {
  return clientFetch<ResetPasswordResponse>(
    `/api/admin/users/${encodeURIComponent(userId)}/reset-password`,
    { method: 'POST', body: { password } },
  );
}

/* ------------------------------------------------------------------ *
 * Phase 06 — Operations read models
 * ------------------------------------------------------------------ */

export function getCompletion(): Promise<ClientResult<CompletionReport>> {
  return clientFetch<CompletionReport>('/api/admin/ops/completion');
}

export function getActivity(limit: number, offset: number): Promise<ClientResult<ActivityPage>> {
  const query = `?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`;
  return clientFetch<ActivityPage>(`/api/admin/ops/activity${query}`);
}
