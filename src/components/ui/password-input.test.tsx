import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PasswordInput } from '@/components/ui/password-input';

describe('PasswordInput', () => {
  it('starts hidden and flips the input type when toggled', () => {
    render(<PasswordInput id="pw" aria-label="Password" defaultValue="hunter2" />);

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveValue('hunter2');

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('names the action, links the field, and exposes pressed state', () => {
    render(<PasswordInput id="pw" aria-label="Password" />);

    const show = screen.getByRole('button', { name: 'Show password' });
    expect(show).toHaveAttribute('type', 'button');
    expect(show).toHaveAttribute('aria-pressed', 'false');
    expect(show).toHaveAttribute('aria-controls', 'pw');

    fireEvent.click(show);

    const hide = screen.getByRole('button', { name: 'Hide password' });
    expect(hide).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Show password' })).toBeNull();
  });

  it('keeps the toggle as a native, focusable button for keyboard use', () => {
    render(<PasswordInput id="pw" aria-label="Password" />);

    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle.tagName).toBe('BUTTON');
    expect(toggle).toHaveAttribute('type', 'button');
    expect(toggle.tabIndex).toBe(0);
    expect(toggle).not.toBeDisabled();

    toggle.focus();
    expect(toggle).toHaveFocus();

    // jsdom does not synthesise a click from Enter/Space on a native button, so a
    // click is the activation a browser produces for those keys; assert it flips.
    fireEvent.click(toggle);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
  });

  it('gives the toggle a >=44px wide tap area and reserves space for it', () => {
    render(<PasswordInput id="pw" aria-label="Password" className="h-11" />);

    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle).toHaveClass('w-11', 'h-full');
    expect(screen.getByLabelText('Password')).toHaveClass('pr-11', 'h-11');
  });
});
