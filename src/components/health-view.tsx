import { CircleCheck, Database, TriangleAlert } from 'lucide-react';

import { ErrorAlert } from '@/components/error-alert';
import { StatusBadge } from '@/components/status-badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { HealthState } from '@/lib/api';

interface HealthViewProps {
  state: HealthState;
}

function formatTimestamp(timestamp: string): string {
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? timestamp : parsed.toISOString();
}

/**
 * Presentational health panel. Status is conveyed with text and an icon as
 * well as colour, so it never relies on colour alone. Pure component: safe in a
 * Server Component tree and directly testable.
 */
export function HealthView({ state }: HealthViewProps) {
  if (state.status === 'loading') {
    return (
      <Card role="status" aria-live="polite" aria-labelledby="health-heading">
        <CardHeader>
          <h2 id="health-heading" className="text-heading-2 font-semibold text-foreground">
            API health
          </h2>
        </CardHeader>
        <CardContent>
          <p className="text-body text-muted-foreground">Checking API status…</p>
        </CardContent>
      </Card>
    );
  }

  if (state.status === 'error') {
    return (
      <section aria-labelledby="health-heading">
        <h2 id="health-heading" className="mb-2 text-heading-2 font-semibold text-foreground">
          API health
        </h2>
        <ErrorAlert title="Unavailable.">{state.message}</ErrorAlert>
      </section>
    );
  }

  const { status, database, timestamp } = state.data;
  const statusLabel = status === 'ok' ? 'OK' : 'Degraded';
  const databaseLabel = database === 'up' ? 'Up' : 'Down';
  const degraded = status !== 'ok' || database !== 'up';

  return (
    <Card role="status" aria-live="polite" aria-labelledby="health-heading">
      <CardHeader>
        <h2 id="health-heading" className="text-heading-2 font-semibold text-foreground">
          API health
        </h2>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-body sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <dt className="label-eyebrow text-muted-foreground">Status</dt>
            <dd>
              <StatusBadge
                tone={status === 'ok' ? 'success' : 'warning'}
                icon={status === 'ok' ? CircleCheck : TriangleAlert}
              >
                {statusLabel}
              </StatusBadge>
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="label-eyebrow text-muted-foreground">Database</dt>
            <dd>
              <StatusBadge
                tone={database === 'up' ? 'success' : 'danger'}
                icon={database === 'up' ? Database : TriangleAlert}
              >
                {databaseLabel}
              </StatusBadge>
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="label-eyebrow text-muted-foreground">Checked</dt>
            <dd className="text-foreground">
              <time dateTime={timestamp} className="font-mono text-body-sm">
                {formatTimestamp(timestamp)}
              </time>
            </dd>
          </div>
        </dl>
        {degraded ? (
          <p className="mt-3 text-body-sm text-warning-foreground">
            One or more checks are degraded. The console remains read-only until the API recovers.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
