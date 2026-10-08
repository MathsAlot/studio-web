import { redirect } from 'next/navigation';
import { ErrorAlert } from '@/components/error-alert';
import { FamilyList } from '@/components/nitty-gritty/family-list';
import { PageHeader } from '@/components/page-header';
import { apiListFamilies, apiListWorlds } from '@/lib/api-client';
import { getServerAccessToken } from '@/lib/auth/server-session';
import { capabilitiesFor } from '@/lib/studio/permissions';

export const dynamic = 'force-dynamic';

export default async function FamiliesPage() {
  const session = await getServerAccessToken();
  if (!session) {
    redirect('/login?next=%2Ffamilies');
  }

  const [familiesResult, worldsResult] = await Promise.all([
    apiListFamilies(session.accessToken),
    apiListWorlds(session.accessToken),
  ]);
  const capabilities = capabilitiesFor(session.user);

  return (
    <main id="main-content" tabIndex={-1} aria-labelledby="families-heading">
      <PageHeader
        headingId="families-heading"
        title="Nitty Gritty Families"
        breadcrumbs={[{ label: 'Overview', href: '/' }, { label: 'Nitty Gritty' }]}
        description="Families group structured Facts with a repetition schedule. The server enforces World-binding and number-range rules."
      />
      {familiesResult.ok ? (
        <FamilyList
          initialFamilies={familiesResult.data}
          worlds={worldsResult.ok ? worldsResult.data : []}
          canManageFamily={capabilities.canManageFamily}
        />
      ) : (
        <ErrorAlert title="Could not load Families">{familiesResult.message}</ErrorAlert>
      )}
    </main>
  );
}
