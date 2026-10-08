'use client';

import { useState } from 'react';

import { ErrorAlert } from '@/components/error-alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReviewPanel } from '@/components/trust/review-panel';
import { VettingPanel, type VettingFieldValues } from '@/components/trust/vetting-panel';
import { VersionHistory } from '@/components/trust/version-history';
import { CommentThread } from '@/components/trust/comment-thread';
import type { ReviewStatus, TrickDetail, VettingStatus } from '@/lib/api-client';
import {
  getTrick,
  setTrickReview,
  setTrickVetting,
  setVariantReview,
  restoreTrickVersion,
  listTrickVersions,
} from '@/lib/client/studio';
import { TIER_LABELS } from '@/lib/studio/fields';
import { trickVersionSummary } from '@/lib/studio/trust';
import type { StudioCapabilities } from '@/lib/studio/permissions';

interface TrickTrustPanelProps {
  trick: TrickDetail;
  capabilities: StudioCapabilities;
  onTrickChange: (trick: TrickDetail) => void;
}

/**
 * Trick trust workstream: vetting, human/AI review, threaded comments, and
 * snapshot history. Publication readiness lives in the always-visible rail;
 * every mutation here is re-read from the server before it is shown.
 */
export function TrickTrustPanel({ trick, capabilities, onTrickChange }: TrickTrustPanelProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refreshTrick() {
    const result = await getTrick(trick.id);
    if (result.ok) {
      onTrickChange(result.data);
    }
  }

  async function handleVetting(input: { status: VettingStatus; values: VettingFieldValues }) {
    setBusy('vetting');
    setError(null);
    setNotice(null);
    const result = await setTrickVetting(trick.id, {
      status: input.status,
      vettingValidity: input.values.validity.trim().length > 0 ? input.values.validity : null,
      vettingDomain: input.values.domain.trim().length > 0 ? input.values.domain : null,
      vettingEdgeCases: input.values.edgeCases.trim().length > 0 ? input.values.edgeCases : null,
    });
    if (!result.ok) {
      setBusy(null);
      setError(result.message);
      return;
    }
    await refreshTrick();
    setBusy(null);
    setNotice('Vetting saved.');
  }

  async function handleSetReview(
    target: { kind: 'trick' } | { kind: 'variant'; variantId: string },
    status: ReviewStatus,
  ) {
    const key = target.kind === 'trick' ? 'review-trick' : `review-${target.variantId}`;
    setBusy(key);
    setError(null);
    setNotice(null);
    const result =
      target.kind === 'trick'
        ? await setTrickReview(trick.id, { reviewStatus: status })
        : await setVariantReview(target.variantId, { reviewStatus: status });
    if (!result.ok) {
      setBusy(null);
      setError(result.message);
      return;
    }
    await refreshTrick();
    setBusy(null);
    setNotice(status === 'APPROVED' ? 'Approved.' : 'Marked as needing review.');
  }

  return (
    <div className="space-y-6">
      {error ? <ErrorAlert title="Trust action failed">{error}</ErrorAlert> : null}
      {notice ? (
        <p role="status" aria-live="polite" className="text-body-sm text-success-foreground">
          {notice}
        </p>
      ) : null}

      <VettingPanel
        entityLabel="Trick"
        status={trick.vettingStatus}
        values={{
          validity: trick.vettingValidity ?? '',
          domain: trick.vettingDomain ?? '',
          edgeCases: trick.vettingEdgeCases ?? '',
        }}
        canWrite={capabilities.canVetTrick}
        permissionKey="trick.vetting.write"
        busy={busy === 'vetting'}
        error={null}
        onSubmit={(input) => void handleVetting(input)}
        idPrefix="trick"
      />

      <Card data-slot="review-section">
        <CardHeader>
          <CardTitle>
            <h2 className="text-heading-2 font-semibold text-foreground">Review and AI drafts</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ReviewPanel
            label="Trick"
            draftSource={trick.draftSource}
            reviewStatus={trick.reviewStatus}
            canReview={capabilities.canVetTrick}
            busy={busy === 'review-trick'}
            onSetReview={(status) => void handleSetReview({ kind: 'trick' }, status)}
          />
          {trick.variants.map((variant) => (
            <ReviewPanel
              key={variant.id}
              label={`${TIER_LABELS[variant.ageTier]} variant`}
              draftSource={variant.draftSource}
              reviewStatus={variant.reviewStatus}
              canReview={capabilities.canVetTrick}
              busy={busy === `review-${variant.id}`}
              onSetReview={(status) =>
                void handleSetReview({ kind: 'variant', variantId: variant.id }, status)
              }
            />
          ))}
        </CardContent>
      </Card>

      <CommentThread trickId={trick.id} canCoordinate={capabilities.canCoordinateComments} />

      <VersionHistory
        entityLabel="Trick"
        canRestore={capabilities.canWriteStructure && capabilities.canWriteContent}
        load={() => listTrickVersions(trick.id)}
        restore={(versionId) => restoreTrickVersion(trick.id, versionId)}
        summarize={trickVersionSummary}
        onRestored={refreshTrick}
      />
    </div>
  );
}
