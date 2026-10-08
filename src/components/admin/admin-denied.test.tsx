import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminDenied } from '@/components/admin/admin-denied';
import type { MeView } from '@/lib/api-client';

function user(overrides: Partial<MeView> = {}): MeView {
  return {
    id: 'u1',
    email: 'user@example.com',
    displayName: 'Staff Member',
    role: 'STAFF',
    isAdmin: false,
    permissions: [],
    ...overrides,
  };
}

describe('AdminDenied', () => {
  it('refuses a Staff account and names the role', () => {
    render(<AdminDenied user={user()} />);

    expect(screen.getByRole('heading', { name: /admin access required/i })).toBeInTheDocument();
    expect(screen.getByText('Staff Member')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('refuses a Learner account', () => {
    render(<AdminDenied user={user({ role: 'LEARNER' })} />);

    expect(screen.getByText(/Learner/)).toBeInTheDocument();
  });
});
