/**
 * Shared names and lifetimes for the Studio BFF session.
 *
 * These are identifiers only; no secret material lives here. Safe to import
 * from middleware, server code, and client code alike.
 */

/** httpOnly cookie holding the short-lived API access token. */
export const ACCESS_COOKIE = 'studio_access';

/** httpOnly cookie holding the opaque, rotating API refresh token. */
export const REFRESH_COOKIE = 'studio_refresh';

/** Readable double-submit CSRF cookie; mirrored in the `x-csrf-token` header. */
export const CSRF_COOKIE = 'csrf';

/** Request header that must match the `csrf` cookie on mutating requests. */
export const CSRF_HEADER = 'x-csrf-token';

/** Access token lifetime in seconds; matches the API default (15 minutes). */
export const ACCESS_TTL_SECONDS = 15 * 60;

/** Refresh token lifetime in seconds (7 days); matches the API contract. */
export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

/** CSRF token lifetime; refreshed on every login. */
export const CSRF_TTL_SECONDS = 8 * 60 * 60;
