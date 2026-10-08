import { NextResponse } from 'next/server';
import { apiUpsertVariant, type AgeTier } from '@/lib/api-client';
import { proxyToApi } from '@/lib/auth/admin-proxy';
import { verifyMutationRequest } from '@/lib/auth/csrf';
import { errorResponse, readJsonBody } from '@/lib/auth/http';
import { AGE_TIERS } from '@/lib/studio/fields';
import { parseUpsertVariant } from '@/lib/studio/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ trickId: string; ageTier: string }>;
}

function isAgeTier(value: string): value is AgeTier {
  return (AGE_TIERS as readonly string[]).includes(value);
}

export async function PUT(request: Request, context: RouteContext): Promise<NextResponse> {
  const rejection = verifyMutationRequest(request);
  if (rejection) {
    return rejection;
  }
  const { trickId, ageTier } = await context.params;
  if (!isAgeTier(ageTier)) {
    return errorResponse(400, 'Unknown age tier.');
  }
  const input = parseUpsertVariant(await readJsonBody(request));
  if (!input) {
    return errorResponse(400, 'Wording and scenario are required.');
  }
  return proxyToApi((accessToken) => apiUpsertVariant(trickId, ageTier, input, accessToken));
}
