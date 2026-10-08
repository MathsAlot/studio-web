import { notFound, redirect } from 'next/navigation';
import { CurriculumList } from '@/components/curriculum/curriculum-list';
import { ErrorAlert } from '@/components/error-alert';
import { PageHeader } from '@/components/page-header';
import { apiListCurriculums, apiListWorlds } from '@/lib/api-client';
import { getServerAccessToken } from '@/lib/auth/server-session';
import { capabilitiesFor } from '@/lib/studio/permissions';

export const dynamic = 'force-dynamic';

interface CurriculumsPageProps {
  params: Promise<{ worldId: string }>;
}

export default async function CurriculumsPage({ params }: CurriculumsPageProps) {
  const { worldId } = await params;

  const session = await getServerAccessToken();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/worlds/${worldId}/curriculums`)}`);
  }

  const [worldsResult, curriculumsResult] = await Promise.all([
    apiListWorlds(session.accessToken),
    apiListCurriculums(worldId, session.accessToken),
  ]);

  if (!curriculumsResult.ok) {
    if (curriculumsResult.status === 404) {
      notFound();
    }
    return (
      <main id="main-content" tabIndex={-1} aria-labelledby="curriculums-heading">
        <PageHeader
          headingId="curriculums-heading"
          title="Curricula"
          breadcrumbs={[{ label: 'Worlds & Tricks', href: '/worlds' }, { label: 'Curricula' }]}
        />
        <ErrorAlert title="Could not load Curricula">{curriculumsResult.message}</ErrorAlert>
      </main>
    );
  }

  const world = worldsResult.ok
    ? worldsResult.data.find((entry) => entry.id === worldId)
    : undefined;
  if (worldsResult.ok && !world) {
    notFound();
  }

  const worldName = world?.name ?? 'World';

  return (
    <main id="main-content" tabIndex={-1} aria-labelledby="curriculums-heading">
      <PageHeader
        headingId="curriculums-heading"
        title={`${worldName} Curricula`}
        breadcrumbs={[
          { label: 'Worlds & Tricks', href: '/worlds' },
          { label: worldName, href: `/worlds/${worldId}` },
          { label: 'Curricula' },
        ]}
        description="Completion is computed by the server from Sequence coverage and Trick roles; this view never infers it."
      />
      <CurriculumList
        worldId={worldId}
        worldName={worldName}
        initialCurricula={curriculumsResult.data}
        capabilities={capabilitiesFor(session.user)}
      />
    </main>
  );
}
