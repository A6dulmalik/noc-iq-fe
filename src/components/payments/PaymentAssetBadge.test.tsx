import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PaymentAssetBadge, {
  getPaymentAssetBadgeLabel,
} from './PaymentAssetBadge';

describe('PaymentAssetBadge (#913)', () => {
  it('shows the payment asset code', () => {
    render(<PaymentAssetBadge assetCode="XLM" />);

    const badge = screen.getByTestId('payment-asset-badge');
    expect(badge).toHaveTextContent('XLM');
    expect(badge).toHaveAttribute('aria-label', 'Asset: XLM');
  });

  it('falls back to a generic label for unknown assets', () => {
    render(<PaymentAssetBadge assetCode={null} />);

    const badge = screen.getByTestId('payment-asset-badge');
    expect(badge).toHaveTextContent('Unknown');
    expect(getPaymentAssetBadgeLabel('')).toBe('Unknown');
    expect(getPaymentAssetBadgeLabel('   ')).toBe('Unknown');
    expect(getPaymentAssetBadgeLabel(undefined)).toBe('Unknown');
  });

  it('renders text content so the badge is not color-only', () => {
    render(<PaymentAssetBadge assetCode="USDC" />);

    expect(screen.getByText('USDC')).toBeInTheDocument();
  });
});
