import { ShieldAlert } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { MeView } from '@/lib/api-client';

const ROLE_LABELS: Record<MeView['role'], string> = {
  ADMIN: 'Admin',
  STAFF: 'Staff',
  LEARNER: 'Learner',
};

/**
 * Server-decided refusal for Admin-only screens. The API enforces the same
 * rule; rendering this keeps the UI honest instead of pretending access exists.
 */
export function AdminDenied({ user }: { user: MeView }) {
  return (
    <main id="main-content" tabIndex={-1} aria-labelledby="admin-denied-heading">
      <PageHeader
        headingId="admin-denied-heading"
        title="Admin access required"
        breadcrumbs={[{ label: 'Overview', href: '/' }, { label: 'Administration' }]}
        description="Operations and administration are limited to Admin accounts."
      />
      <Alert className="max-w-2xl border-warning/30 bg-warning-subtle text-warning-foreground">
        <ShieldAlert aria-hidden="true" />
        <AlertTitle>Administration is restricted</AlertTitle>
        <AlertDescription className="text-warning-foreground/90">
          You are signed in as <span className="font-medium">{user.displayName}</span> (
          {ROLE_LABELS[user.role]}). Ask an Admin for access; the API rejects these requests
          regardless.
        </AlertDescription>
      </Alert>
    </main>
  );
}
