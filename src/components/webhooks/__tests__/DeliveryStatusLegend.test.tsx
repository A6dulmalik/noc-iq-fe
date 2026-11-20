import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DeliveryStatusLegend } from '../DeliveryStatusLegend';

describe('DeliveryStatusLegend (#921)', () => {
  it('lists all delivery statuses with accessible labels', () => {
    render(<DeliveryStatusLegend />);

    const legend = screen.getByTestId('delivery-status-legend');
    expect(legend).toHaveAttribute('aria-label', 'Delivery status legend');

    const items = within(legend).getAllByRole('listitem');
    expect(items).toHaveLength(3);

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });
});
