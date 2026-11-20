import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import SlaStatusBadge, {
  getSlaStatusBadgeTooltipText,
} from './SlaStatusBadge';

describe('SlaStatusBadge (#901)', () => {
  it('renders tooltip content explaining a met SLA status', async () => {
    const user = userEvent.setup();
    render(<SlaStatusBadge status="met" />);

    const badge = screen.getByTestId('sla-status-badge');
    expect(badge).toHaveTextContent('SLA Met');
    expect(badge).toHaveAttribute('tabIndex', '0');

    await user.hover(badge);

    expect(
      await screen.findByRole('tooltip', {
        name: 'SLA target was met for this outage.',
      })
    ).toBeInTheDocument();
  });

  it('renders concise tooltip content for a violated SLA status', async () => {
    const user = userEvent.setup();
    render(<SlaStatusBadge status="violated" />);

    const badge = screen.getByTestId('sla-status-badge');
    expect(badge).toHaveTextContent('SLA Violated');

    await user.hover(badge);

    expect(
      await screen.findByRole('tooltip', {
        name: 'SLA target was violated for this outage.',
      })
    ).toBeInTheDocument();
  });

  it('shows tooltip on keyboard focus and uses rich result copy when provided', async () => {
    const user = userEvent.setup();
    render(
      <SlaStatusBadge
        result={{
          status: 'violated',
          mttr_minutes: 42,
          threshold_minutes: 30,
          amount: -10,
          payment_type: 'penalty',
          rating: 'poor',
        }}
      />
    );

    const badge = screen.getByTestId('sla-status-badge');
    await user.tab();

    expect(badge).toHaveFocus();
    expect(
      await screen.findByRole('tooltip', {
        name: 'SLA target was violated. MTTR 42m vs 30m threshold',
      })
    ).toBeInTheDocument();
  });

  it('returns concise tooltip text helpers by status', () => {
    expect(getSlaStatusBadgeTooltipText('met')).toBe(
      'SLA target was met for this outage.'
    );
    expect(getSlaStatusBadgeTooltipText('violated')).toBe(
      'SLA target was violated for this outage.'
    );
  });
});
