import { NextResponse } from 'next/server';
import { apiPreviewTrick, type AgeTier } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { errorResponse } from '@/lib/auth/http';
import { AGE_TIERS } from '@/lib/studio/fields';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ trickId: string }>;
}

function isAgeTier(value: string | null): value is AgeTier {
  return value !== null && (AGE_TIERS as readonly string[]).includes(value);
}

export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  const ageTier = new URL(request.url).searchParams.get('ageTier');
  if (!isAgeTier(ageTier)) {
    return errorResponse(400, 'A valid ageTier query parameter is required.');
  }
  const { trickId } = await context.params;
  return proxyToApi((accessToken) => apiPreviewTrick(trickId, ageTier, accessToken));
}
