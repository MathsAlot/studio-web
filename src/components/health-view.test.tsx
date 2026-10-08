import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HealthView } from '@/components/health-view';

describe('HealthView', () => {
  it('renders a loading status while the health check is pending', () => {
    render(<HealthView state={{ status: 'loading' }} />);

    expect(screen.getByRole('status')).toHaveTextContent(/checking api status/i);
    expect(screen.getByRole('heading', { name: 'API health' })).toBeInTheDocument();
  });

  it('renders the success state with status, database, and timestamp', () => {
    render(
      <HealthView
        state={{
          status: 'success',
          data: {
            status: 'ok',
            database: 'up',
            timestamp: '2026-01-01T00:00:00.000Z',
          },
        }}
      />,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('Up')).toBeInTheDocument();
    expect(screen.getByText('2026-01-01T00:00:00.000Z')).toBeInTheDocument();
  });

  it('renders a degraded success state as text, not colour alone', () => {
    render(
      <HealthView
        state={{
          status: 'success',
          data: {
            status: 'degraded',
            database: 'down',
            timestamp: '2026-01-01T00:00:00.000Z',
          },
        }}
      />,
    );

    expect(screen.getByText('Degraded')).toBeInTheDocument();
    expect(screen.getByText('Down')).toBeInTheDocument();
  });

  it('renders a failure state with an alert and the error message', () => {
    render(<HealthView state={{ status: 'error', message: 'connection refused' }} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/unavailable/i);
    expect(alert).toHaveTextContent('connection refused');
  });
});
