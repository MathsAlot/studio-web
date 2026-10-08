import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VersionField, versionError } from '@/components/ui/version-field';

describe('VersionField', () => {
  it('shows the numeric value without the v prefix and emits a v-prefixed string', () => {
    const onChange = vi.fn();
    render(<VersionField id="version" value="v2" onChange={onChange} />);

    const input = screen.getByLabelText('Version');
    expect(input).toHaveValue('2');

    fireEvent.change(input, { target: { value: '3' } });
    expect(onChange).toHaveBeenCalledWith('v3');
  });

  it('rejects non-numeric input instead of writing it to the value', () => {
    const onChange = vi.fn();
    render(<VersionField id="version" value="v1" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Version'), { target: { value: 'abc' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows an inline error and marks the field invalid', () => {
    render(<VersionField id="version" value="" onChange={vi.fn()} error={versionError('')} />);

    expect(screen.getByText('Enter a version.')).toBeInTheDocument();
    expect(screen.getByLabelText('Version')).toHaveAttribute('aria-invalid', 'true');
  });

  it('validates the v-prefixed version shape', () => {
    expect(versionError('v1')).toBeNull();
    expect(versionError('v42')).toBeNull();
    expect(versionError('')).toBe('Enter a version.');
    expect(versionError('one')).toBe('Use a whole number of 1 or more, for example v1.');
    expect(versionError('v0')).toBe('Use a whole number of 1 or more, for example v1.');
  });

  it('does not double the prefix on a legacy non-numeric value', () => {
    render(<VersionField id="version" value="beta" onChange={vi.fn()} />);

    expect(screen.getByLabelText('Version')).toHaveValue('beta');
    expect(screen.queryByTestId('version-prefix')).not.toBeInTheDocument();
  });

  it('keeps a legacy dotted value visible and editable without doubling', () => {
    const onChange = vi.fn();
    render(<VersionField id="version" value="v2.1" onChange={onChange} />);

    const input = screen.getByLabelText('Version');
    expect(input).toHaveValue('v2.1');
    expect(screen.queryByTestId('version-prefix')).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'v2.1-beta' } });
    expect(onChange).toHaveBeenCalledWith('v2.1-beta');
  });
});
