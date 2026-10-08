import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoginBrandPanel } from '@/components/login/brand-panel';

describe('LoginBrandPanel', () => {
  it('starts on the first capability and advances with the next control', () => {
    render(<LoginBrandPanel />);

    const carousel = screen.getByRole('group', { name: 'Studio capabilities' });
    expect(within(carousel).getByRole('heading', { name: 'Worlds and Tricks' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Next capability' }));

    expect(
      within(carousel).getByRole('heading', { name: 'Curricula and Sequences' }),
    ).toBeVisible();
    expect(within(carousel).queryByRole('heading', { name: 'Worlds and Tricks' })).toBeNull();
  });

  it('supports keyboard-operable previous and dot controls', () => {
    render(<LoginBrandPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Show Version history' }));
    expect(screen.getByRole('heading', { name: 'Version history' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Previous capability' }));
    expect(screen.getByRole('heading', { name: 'Vetting and review' })).toBeVisible();
  });

  it('describes the product with real, concise copy', () => {
    render(<LoginBrandPanel />);

    expect(screen.getAllByText('MathsAlot Studio').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/does not create learner Levels/).length).toBeGreaterThan(0);
  });

  it('does not introduce a second page h1', () => {
    render(<LoginBrandPanel />);

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Worlds and Tricks' })).toBeVisible();
  });

  it('gives each carousel dot a 24px hit area around the visual mark', () => {
    render(<LoginBrandPanel />);

    expect(screen.getByRole('button', { name: 'Show Worlds and Tricks' })).toHaveClass('size-6');
  });
});
