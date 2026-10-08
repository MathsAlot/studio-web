import type { ReactNode } from 'react';

import { AdminDenied } from '@/components/admin/admin-denied';
import { requireStaffSession } from '@/lib/auth/server-session';

export const dynamic = 'force-dynamic';

/**
 * Admin-only gate for every `/admin/**` screen. The API enforces Admin on each
 * request; this layout only decides what the UI is allowed to render.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireStaffSession('/admin');
  if (user.role !== 'ADMIN') {
    return <AdminDenied user={user} />;
  }
  return <>{children}</>;
}
