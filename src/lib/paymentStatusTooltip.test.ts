import { describe, expect, it } from 'vitest';

import {
  getPaymentStatusTooltip,
  PAYMENT_STATUS_TOOLTIPS,
} from './paymentStatusTooltip';

describe('getPaymentStatusTooltip', () => {
  it('returns distinct copy for each known payment status', () => {
    expect(getPaymentStatusTooltip('PENDING')).toBe(
      'Payment has been initiated and is awaiting confirmation.'
    );
    expect(getPaymentStatusTooltip('CONFIRMED')).toBe(
      'Payment has been confirmed on the network or ledger.'
    );
    expect(getPaymentStatusTooltip('RELEASED')).toBe(
      'Funds have been released to the recipient.'
    );
    expect(getPaymentStatusTooltip('REFUNDED')).toBe(
      'Payment was reversed and funds were returned to the payer.'
    );
    expect(getPaymentStatusTooltip('FAILED')).toBe(
      'Payment could not be completed.'
    );
  });

  it('normalizes case and whitespace for known statuses', () => {
    expect(getPaymentStatusTooltip(' confirmed ')).toBe(
      PAYMENT_STATUS_TOOLTIPS.CONFIRMED
    );
  });

  it('falls back to a generic message for unknown or missing statuses', () => {
    expect(getPaymentStatusTooltip('processing')).toBe(
      'Payment status is processing.'
    );
    expect(getPaymentStatusTooltip('')).toBe('Payment status is unavailable.');
    expect(getPaymentStatusTooltip(null)).toBe(
      'Payment status is unavailable.'
    );
  });
});
