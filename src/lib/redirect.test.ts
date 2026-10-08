import { describe, expect, it } from 'vitest';
import { sanitizeNextPath } from '@/lib/redirect';

describe('sanitizeNextPath', () => {
  it('keeps an internal path', () => {
    expect(sanitizeNextPath('/admin/permissions')).toBe('/admin/permissions');
  });

  it('falls back to root for missing or empty values', () => {
    expect(sanitizeNextPath(undefined)).toBe('/');
    expect(sanitizeNextPath('')).toBe('/');
  });

  it('rejects protocol-relative and backslash redirects', () => {
    expect(sanitizeNextPath('//evil.example')).toBe('/');
    expect(sanitizeNextPath('/\\evil.example')).toBe('/');
  });

  it('rejects absolute URLs and takes the first array value', () => {
    expect(sanitizeNextPath('https://evil.example')).toBe('/');
    expect(sanitizeNextPath(['/first', '/second'])).toBe('/first');
  });
});
