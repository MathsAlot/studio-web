import { redirect } from 'next/navigation';
import { AdminPermissionsScreen } from '@/components/admin-permissions-screen';
import { apiListPermissions, apiListUsers } from '@/lib/api-client';
import { getServerAccessToken } from '@/lib/auth/server-session';

export const dynamic = 'force-dynamic';

/**
 * Admin permission management. The page resolves the session, refuses
 * non-Admins, then loads users and the permission catalogue server-side so the
 * httpOnly token never reaches the browser.
 */
export default async function AdminPermissionsPage() {
  const session = await getServerAccessToken();

  if (!session) {
    redirect('/login?next=%2Fadmin%2Fpermissions');
  }

  if (session.user.role !== 'ADMIN') {
    return <AdminPermissionsScreen user={session.user} />;
  }

  const [users, catalogue] = await Promise.all([
    apiListUsers(session.accessToken),
    apiListPermissions(session.accessToken),
  ]);

  if (!users.ok) {
    return <AdminPermissionsScreen user={session.user} loadError={users.message} />;
  }
  if (!catalogue.ok) {
    return <AdminPermissionsScreen user={session.user} loadError={catalogue.message} />;
  }

  return (
    <AdminPermissionsScreen user={session.user} users={users.data} catalogue={catalogue.data} />
  );
}
