import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from '@/components/app-shell';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { MeView } from '@/lib/api-client';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

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

function renderShell(me: MeView) {
  return render(
    <TooltipProvider>
      <AppShell user={me}>
        <p>content</p>
      </AppShell>
    </TooltipProvider>,
  );
}

describe('AppShell navigation gating', () => {
  it('hides Admin-only destinations from Staff', () => {
    renderShell(user());

    expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Activity' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Permissions' })).not.toBeInTheDocument();
  });

  it('shows Admin destinations to an Admin', () => {
    renderShell(user({ role: 'ADMIN', isAdmin: true }));

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Activity' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Comments' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Permissions' })).toBeInTheDocument();
  });
});
