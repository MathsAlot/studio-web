'use client';

import { useState } from 'react';

import { ErrorAlert } from '@/components/error-alert';
import { PublishReadiness } from '@/components/trust/publish-readiness';
import { ReviewPanel } from '@/components/trust/review-panel';
import { VettingPanel, type VettingFieldValues } from '@/components/trust/vetting-panel';
import { VersionHistory } from '@/components/trust/version-history';
import type { FactDetail, ReviewStatus, VettingStatus } from '@/lib/api-client';
import {
  getFact,
  publishFact,
  restoreFactVersion,
  setFactReview,
  setFactVetting,
  listFactVersions,
} from '@/lib/client/studio';
import { factReadinessChecks, factVersionSummary } from '@/lib/studio/trust';

interface FactTrustPanelProps {
  fact: FactDetail;
  canVetFact: boolean;
  canManageFamily: boolean;
  onFactChange: (fact: FactDetail) => void;
}

/**
 * Fact trust workstream: vetting status, human/AI review, the publication
 * gate, and snapshot history. Facts have no unpublish endpoint, so publication
 * is one-way here.
 */
export function FactTrustPanel({
  fact,
  canVetFact,
  canManageFamily,
  onFactChange,
}: FactTrustPanelProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refreshFact() {
    const result = await getFact(fact.id);
    if (result.ok) {
      onFactChange(result.data);
    }
  }

  async function handleVetting(input: { status: VettingStatus; values: VettingFieldValues }) {
    setBusy('vetting');
    setError(null);
    setNotice(null);
    const result = await setFactVetting(fact.id, { status: input.status });
    if (!result.ok) {
      setBusy(null);
      setError(result.message);
      return;
    }
    await refreshFact();
    setBusy(null);
    setNotice('Vetting saved.');
  }

  async function handleSetReview(status: ReviewStatus) {
    setBusy('review');
    setError(null);
    setNotice(null);
    const result = await setFactReview(fact.id, { reviewStatus: status });
    if (!result.ok) {
      setBusy(null);
      setError(result.message);
      return;
    }
    await refreshFact();
    setBusy(null);
    setNotice(status === 'APPROVED' ? 'Approved.' : 'Marked as needing review.');
  }

  async function handlePublish() {
    setBusy('publish');
    setPublishError(null);
    setNotice(null);
    const result = await publishFact(fact.id);
    if (!result.ok) {
      setBusy(null);
      setPublishError(result.message);
      return;
    }
    await refreshFact();
    setBusy(null);
    setNotice('Fact published.');
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
        entityLabel="Fact"
        status={fact.vettingStatus}
        canWrite={canVetFact}
        permissionKey="fact.vetting.write"
        busy={busy === 'vetting'}
        error={null}
        onSubmit={(input) => void handleVetting(input)}
        idPrefix="fact"
      />

      <ReviewPanel
        label="Fact"
        draftSource={fact.draftSource}
        reviewStatus={fact.reviewStatus}
        canReview={canVetFact}
        busy={busy === 'review'}
        onSetReview={(status) => void handleSetReview(status)}
      />

      <PublishReadiness
        entityLabel="Fact"
        checks={factReadinessChecks(fact)}
        publishedAt={fact.publishedAt}
        canPublish={canVetFact}
        busy={busy === 'publish'}
        error={publishError}
        onPublish={() => void handlePublish()}
      />

      <VersionHistory
        entityLabel="Fact"
        canRestore={canManageFamily}
        load={() => listFactVersions(fact.id)}
        restore={(versionId) => restoreFactVersion(fact.id, versionId)}
        summarize={factVersionSummary}
        onRestored={refreshFact}
      />
    </div>
  );
}
