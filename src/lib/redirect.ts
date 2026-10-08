/**
 * Restrict `next` redirects to same-origin, single-slash paths. Prevents open
 * redirects such as `//evil.example` or absolute URLs.
 */
export function sanitizeNextPath(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (
    !candidate ||
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.startsWith('/\\')
  ) {
    return '/';
  }
  return candidate;
}
