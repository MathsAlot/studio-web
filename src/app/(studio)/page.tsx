import { Suspense } from 'react';
import { PageSkeleton } from '@/components/content-skeleton';
import { HealthView } from '@/components/health-view';
import { PageHeader } from '@/components/page-header';
import { getHealth } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function HealthStatus() {
  const state = await getHealth();
  return <HealthView state={state} />;
}

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} aria-labelledby="page-heading">
      <PageHeader
        headingId="page-heading"
        title="Studio overview"
        description="Foundation status for the curriculum-authoring console. Authoring tools shape Worlds, Tricks, Curricula, and Sequences; this view reports API availability."
      />
      <div className="max-w-3xl">
        <Suspense fallback={<PageSkeleton />}>
          <HealthStatus />
        </Suspense>
      </div>
    </main>
  );
}
