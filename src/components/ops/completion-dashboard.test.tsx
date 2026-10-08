import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompletionDashboard } from '@/components/ops/completion-dashboard';
import type { CompletionReport } from '@/lib/api-client';

const report: CompletionReport = {
  overall: {
    totalTricks: 10,
    verifiedTricks: 6,
    publishedTricks: 4,
    verifiedPercent: 60,
    publishedPercent: 40,
  },
  worlds: [
    {
      worldId: 'world-1',
      worldName: 'Addition',
      order: 1,
      totalTricks: 6,
      verifiedTricks: 5,
      publishedTricks: 4,
      verifiedPercent: 83.3,
      publishedPercent: 66.7,
    },
    {
      worldId: 'world-2',
      worldName: 'Subtraction',
      order: 2,
      totalTricks: 4,
      verifiedTricks: 1,
      publishedTricks: 0,
      verifiedPercent: 25,
      publishedPercent: 0,
    },
  ],
};

describe('CompletionDashboard', () => {
  it('renders overall verified and publication-ready progress', () => {
    render(<CompletionDashboard report={report} />);

    expect(screen.getByRole('heading', { name: /overall completion/i })).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: /verified: 6 of 10, 60 percent/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: /publication-ready: 4 of 10, 40 percent/i }),
    ).toBeInTheDocument();
  });

  it('renders per-World counts and percentages', () => {
    render(<CompletionDashboard report={report} />);

    const addition = screen.getByRole('heading', { name: 'Addition' }).closest('li');
    expect(addition).not.toBeNull();
    expect(within(addition as HTMLElement).getByText('5/6 · 83%')).toBeInTheDocument();
    expect(within(addition as HTMLElement).getByText('4/6 · 67%')).toBeInTheDocument();

    const subtraction = screen.getByRole('heading', { name: 'Subtraction' }).closest('li');
    expect(within(subtraction as HTMLElement).getByText('1/4 · 25%')).toBeInTheDocument();
  });

  it('shows an empty state when there are no Worlds', () => {
    render(<CompletionDashboard report={{ overall: report.overall, worlds: [] }} />);

    expect(screen.getByText(/no worlds to report/i)).toBeInTheDocument();
  });
});
