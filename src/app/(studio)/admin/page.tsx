import { redirect } from 'next/navigation';

import { ErrorAlert } from '@/components/error-alert';
import { CompletionDashboard } from '@/components/ops/completion-dashboard';
import { PageHeader } from '@/components/page-header';
import { apiGetCompletion } from '@/lib/api-client';
import { getServerAccessToken } from '@/lib/auth/server-session';

export const dynamic = 'force-dynamic';

/**
 * Admin operations dashboard. Completion is a computed read model (D-046); the
 * page loads it server-side so the httpOnly token never reaches the browser.
 */
export default async function AdminDashboardPage() {
  const session = await getServerAccessToken();
  if (!session) {
    redirect('/login?next=%2Fadmin');
  }

  const result = await apiGetCompletion(session.accessToken);

  return (
    <main id="main-content" tabIndex={-1} aria-labelledby="admin-dashboard-heading">
      <PageHeader
        headingId="admin-dashboard-heading"
        title="Operations dashboard"
        breadcrumbs={[{ label: 'Overview', href: '/' }, { label: 'Administration' }]}
        description="Verified and publication-ready progress across every World, computed from source on each read."
      />
      {result.ok ? (
        <CompletionDashboard report={result.data} />
      ) : (
        <ErrorAlert title="Could not load completion">{result.message}</ErrorAlert>
      )}
    </main>
  );
}
