import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReviewPanel } from '@/components/trust/review-panel';

describe('ReviewPanel', () => {
  it('flags an unapproved AI draft and approves it', () => {
    const onSetReview = vi.fn();
    render(
      <ReviewPanel
        label="Trick"
        draftSource="AI"
        reviewStatus="NEEDS_REVIEW"
        canReview
        busy={false}
        onSetReview={onSetReview}
      />,
    );

    expect(
      screen.getByText(/AI-drafted content stays blocked from publication/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onSetReview).toHaveBeenCalledWith('APPROVED');
  });

  it('marks an approved item as needing review', () => {
    const onSetReview = vi.fn();
    render(
      <ReviewPanel
        label="Trick"
        draftSource="HUMAN"
        reviewStatus="APPROVED"
        canReview
        busy={false}
        onSetReview={onSetReview}
      />,
    );

    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Needs review' }));
    expect(onSetReview).toHaveBeenCalledWith('NEEDS_REVIEW');
  });

  it('renders view-only without trick.vetting.write', () => {
    render(
      <ReviewPanel
        label="Trick"
        draftSource="HUMAN"
        reviewStatus="NEEDS_REVIEW"
        canReview={false}
        busy={false}
        onSetReview={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.getByText(/Review is view-only/)).toBeInTheDocument();
  });
});
