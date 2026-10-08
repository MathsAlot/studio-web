import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { requireStaffSession } from '@/lib/auth/server-session';

export const dynamic = 'force-dynamic';

/** Protected shell: resolves the server session before rendering any page. */
export default async function StudioLayout({ children }: { children: ReactNode }) {
  const user = await requireStaffSession();
  return <AppShell user={user}>{children}</AppShell>;
}
