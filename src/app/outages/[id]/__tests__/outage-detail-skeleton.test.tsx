import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Loading, { OutageDetailSkeleton } from '../loading';

describe('outage detail loading skeleton (#945)', () => {
  it('renders the route-level skeleton layout', () => {
    render(<Loading />);

    expect(screen.getByTestId('outage-detail-skeleton')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading outage details'
    );
  });

  it('uses decorative aria-hidden markup', () => {
    render(<OutageDetailSkeleton />);

    const skeleton = screen.getByTestId('outage-detail-skeleton');
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    // Skeleton blocks are present as decorative placeholders.
    expect(skeleton.querySelectorAll('.animate-pulse').length).toBeGreaterThan(
      0
    );
  });
});
