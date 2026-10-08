import { redirect } from 'next/navigation';

import { ErrorAlert } from '@/components/error-alert';
import { CommentCoordination } from '@/components/ops/comment-coordination';
import { PageHeader } from '@/components/page-header';
import { apiListWorlds } from '@/lib/api-client';
import { getServerAccessToken } from '@/lib/auth/server-session';
import { capabilitiesFor } from '@/lib/studio/permissions';

export const dynamic = 'force-dynamic';

/**
 * Comment coordination. Reuses the Phase 05 comment endpoints; this screen only
 * selects a Trick and surfaces its open comments for reassign/resolve.
 */
export default async function AdminCommentsPage() {
  const session = await getServerAccessToken();
  if (!session) {
    redirect('/login?next=%2Fadmin%2Fcomments');
  }

  const worlds = await apiListWorlds(session.accessToken);
  const capabilities = capabilitiesFor(session.user);

  return (
    <main id="main-content" tabIndex={-1} aria-labelledby="admin-comments-heading">
      <PageHeader
        headingId="admin-comments-heading"
        title="Comment coordination"
        breadcrumbs={[
          { label: 'Overview', href: '/' },
          { label: 'Administration', href: '/admin' },
          { label: 'Comments' },
        ]}
        description="Triage open comments across a Trick: reassign ownership and resolve or reopen."
      />
      {worlds.ok ? (
        <CommentCoordination
          worlds={worlds.data}
          canCoordinate={capabilities.canCoordinateComments}
        />
      ) : (
        <ErrorAlert title="Could not load Worlds">{worlds.message}</ErrorAlert>
      )}
    </main>
  );
}
