'use client';

/**
 * Compact legend mapping webhook delivery statuses to labels.
 * Uses text labels so status meaning is accessible without relying on color.
 */
const DELIVERY_STATUSES = [
  { status: 'success', label: 'Success', swatchClassName: 'bg-green-500' },
  { status: 'failed', label: 'Failed', swatchClassName: 'bg-red-500' },
  { status: 'pending', label: 'Pending', swatchClassName: 'bg-yellow-500' },
] as const;

export function DeliveryStatusLegend() {
  return (
    <div
      data-testid="delivery-status-legend"
      aria-label="Delivery status legend"
      role="list"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600"
    >
      {DELIVERY_STATUSES.map(({ status, label, swatchClassName }) => (
        <div key={status} role="listitem" className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`inline-block h-2.5 w-2.5 rounded-full ${swatchClassName}`}
          />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

export default DeliveryStatusLegend;
