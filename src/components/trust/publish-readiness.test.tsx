import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PublishReadiness } from '@/components/trust/publish-readiness';
import type { ReadinessCheck } from '@/lib/studio/trust';

const passed: ReadinessCheck[] = [
  { key: 'vetting', label: 'Vetting Verified', passed: true, reason: 'Verified.' },
  { key: 'review', label: 'Review Approved', passed: true, reason: 'Approved.' },
];

const blocked: ReadinessCheck[] = [
  { key: 'vetting', label: 'Vetting Verified', passed: true, reason: 'Verified.' },
  {
    key: 'review',
    label: 'Review Approved',
    passed: false,
    reason: 'This Trick is still awaiting human approval.',
  },
];

describe('PublishReadiness', () => {
  it('shows exactly what blocks publication and disables Publish', () => {
    render(
      <PublishReadiness
        entityLabel="Trick"
        checks={blocked}
        publishedAt={null}
        canPublish
        busy={false}
        error={null}
        onPublish={vi.fn()}
      />,
    );

    expect(screen.getByText('Not ready to publish yet.')).toBeInTheDocument();
    expect(screen.getByText('This Trick is still awaiting human approval.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });

  it('publishes when every requirement is met', () => {
    const onPublish = vi.fn();
    render(
      <PublishReadiness
        entityLabel="Trick"
        checks={passed}
        publishedAt={null}
        canPublish
        busy={false}
        error={null}
        onPublish={onPublish}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(onPublish).toHaveBeenCalledTimes(1);
  });

  it('reflects the server blocker message', () => {
    render(
      <PublishReadiness
        entityLabel="Trick"
        checks={passed}
        publishedAt={null}
        canPublish
        busy={false}
        error="All three age tiers are required before publishing."
        onPublish={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/All three age tiers are required/);
  });

  it('shows a published state with Unpublish', () => {
    const onUnpublish = vi.fn();
    render(
      <PublishReadiness
        entityLabel="Trick"
        checks={passed}
        publishedAt="2026-01-02T00:00:00.000Z"
        canPublish
        busy={false}
        error={null}
        onPublish={vi.fn()}
        onUnpublish={onUnpublish}
      />,
    );

    expect(screen.getByText('Published')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Unpublish' }));
    expect(onUnpublish).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
  });

  it('hides the publish action without the grant', () => {
    render(
      <PublishReadiness
        entityLabel="Fact"
        checks={passed}
        publishedAt={null}
        canPublish={false}
        busy={false}
        error={null}
        onPublish={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(screen.getByText(/Publishing is view-only/)).toBeInTheDocument();
  });
});
