import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { BookOpen, Layers } from 'lucide-react';
import { CurriculumBuilder } from '@/components/curriculum/curriculum-builder';
import { ErrorAlert } from '@/components/error-alert';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { apiGetCurriculum, apiListWorlds } from '@/lib/api-client';
import { getServerAccessToken } from '@/lib/auth/server-session';
import { capabilitiesFor } from '@/lib/studio/permissions';

export const dynamic = 'force-dynamic';

interface CurriculumBuilderPageProps {
  params: Promise<{ worldId: string; curriculumId: string }>;
}

export default async function CurriculumBuilderPage({ params }: CurriculumBuilderPageProps) {
  const { worldId, curriculumId } = await params;

  const session = await getServerAccessToken();
  if (!session) {
    const next = `/worlds/${worldId}/curriculums/${curriculumId}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const [curriculumResult, worldsResult] = await Promise.all([
    apiGetCurriculum(curriculumId, session.accessToken),
    apiListWorlds(session.accessToken),
  ]);

  if (!curriculumResult.ok) {
    if (curriculumResult.status === 404) {
      notFound();
    }
    return (
      <main id="main-content" tabIndex={-1} aria-labelledby="curriculum-heading">
        <PageHeader
          headingId="curriculum-heading"
          title="Curriculum"
          breadcrumbs={[{ label: 'Worlds & Tricks', href: '/worlds' }, { label: 'Curriculum' }]}
        />
        <ErrorAlert title="Could not load the Curriculum">{curriculumResult.message}</ErrorAlert>
      </main>
    );
  }

  const curriculum = curriculumResult.data;
  if (curriculum.worldId !== worldId) {
    notFound();
  }

  const world = worldsResult.ok
    ? worldsResult.data.find((entry) => entry.id === worldId)
    : undefined;

  return (
    <main id="main-content" tabIndex={-1} aria-labelledby="curriculum-heading">
      <PageHeader
        headingId="curriculum-heading"
        title={
          <>
            {curriculum.name}{' '}
            <span className="text-body font-normal text-muted-foreground">
              ({curriculum.version})
            </span>
          </>
        }
        breadcrumbs={[
          { label: 'Worlds & Tricks', href: '/worlds' },
          ...(world ? [{ label: world.name, href: `/worlds/${worldId}` }] : []),
          { label: 'Curricula', href: `/worlds/${worldId}/curriculums` },
          { label: curriculum.name },
        ]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/families">
                <Layers aria-hidden="true" />
                Nitty Gritty Families
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/worlds/${worldId}/curriculums`}>
                <BookOpen aria-hidden="true" />
                Back to Curricula
              </Link>
            </Button>
          </>
        }
      />
      <CurriculumBuilder
        worldId={worldId}
        curriculum={curriculum}
        worldTricks={world?.tricks ?? []}
        capabilities={capabilitiesFor(session.user)}
      />
    </main>
  );
}
