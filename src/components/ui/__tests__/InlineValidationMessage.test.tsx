import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InlineValidationMessage } from '../InlineValidationMessage';

describe('InlineValidationMessage (#941)', () => {
  it('announces an error when it appears', () => {
    const { rerender } = render(<InlineValidationMessage message={null} />);

    expect(screen.getByRole('status')).toHaveTextContent('');

    rerender(<InlineValidationMessage message="Email is already in use" />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Email is already in use'
    );
    expect(
      screen.getByText('Email is already in use', { selector: 'p' })
    ).toBeInTheDocument();
  });

  it('clears the visible error without creating a new announcement', () => {
    const { rerender } = render(
      <InlineValidationMessage message="Service unavailable" />
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Service unavailable'
    );

    rerender(<InlineValidationMessage message={null} />);

    expect(screen.queryByText('Service unavailable')).not.toBeInTheDocument();
    // Clearing must not replace the polite region with a spoken "cleared"
    // message; the announcement target becomes empty.
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('does not re-announce the same error on rerender', () => {
    const { rerender } = render(
      <InlineValidationMessage message="Username is taken" />
    );

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveTextContent('Username is taken');

    rerender(<InlineValidationMessage message="Username is taken" />);
    rerender(<InlineValidationMessage message="Username is taken" />);

    expect(liveRegion).toHaveTextContent('Username is taken');
  });

  it('announces when async validation resolves to a different error', () => {
    const { rerender } = render(
      <InlineValidationMessage message="Checking name failed" />
    );

    rerender(<InlineValidationMessage message="Name is already reserved" />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Name is already reserved'
    );
  });
});
