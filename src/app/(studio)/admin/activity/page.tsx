import { ActivityFeed } from '@/components/ops/activity-feed';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

/**
 * Recent team activity. Newest-first content mutations with actor, action,
 * target, and time, bounded and paginated by the API (D-046).
 */
export default function AdminActivityPage() {
  return (
    <main id="main-content" tabIndex={-1} aria-labelledby="admin-activity-heading">
      <PageHeader
        headingId="admin-activity-heading"
        title="Recent activity"
        breadcrumbs={[
          { label: 'Overview', href: '/' },
          { label: 'Administration', href: '/admin' },
          { label: 'Recent activity' },
        ]}
        description="Newest-first content mutations with actor, action, target, and time."
      />
      <div className="max-w-4xl">
        <ActivityFeed />
      </div>
    </main>
  );
}
