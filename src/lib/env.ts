/**
 * Server-side runtime configuration.
 *
 * Imported only from server code (Server Components / route handlers). The
 * variable is intentionally NOT prefixed with `NEXT_PUBLIC_`, so Next.js never
 * inlines it into the browser bundle. No secrets are read here.
 */
export const API_BASE_URL: string = process.env.API_BASE_URL ?? 'http://localhost:3001';

/**
 * Fail fast when a value that must be absolute is malformed, at call time
 * rather than at import time so unrelated pages keep rendering.
 */
export function resolveApiUrl(pathname: string): URL {
  try {
    return new URL(pathname, API_BASE_URL);
  } catch {
    throw new Error(`API_BASE_URL is not a valid absolute URL: ${API_BASE_URL}`);
  }
}
