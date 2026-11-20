'use client';

interface PaymentAssetBadgeProps {
  assetCode?: string | null;
}

export function getPaymentAssetBadgeLabel(assetCode?: string | null): string {
  const trimmed = String(assetCode ?? '').trim();
  return trimmed ? trimmed : 'Unknown';
}

export default function PaymentAssetBadge({ assetCode }: PaymentAssetBadgeProps) {
  const label = getPaymentAssetBadgeLabel(assetCode);

  return (
    <span
      data-testid="payment-asset-badge"
      className="inline-flex items-center rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-700"
      aria-label={`Asset: ${label}`}
    >
      {label}
    </span>
  );
}
