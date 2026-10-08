import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { BookOpen, Layers } from 'lucide-react';
import { ErrorAlert } from '@/components/error-alert';
import { PageHeader } from '@/components/page-header';
import { AddTrickDialog } from '@/components/trick/add-trick-dialog';
import { Button } from '@/components/ui/button';
import { WorldEditor } from '@/components/world-editor';
import { apiListWorlds } from '@/lib/api-client';
import { getServerAccessToken } from '@/lib/auth/server-session';
import { capabilitiesFor } from '@/lib/studio/permissions';

export const dynamic = 'force-dynamic';

interface WorldPageProps {
  params: Promise<{ worldId: string }>;
}

export default async function WorldPage({ params }: WorldPageProps) {
  const { worldId } = await params;

  const session = await getServerAccessToken();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/worlds/${worldId}`)}`);
  }

  const result = await apiListWorlds(session.accessToken);
  if (!result.ok) {
    return (
      <main id="main-content" tabIndex={-1} aria-labelledby="world-heading">
        <PageHeader
          headingId="world-heading"
          title="World"
          breadcrumbs={[{ label: 'Worlds & Tricks', href: '/worlds' }, { label: 'World' }]}
        />
        <ErrorAlert title="Could not load the World">{result.message}</ErrorAlert>
      </main>
    );
  }

  const world = result.data.find((entry) => entry.id === worldId);
  if (!world) {
    notFound();
  }

  const capabilities = capabilitiesFor(session.user);

  return (
    <main id="main-content" tabIndex={-1} aria-labelledby="world-heading">
      <PageHeader
        headingId="world-heading"
        title={world.name}
        breadcrumbs={[{ label: 'Worlds & Tricks', href: '/worlds' }, { label: world.name }]}
        description={`Position ${world.order} in the World sequence.`}
        actions={
          <>
            {capabilities.canWriteStructure ? (
              <AddTrickDialog worldId={world.id} worldName={world.name} />
            ) : null}
            <Button asChild variant="outline">
              <Link href={`/worlds/${world.id}/curriculums`}>
                <BookOpen aria-hidden="true" />
                Manage Curricula
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/families">
                <Layers aria-hidden="true" />
                Nitty Gritty
              </Link>
            </Button>
          </>
        }
      />
      <WorldEditor world={world} capabilities={capabilities} />
    </main>
  );
}
