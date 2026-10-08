import { NextResponse } from 'next/server';
import { apiGetActivity } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_OFFSET = 10_000;

/**
 * Activity is bounded and paginated (D-046). Query values are clamped to the
 * spec's range so a malformed link cannot over-fetch; the API re-validates.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const params = new URL(request.url).searchParams;
  const limit = clampInt(params.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = clampInt(params.get('offset'), 0, 0, MAX_OFFSET);
  return proxyToApi((accessToken) => apiGetActivity(limit, offset, accessToken));
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw === null || raw.trim().length === 0) {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, min), max);
}
