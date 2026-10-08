import { BookOpenCheck, CheckCircle2, Gauge } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CompletionReport, WorldCompletion } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  label: string;
  count: number;
  total: number;
  percent: number;
  tone: 'success' | 'primary';
}

/** Quantitative bar; the numbers and label carry the meaning, colour is secondary. */
function ProgressBar({ label, count, total, percent, tone }: ProgressBarProps) {
  const rounded = Math.round(percent);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-label uppercase text-muted-foreground">{label}</span>
        <span className="font-mono text-body-sm text-foreground">
          {count}/{total} · {rounded}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${label}: ${count} of ${total}, ${rounded} percent`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rounded}
        className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
      >
        <div
          className={cn('h-full rounded-full', tone === 'success' ? 'bg-success' : 'bg-primary')}
          style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  count,
  total,
  percent,
  tone,
}: {
  label: string;
  count: number;
  total: number;
  percent: number;
  tone: 'success' | 'primary';
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-label uppercase text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-display font-bold text-foreground">
          {Math.round(percent)}
          <span className="text-heading-1 font-semibold text-muted-foreground">%</span>
        </p>
        <ProgressBar label={label} count={count} total={total} percent={percent} tone={tone} />
      </CardContent>
    </Card>
  );
}

function WorldRow({ world }: { world: WorldCompletion }) {
  return (
    <li className="space-y-3 border-b border-border px-4 py-4 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-heading-2 font-semibold text-foreground">{world.worldName}</h3>
        <span className="text-body-sm text-muted-foreground">
          <span className="font-mono">{world.totalTricks}</span>{' '}
          {world.totalTricks === 1 ? 'Trick' : 'Tricks'} · position{' '}
          <span className="font-mono">{world.order}</span>
        </span>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <ProgressBar
          label="Verified"
          count={world.verifiedTricks}
          total={world.totalTricks}
          percent={world.verifiedPercent}
          tone="success"
        />
        <ProgressBar
          label="Publication-ready"
          count={world.publishedTricks}
          total={world.totalTricks}
          percent={world.publishedPercent}
          tone="primary"
        />
      </div>
    </li>
  );
}

/**
 * Computed completion read model (D-046). Overall progress plus per-World
 * verified and publication-ready counts; no stored rollup is ever rendered.
 */
export function CompletionDashboard({ report }: { report: CompletionReport }) {
  const { overall, worlds } = report;

  return (
    <div className="space-y-6">
      <section aria-labelledby="completion-overall-heading" className="space-y-3">
        <h2
          id="completion-overall-heading"
          className="text-heading-2 font-semibold text-foreground"
        >
          Overall completion
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label="Verified"
            count={overall.verifiedTricks}
            total={overall.totalTricks}
            percent={overall.verifiedPercent}
            tone="success"
          />
          <MetricCard
            label="Publication-ready"
            count={overall.publishedTricks}
            total={overall.totalTricks}
            percent={overall.publishedPercent}
            tone="primary"
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-label uppercase text-muted-foreground">
                Total Tricks
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Gauge aria-hidden="true" className="size-8 text-primary" />
              <p className="text-display font-bold text-foreground">
                <span className="font-mono">{overall.totalTricks}</span>
              </p>
            </CardContent>
          </Card>
        </div>
        <p className="max-w-3xl text-body-sm text-muted-foreground">
          Verified counts Tricks whose vetting is VERIFIED; publication-ready counts Tricks with a
          publication timestamp. Values are computed on read and never stored.
        </p>
      </section>

      <section aria-labelledby="completion-worlds-heading" className="space-y-3">
        <h2 id="completion-worlds-heading" className="text-heading-2 font-semibold text-foreground">
          Per-World completion
        </h2>
        {worlds.length === 0 ? (
          <EmptyState
            icon={BookOpenCheck}
            title="No Worlds to report."
            description="Create a World and add Tricks to see completion progress here."
          />
        ) : (
          <ul className="list-none overflow-hidden rounded-lg border border-border bg-surface">
            {worlds.map((world) => (
              <WorldRow key={world.worldId} world={world} />
            ))}
          </ul>
        )}
      </section>

      <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
        <CheckCircle2 aria-hidden="true" className="size-4 text-success" />
        Legend: Verified and publication-ready are independent gates, not a single status.
      </p>
    </div>
  );
}
