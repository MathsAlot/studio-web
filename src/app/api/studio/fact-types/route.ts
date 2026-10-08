import type { NextResponse } from 'next/server';
import { apiListFactTypes } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  return proxyToApi((accessToken) => apiListFactTypes(accessToken));
}
