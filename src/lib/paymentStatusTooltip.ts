/**
 * Payment status tooltip copy (#917).
 *
 * Each payment status can be ambiguous to new users, so the status pill shows
 * an accessible tooltip describing what the state means. The copy is distinct
 * per known status and falls back to a generic explanation for unknown values.
 */

const STATUS_EXPLANATIONS: Record<string, string> = {
  PENDING: 'Payment has been initiated and is awaiting confirmation.',
  CONFIRMED: 'Payment has been confirmed on the network or ledger.',
  RELEASED: 'Funds have been released to the recipient.',
  REFUNDED: 'Payment was reversed and funds were returned to the payer.',
  FAILED: 'Payment could not be completed.',
};

/** Short explanation for a payment status pill tooltip. */
export function getPaymentStatusTooltip(status: string | null | undefined): string {
  const normalized = String(status ?? '').trim().toUpperCase();
  if (!normalized) return 'Payment status is unavailable.';
  return (
    STATUS_EXPLANATIONS[normalized] ??
    `Payment status is ${normalized.toLowerCase()}.`
  );
}

/** Known payment statuses with tooltip copy (useful for tests/iteration). */
export const PAYMENT_STATUS_TOOLTIPS = STATUS_EXPLANATIONS;
