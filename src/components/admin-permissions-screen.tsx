import { ShieldAlert } from 'lucide-react';

import { ErrorAlert } from '@/components/error-alert';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { MeView, Permission, UserSummary } from '@/lib/api-client';
import { PermissionManager } from './permission-manager';

interface AdminPermissionsScreenProps {
  user: MeView;
  users?: UserSummary[];
  catalogue?: Permission[];
  loadError?: string;
}

/**
 * Server-decided view of the Admin permission screen. Non-Admins get an
 * explicit refusal and no user data is rendered; the API would reject their
 * requests regardless, so the UI never pretends otherwise.
 */
export function AdminPermissionsScreen({
  user,
  users = [],
  catalogue = [],
  loadError,
}: AdminPermissionsScreenProps) {
  if (user.role !== 'ADMIN') {
    return (
      <main id="main-content" tabIndex={-1} aria-labelledby="admin-denied-heading">
        <h1 id="admin-denied-heading" className="text-heading-1 font-semibold text-foreground">
          Admin access required
        </h1>
        <Alert className="mt-4 max-w-2xl border-warning/30 bg-warning-subtle text-warning-foreground">
          <ShieldAlert aria-hidden="true" />
          <AlertTitle>Permission management is restricted</AlertTitle>
          <AlertDescription className="text-warning-foreground/90">
            Permission management is limited to Admin accounts. Your account is{' '}
            <span className="font-medium">{user.displayName}</span> (
            {user.role === 'STAFF' ? 'Staff' : 'Learner'}), which does not have access to this
            screen.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} aria-labelledby="admin-heading">
      <PageHeader
        headingId="admin-heading"
        title="Permission management"
        breadcrumbs={[{ label: 'Overview', href: '/' }, { label: 'Administration' }]}
        description="Grant or revoke individual permissions for Staff accounts. Admin accounts bypass grants."
      />

      {loadError ? (
        <ErrorAlert className="max-w-2xl">{loadError}</ErrorAlert>
      ) : (
        <PermissionManager initialUsers={users} catalogue={catalogue} />
      )}
    </main>
  );
}
