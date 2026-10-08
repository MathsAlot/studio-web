import { notFound, redirect } from 'next/navigation';
import { ErrorAlert } from '@/components/error-alert';
import { FamilyEditor } from '@/components/nitty-gritty/family-editor';
import { PageHeader } from '@/components/page-header';
import { apiGetFamily, apiListFactTypes, apiListWorlds } from '@/lib/api-client';
import { getServerAccessToken } from '@/lib/auth/server-session';
import { capabilitiesFor } from '@/lib/studio/permissions';

export const dynamic = 'force-dynamic';

interface FamilyPageProps {
  params: Promise<{ familyId: string }>;
}

export default async function FamilyPage({ params }: FamilyPageProps) {
  const { familyId } = await params;

  const session = await getServerAccessToken();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/families/${familyId}`)}`);
  }

  const [familyResult, worldsResult, factTypesResult] = await Promise.all([
    apiGetFamily(familyId, session.accessToken),
    apiListWorlds(session.accessToken),
    apiListFactTypes(session.accessToken),
  ]);

  if (!familyResult.ok) {
    if (familyResult.status === 404) {
      notFound();
    }
    return (
      <main id="main-content" tabIndex={-1} aria-labelledby="family-heading">
        <PageHeader
          headingId="family-heading"
          title="Family"
          breadcrumbs={[
            { label: 'Overview', href: '/' },
            { label: 'Nitty Gritty', href: '/families' },
            { label: 'Family' },
          ]}
        />
        <ErrorAlert title="Could not load the Family">{familyResult.message}</ErrorAlert>
      </main>
    );
  }

  const family = familyResult.data;
  const capabilities = capabilitiesFor(session.user);

  return (
    <main id="main-content" tabIndex={-1} aria-labelledby="family-heading">
      <PageHeader
        headingId="family-heading"
        title={family.name}
        breadcrumbs={[
          { label: 'Overview', href: '/' },
          { label: 'Nitty Gritty', href: '/families' },
          { label: family.name },
        ]}
        description="Facts and schedule for this Family. Changing the type switches the World binding and whether Facts carry a number range."
      />
      <FamilyEditor
        family={family}
        worlds={worldsResult.ok ? worldsResult.data : []}
        factTypes={factTypesResult.ok ? factTypesResult.data : []}
        canManageFamily={capabilities.canManageFamily}
        canVetFact={capabilities.canVetFact}
      />
    </main>
  );
}
