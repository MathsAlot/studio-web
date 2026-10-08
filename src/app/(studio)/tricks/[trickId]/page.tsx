import { notFound, redirect } from 'next/navigation';
import { ErrorAlert } from '@/components/error-alert';
import { PageHeader, type Crumb } from '@/components/page-header';
import { TrickDetailView } from '@/components/trick/trick-detail';
import { apiGetTrick, apiListWorlds, type WorldSummary } from '@/lib/api-client';
import { getServerAccessToken } from '@/lib/auth/server-session';
import { capabilitiesFor } from '@/lib/studio/permissions';

export const dynamic = 'force-dynamic';

interface TrickPageProps {
  params: Promise<{ trickId: string }>;
}

export default async function TrickPage({ params }: TrickPageProps) {
  const { trickId } = await params;

  const session = await getServerAccessToken();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/tricks/${trickId}`)}`);
  }

  const [trickResult, worldsResult] = await Promise.all([
    apiGetTrick(trickId, session.accessToken),
    apiListWorlds(session.accessToken),
  ]);

  if (!trickResult.ok) {
    if (trickResult.status === 404) {
      notFound();
    }
    return (
      <main id="main-content" tabIndex={-1} aria-labelledby="trick-heading">
        <PageHeader
          headingId="trick-heading"
          title="Trick"
          breadcrumbs={[{ label: 'Worlds & Tricks', href: '/worlds' }, { label: 'Trick' }]}
        />
        <ErrorAlert title="Could not load the Trick">{trickResult.message}</ErrorAlert>
      </main>
    );
  }

  const trick = trickResult.data;
  let world: WorldSummary | null = null;
  if (worldsResult.ok) {
    world = worldsResult.data.find((entry) => entry.id === trick.worldId) ?? null;
  }

  const breadcrumbs: Crumb[] = [
    { label: 'Worlds & Tricks', href: '/worlds' },
    ...(world ? [{ label: world.name, href: `/worlds/${world.id}` }] : []),
    { label: trick.name },
  ];

  return (
    <main id="main-content" tabIndex={-1} aria-labelledby="trick-heading">
      <PageHeader headingId="trick-heading" title={trick.name} breadcrumbs={breadcrumbs} />
      <TrickDetailView trick={trick} world={world} capabilities={capabilitiesFor(session.user)} />
    </main>
  );
}
