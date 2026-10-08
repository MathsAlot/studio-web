import {
  ACCESS_COOKIE,
  ACCESS_TTL_SECONDS,
  CSRF_COOKIE,
  CSRF_TTL_SECONDS,
  REFRESH_COOKIE,
  REFRESH_TTL_SECONDS,
} from './constants';

/** Cookie attributes compatible with `NextResponse.cookies.set`. */
export interface CookieAttributes {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge: number;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** httpOnly, Secure-in-production, SameSite=Lax cookie for a token. */
export function sessionCookieAttributes(maxAge: number): CookieAttributes {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}

export function accessCookieAttributes(): CookieAttributes {
  return sessionCookieAttributes(ACCESS_TTL_SECONDS);
}

export function refreshCookieAttributes(): CookieAttributes {
  return sessionCookieAttributes(REFRESH_TTL_SECONDS);
}

/** Readable (not httpOnly) cookie so the browser can echo it in a header. */
export function csrfCookieAttributes(): CookieAttributes {
  return {
    httpOnly: false,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge: CSRF_TTL_SECONDS,
  };
}

const CLEAR_ATTRIBUTES = {
  path: '/',
  maxAge: 0,
} as const;

export const SESSION_COOKIE_NAMES = [ACCESS_COOKIE, REFRESH_COOKIE] as const;
export const ALL_SESSION_COOKIE_NAMES = [ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE] as const;

export function clearAttributes(): Pick<CookieAttributes, 'path' | 'maxAge'> {
  return { ...CLEAR_ATTRIBUTES };
}

/** Parse a raw `Cookie` header into a name → value map (URL-decoded). */
export function parseCookieHeader(header: string | null | undefined): Map<string, string> {
  const jar = new Map<string, string>();
  if (!header) {
    return jar;
  }
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) {
      continue;
    }
    const name = part.slice(0, separator).trim();
    if (name.length === 0) {
      continue;
    }
    const rawValue = part.slice(separator + 1).trim();
    try {
      jar.set(name, decodeURIComponent(rawValue));
    } catch {
      jar.set(name, rawValue);
    }
  }
  return jar;
}
