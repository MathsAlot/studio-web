import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VettingPanel } from '@/components/trust/vetting-panel';

const values = { validity: '', domain: '', edgeCases: '' };

describe('VettingPanel', () => {
  it('gives client feedback and does not submit when VERIFIED fields are missing', () => {
    const onSubmit = vi.fn();
    render(
      <VettingPanel
        entityLabel="Trick"
        status="DRAFT"
        values={values}
        canWrite
        permissionKey="trick.vetting.write"
        busy={false}
        error={null}
        onSubmit={onSubmit}
        idPrefix="trick"
      />,
    );

    fireEvent.change(screen.getByLabelText('Vetting status'), { target: { value: 'VERIFIED' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save vetting' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/required before this can be marked Verified/)).toBeInTheDocument();
    expect(screen.getByText('Describe the validity check.')).toBeInTheDocument();
  });

  it('submits VERIFIED with all three fields present', () => {
    const onSubmit = vi.fn();
    render(
      <VettingPanel
        entityLabel="Trick"
        status="DRAFT"
        values={values}
        canWrite
        permissionKey="trick.vetting.write"
        busy={false}
        error={null}
        onSubmit={onSubmit}
        idPrefix="trick"
      />,
    );

    fireEvent.change(screen.getByLabelText('Vetting status'), { target: { value: 'VERIFIED' } });
    fireEvent.change(screen.getByLabelText('Validity'), { target: { value: 'Holds for all n.' } });
    fireEvent.change(screen.getByLabelText('Domain'), { target: { value: 'Whole numbers.' } });
    fireEvent.change(screen.getByLabelText('Edge cases'), { target: { value: 'Zero.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save vetting' }));

    expect(onSubmit).toHaveBeenCalledWith({
      status: 'VERIFIED',
      values: { validity: 'Holds for all n.', domain: 'Whole numbers.', edgeCases: 'Zero.' },
    });
  });

  it('renders status-only for a Fact and hides controls without the grant', () => {
    const onSubmit = vi.fn();
    render(
      <VettingPanel
        entityLabel="Fact"
        status="DRAFT"
        canWrite={false}
        permissionKey="fact.vetting.write"
        busy={false}
        error={null}
        onSubmit={onSubmit}
        idPrefix="fact"
      />,
    );

    expect(screen.queryByLabelText('Validity')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save vetting' })).not.toBeInTheDocument();
    expect(screen.getByText(/fact\.vetting\.write/)).toBeInTheDocument();
  });

  it('surfaces a server error without clearing the form', () => {
    render(
      <VettingPanel
        entityLabel="Trick"
        status="DRAFT"
        values={values}
        canWrite
        permissionKey="trick.vetting.write"
        busy={false}
        error="Validity, domain and edge cases are required before verification."
        onSubmit={vi.fn()}
        idPrefix="trick"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/required before verification/);
  });
});
