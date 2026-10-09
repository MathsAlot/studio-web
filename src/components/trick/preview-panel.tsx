'use client';

import { useState } from 'react';
import { Eye, Loader2 } from 'lucide-react';

import { ErrorAlert } from '@/components/error-alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { AgeTier, Preview } from '@/lib/api-client';
import { previewTrick } from '@/lib/client/studio';
import { asTextOrNull } from '@/lib/studio/fields';

type PreviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Preview }
  | { status: 'error'; message: string };

interface PreviewPanelProps {
  trickId: string;
  ageTier: AgeTier;
  tierLabel: string;
}

/**
 * Selected-tier preview (FR-18). Previews the *saved* server content for the
 * chosen tier, so editors can see exactly what the production app will read.
 */
export function PreviewPanel({ trickId, ageTier, tierLabel }: PreviewPanelProps) {
  const [state, setState] = useState<PreviewState>({ status: 'idle' });

  async function load() {
    setState({ status: 'loading' });
    const result = await previewTrick(trickId, ageTier);
    if (!result.ok) {
      setState({
        status: 'error',
        message:
          result.status === 404
            ? `No saved ${tierLabel.toLowerCase()} content yet.`
            : result.message,
      });
      return;
    }
    setState({ status: 'success', data: result.data });
  }

  return (
    <Card className="mt-6 bg-surface-muted">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-heading-2 font-semibold text-foreground">{tierLabel} preview</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={state.status === 'loading'}
            aria-busy={state.status === 'loading'}
          >
            {state.status === 'loading' ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <Eye aria-hidden="true" />
            )}
            {state.status === 'loading' ? 'Loading preview…' : `Preview saved ${tierLabel}`}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {state.status === 'error' ? <ErrorAlert>{state.message}</ErrorAlert> : null}

        {state.status === 'success' ? (
          <dl className="space-y-3 text-body" data-testid="preview-content">
            <div>
              <dt className="label-eyebrow text-muted-foreground">Wording</dt>
              <dd className="mt-1 whitespace-pre-wrap text-foreground">{state.data.wording}</dd>
            </div>
            <div>
              <dt className="label-eyebrow text-muted-foreground">Scenario</dt>
              <dd className="mt-1 whitespace-pre-wrap text-foreground">{state.data.scenario}</dd>
            </div>
            <div>
              <dt className="label-eyebrow text-muted-foreground">Reading level</dt>
              <dd className="mt-1 text-foreground">
                {asTextOrNull(state.data.readingLevel) ?? 'Not set'}
              </dd>
            </div>
          </dl>
        ) : null}
      </CardContent>
    </Card>
  );
}
