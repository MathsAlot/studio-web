import { CSRF_COOKIE, CSRF_HEADER } from '@/lib/auth/constants';

/** Browser-only helpers for talking to the same-origin BFF. */

export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const prefix = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

/**
 * Return a CSRF token, seeding one via the session endpoint when the middleware
 * has not set it yet. The token is readable by design (double submit).
 */
export async function ensureCsrfToken(): Promise<string> {
  const existing = readCookie(CSRF_COOKIE);
  if (existing) {
    return existing;
  }
  await fetch('/api/session', { credentials: 'same-origin', cache: 'no-store' });
  const seeded = readCookie(CSRF_COOKIE);
  if (!seeded) {
    throw new Error('Missing CSRF token. Reload the page and try again.');
  }
  return seeded;
}

export type ClientResult<T> =
  { ok: true; data: T } | { ok: false; status: number; message: string };

interface ClientRequest {
  method?: string;
  body?: unknown;
}

/** Same-origin fetch that attaches the CSRF header to mutating requests. */
export async function clientFetch<T>(
  path: string,
  request: ClientRequest = {},
): Promise<ClientResult<T>> {
  const method = request.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (request.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      headers[CSRF_HEADER] = await ensureCsrfToken();
    } catch (error) {
      return {
        ok: false,
        status: 0,
        message: error instanceof Error ? error.message : 'Missing CSRF token.',
      };
    }
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    return { ok: false, status: 0, message: 'The service is unavailable. Please try again.' };
  }

  const payload = await readJson(response);
  if (!response.ok) {
    return { ok: false, status: response.status, message: messageFrom(payload) };
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

function messageFrom(payload: unknown): string {
  if (typeof payload === 'object' && payload !== null) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
    if (Array.isArray(message) && message.every((entry) => typeof entry === 'string')) {
      return message.join(' ');
    }
  }
  return 'Something went wrong. Please try again.';
}
