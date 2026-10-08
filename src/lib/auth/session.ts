import { apiGetMe, apiRefresh, type AuthSession, type MeView } from '@/lib/api-client';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './constants';

/** Minimal read-only view of a cookie jar; satisfied by route/server stores. */
export interface CookieSource {
  get(name: string): string | undefined;
}

export type SessionResolution =
  /** A valid Studio session; `refreshedTokens` is set when cookies must rotate. */
  | {
      status: 'authenticated';
      user: MeView;
      accessToken: string;
      refreshedTokens: AuthSession | null;
    }
  /** No session cookies at all. */
  | { status: 'anonymous' }
  /** API refused the account (e.g. a Learner token): clear and show a message. */
  | { status: 'forbidden' }
  /** Access token invalid and refresh failed/reused: clear cookies. */
  | { status: 'rejected' }
  /** API unreachable or failing: do not destroy cookies on a transient blip. */
  | { status: 'unavailable' };

/**
 * Resolve the current Studio session from cookies.
 *
 * - Valid access token → authenticated.
 * - Expired/invalid access token → rotate via the refresh cookie.
 * - Refresh failure or token-reuse revocation → `rejected` (caller clears cookies).
 * - Transient API failure → `unavailable` (caller keeps cookies).
 *
 * Pure apart from the injected `fetch`, so it is unit-testable with mocked fetch.
 */
export async function resolveSession(
  source: CookieSource,
  fetchImpl: typeof fetch = fetch,
): Promise<SessionResolution> {
  const accessToken = source.get(ACCESS_COOKIE);
  const refreshToken = source.get(REFRESH_COOKIE);

  if (!accessToken && !refreshToken) {
    return { status: 'anonymous' };
  }

  if (accessToken) {
    const me = await apiGetMe(accessToken, fetchImpl);
    if (me.ok) {
      return { status: 'authenticated', user: me.data, accessToken, refreshedTokens: null };
    }
    if (me.status === 403) {
      return { status: 'forbidden' };
    }
    if (me.status !== 401 && me.status !== 0) {
      return { status: 'unavailable' };
    }
    if (me.status === 0) {
      return { status: 'unavailable' };
    }
  }

  if (!refreshToken) {
    return { status: 'rejected' };
  }

  const refreshed = await apiRefresh(refreshToken, fetchImpl);
  if (refreshed.ok) {
    if (refreshed.data.user.role === 'LEARNER') {
      return { status: 'forbidden' };
    }
    return {
      status: 'authenticated',
      user: refreshed.data.user,
      accessToken: refreshed.data.accessToken,
      refreshedTokens: refreshed.data,
    };
  }

  if (refreshed.status === 0 || refreshed.status >= 500) {
    return { status: 'unavailable' };
  }

  return { status: 'rejected' };
}
