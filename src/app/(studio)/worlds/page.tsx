import { redirect } from 'next/navigation';
import { ErrorAlert } from '@/components/error-alert';
import { PageHeader } from '@/components/page-header';
import { WorldList } from '@/components/world-list';
import { apiListWorlds } from '@/lib/api-client';
import { getServerAccessToken } from '@/lib/auth/server-session';
import { capabilitiesFor } from '@/lib/studio/permissions';

export const dynamic = 'force-dynamic';

export default async function WorldsPage() {
  const session = await getServerAccessToken();
  if (!session) {
    redirect('/login?next=%2Fworlds');
  }

  const result = await apiListWorlds(session.accessToken);
  const capabilities = capabilitiesFor(session.user);

  return (
    <main id="main-content" tabIndex={-1} aria-labelledby="worlds-heading">
      <PageHeader
        headingId="worlds-heading"
        title="Worlds and Tricks"
        breadcrumbs={[{ label: 'Overview', href: '/' }, { label: 'Worlds & Tricks' }]}
        description="Completion and readiness are computed by the server from age-tier content and vetting state; this view never infers them."
      />
      {result.ok ? (
        <WorldList initialWorlds={result.data} capabilities={capabilities} />
      ) : (
        <ErrorAlert title="Could not load Worlds">{result.message}</ErrorAlert>
      )}
    </main>
  );
}
