import type { MeView, SessionUser } from '@/lib/api-client';
import { clientFetch, type ClientResult } from './http';

/** Client calls to the same-origin session BFF. Tokens stay in httpOnly cookies. */

export function login(
  email: string,
  password: string,
): Promise<ClientResult<{ user: SessionUser }>> {
  return clientFetch<{ user: SessionUser }>('/api/session/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function logout(): Promise<ClientResult<{ success: true }>> {
  return clientFetch<{ success: true }>('/api/session/logout', { method: 'POST' });
}

export function fetchSession(): Promise<ClientResult<{ user: MeView }>> {
  return clientFetch<{ user: MeView }>('/api/session');
}
