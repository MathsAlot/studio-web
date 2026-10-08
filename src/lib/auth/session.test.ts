import { describe, expect, it, vi } from 'vitest';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth/constants';
import { resolveSession, type CookieSource } from '@/lib/auth/session';
import type { AuthSession, MeView } from '@/lib/api-client';

const user: MeView = {
  id: 'user-1',
  email: 'staff@example.com',
  displayName: 'Staff Member',
  role: 'STAFF',
  isAdmin: false,
  permissions: ['trick.content.write'],
};

const rotated: AuthSession = {
  accessToken: 'access-2',
  refreshToken: 'refresh-2',
  tokenType: 'Bearer',
  expiresIn: 900,
  user,
};

function jsonResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as unknown as Response;
}

function jar(values: Record<string, string>): CookieSource {
  return { get: (name) => values[name] };
}

describe('resolveSession', () => {
  it('returns anonymous when no session cookies exist', async () => {
    const fetchMock = vi.fn();
    const result = await resolveSession(jar({}), fetchMock as unknown as typeof fetch);

    expect(result).toEqual({ status: 'anonymous' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('authenticates with a valid access cookie without refreshing', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(user));

    const result = await resolveSession(
      jar({ [ACCESS_COOKIE]: 'access-1' }),
      fetchMock as unknown as typeof fetch,
    );

    expect(result.status).toBe('authenticated');
    if (result.status === 'authenticated') {
      expect(result.user).toEqual(user);
      expect(result.accessToken).toBe('access-1');
      expect(result.refreshedTokens).toBeNull();
    }
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/me');
  });

  it('rotates tokens when the access token is expired', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/me')) {
        return Promise.resolve(jsonResponse({ message: 'expired' }, 401, 'Unauthorized'));
      }
      return Promise.resolve(jsonResponse(rotated));
    });

    const result = await resolveSession(
      jar({ [ACCESS_COOKIE]: 'access-1', [REFRESH_COOKIE]: 'refresh-1' }),
      fetchMock as unknown as typeof fetch,
    );

    expect(result.status).toBe('authenticated');
    if (result.status === 'authenticated') {
      expect(result.accessToken).toBe('access-2');
      expect(result.refreshedTokens).toEqual(rotated);
    }
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/api/auth/refresh');
  });

  it('reports rejected when the refresh token fails or is reused', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/me')) {
        return Promise.resolve(jsonResponse({ message: 'expired' }, 401, 'Unauthorized'));
      }
      return Promise.resolve(jsonResponse({ message: 'reused' }, 401, 'Unauthorized'));
    });

    const result = await resolveSession(
      jar({ [ACCESS_COOKIE]: 'access-1', [REFRESH_COOKIE]: 'refresh-1' }),
      fetchMock as unknown as typeof fetch,
    );

    expect(result.status).toBe('rejected');
  });

  it('reports forbidden when the account is a Learner', async () => {
    const learner = { ...user, role: 'LEARNER' as const };
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/me')) {
        return Promise.resolve(jsonResponse({ message: 'Learner accounts' }, 403, 'Forbidden'));
      }
      return Promise.resolve(jsonResponse({ ...rotated, user: learner }));
    });

    const result = await resolveSession(
      jar({ [ACCESS_COOKIE]: 'access-1', [REFRESH_COOKIE]: 'refresh-1' }),
      fetchMock as unknown as typeof fetch,
    );

    expect(result.status).toBe('forbidden');
  });

  it('does not destroy cookies on a transient API failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ message: 'boom' }, 500, 'Server Error'));

    const result = await resolveSession(
      jar({ [ACCESS_COOKIE]: 'access-1' }),
      fetchMock as unknown as typeof fetch,
    );

    expect(result.status).toBe('unavailable');
  });
});
