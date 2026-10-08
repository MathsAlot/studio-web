import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextResponse } from 'next/server';
import type { AuthSession, MeView } from '@/lib/api-client';
import { ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE } from './constants';
import {
  accessCookieAttributes,
  clearAttributes,
  csrfCookieAttributes,
  refreshCookieAttributes,
  ALL_SESSION_COOKIE_NAMES,
} from './cookies';
import { resolveSession, type CookieSource, type SessionResolution } from './session';
import { randomToken } from './tokens';

async function readResolution(): Promise<{
  store: Awaited<ReturnType<typeof cookies>>;
  resolution: SessionResolution;
}> {
  const store = await cookies();
  const source: CookieSource = { get: (name) => store.get(name)?.value };
  const resolution = await resolveSession(source);
  return { store, resolution };
}

/**
 * Best-effort persistence of rotated tokens. In a Server Component the cookie
 * store is read-only and `set` throws; the BFF route handlers are the durable
 * writers, so a page render simply proceeds with the fresh in-memory token.
 */
async function persistTokens(
  store: Awaited<ReturnType<typeof cookies>>,
  tokens: AuthSession,
): Promise<void> {
  try {
    store.set(ACCESS_COOKIE, tokens.accessToken, accessCookieAttributes());
    store.set(REFRESH_COOKIE, tokens.refreshToken, refreshCookieAttributes());
  } catch {
    // Read-only context (Server Component). Route handlers persist instead.
  }
}

/** Current Studio user, or `null` when unauthenticated/refused/unavailable. */
export async function getServerSession(): Promise<MeView | null> {
  const { store, resolution } = await readResolution();
  if (resolution.status !== 'authenticated') {
    return null;
  }
  if (resolution.refreshedTokens) {
    await persistTokens(store, resolution.refreshedTokens);
  }
  return resolution.user;
}

/**
 * Current user plus a usable access token, refreshing cookies when needed.
 * Returns `null` for unauthenticated, refused, or temporarily unavailable.
 */
export async function getServerAccessToken(): Promise<{
  user: MeView;
  accessToken: string;
} | null> {
  const { store, resolution } = await readResolution();
  if (resolution.status !== 'authenticated') {
    return null;
  }
  if (resolution.refreshedTokens) {
    await persistTokens(store, resolution.refreshedTokens);
  }
  return { user: resolution.user, accessToken: resolution.accessToken };
}

/**
 * Guard for protected pages. Redirects anonymous visitors to `/login` and
 * refuses Learner accounts with a distinct, accessible message. The API is the
 * authority; this only shapes navigation.
 */
export async function requireStaffSession(nextPath = '/'): Promise<MeView> {
  const { store, resolution } = await readResolution();

  if (resolution.status === 'authenticated') {
    if (resolution.refreshedTokens) {
      await persistTokens(store, resolution.refreshedTokens);
    }
    return resolution.user;
  }

  if (resolution.status === 'forbidden') {
    redirect('/login?error=forbidden');
  }

  redirect(`/login?next=${encodeURIComponent(nextPath)}`);
}

/** Write a rotated token pair onto a BFF JSON response. */
export function applySessionCookies(response: NextResponse, tokens: AuthSession): void {
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, accessCookieAttributes());
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, refreshCookieAttributes());
}

/** Clear every Studio cookie and issue a fresh CSRF token for the login page. */
export function clearSessionCookies(response: NextResponse): void {
  for (const name of ALL_SESSION_COOKIE_NAMES) {
    response.cookies.set(name, '', { ...clearAttributes() });
  }
  response.cookies.set(CSRF_COOKIE, randomToken(), csrfCookieAttributes());
}
