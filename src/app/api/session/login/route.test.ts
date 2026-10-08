import { describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/session/login/route';

const session = {
  accessToken: 'access-secret',
  refreshToken: 'refresh-secret',
  tokenType: 'Bearer' as const,
  expiresIn: 900,
  user: {
    id: 'user-1',
    email: 'staff@example.com',
    displayName: 'Staff Member',
    role: 'STAFF' as const,
    isAdmin: false,
    permissions: [],
  },
};

function apiResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as unknown as Response;
}

function loginRequest(headers: Record<string, string>, body: unknown): Request {
  return new Request('http://studio.local/api/session/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const validHeaders = {
  cookie: 'csrf=csrf-value',
  'x-csrf-token': 'csrf-value',
  origin: 'http://studio.local',
  host: 'studio.local',
};

const validBody = { email: 'staff@example.com', password: 'secret-password' };

describe('POST /api/session/login', () => {
  it('stores tokens only in httpOnly cookies and omits them from the body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(apiResponse(session)));

    const response = await POST(loginRequest(validHeaders, validBody));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ user: session.user });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('access-secret');
    expect(serialized).not.toContain('refresh-secret');

    const cookies = response.headers.getSetCookie();
    const accessCookie = cookies.find((cookie) => cookie.startsWith('studio_access='));
    expect(accessCookie).toBeDefined();
    expect(accessCookie).toContain('HttpOnly');
    expect(accessCookie).toContain('SameSite=lax');
    expect(accessCookie).not.toContain('Secure');

    const refreshCookie = cookies.find((cookie) => cookie.startsWith('studio_refresh='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');
  });

  it('rejects a request whose CSRF header does not match the cookie', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      loginRequest({ ...validHeaders, 'x-csrf-token': 'different' }, validBody),
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a mismatched Origin', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      loginRequest({ ...validHeaders, origin: 'http://evil.example' }, validBody),
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a generic 401 for bad credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(apiResponse({ message: 'Invalid' }, 401, 'Unauthorized')),
    );

    const response = await POST(loginRequest(validHeaders, validBody));
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.message).toBe('Email or password is incorrect.');
    expect(
      response.headers.getSetCookie().some((cookie) => cookie.startsWith('studio_access=')),
    ).toBe(false);
  });

  it('refuses a Learner account without setting session cookies', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(apiResponse({ ...session, user: { ...session.user, role: 'LEARNER' } })),
    );

    const response = await POST(loginRequest(validHeaders, validBody));
    expect(response.status).toBe(403);

    const setCookies = response.headers.getSetCookie();
    const accessCookie = setCookies.find((cookie) => cookie.startsWith('studio_access='));
    // The access cookie is explicitly cleared, never populated with a token.
    expect(accessCookie).toContain('Max-Age=0');
    expect(accessCookie).not.toContain('access-secret');
    expect(await response.json()).toMatchObject({ statusCode: 403 });
  });
});
