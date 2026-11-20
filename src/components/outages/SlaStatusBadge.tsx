'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getSlaStatusBadgeTooltip } from '@/lib/slaStatusTooltip';
import type { SLAResult } from '@/types/sla';

type SlaStatus = SLAResult['status'];

interface SlaStatusBadgeProps {
  /** SLA status to display on the badge. */
  status?: SlaStatus | null;
  /** Full SLA result for richer tooltip copy when available. */
  result?: SLAResult | null;
  /** Optional backend reason code for tooltip copy. */
  reasonCode?: string | null;
}

export function getSlaStatusBadgeText(status: SlaStatus): string {
  return status === 'violated' ? 'Violated' : 'Met';
}

export function getSlaStatusBadgeTooltipText(
  status: SlaStatus,
  result?: SLAResult | null,
  reasonCode?: string | null
): string {
  if (result) {
    return getSlaStatusBadgeTooltip(result, reasonCode);
  }
  return status === 'violated'
    ? 'SLA target was violated for this outage.'
    : 'SLA target was met for this outage.';
}

export default function SlaStatusBadge({
  status,
  result,
  reasonCode,
}: SlaStatusBadgeProps) {
  const resolvedStatus = status ?? result?.status;
  if (!resolvedStatus) return null;

  const label = getSlaStatusBadgeText(resolvedStatus);
  const tooltip = getSlaStatusBadgeTooltipText(
    resolvedStatus,
    result ?? undefined,
    reasonCode
  );
  const isViolated = resolvedStatus === 'violated';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            role="status"
            aria-label={`SLA status ${label}. ${tooltip}`}
            data-testid="sla-status-badge"
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
              isViolated
                ? 'bg-red-100 text-red-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            SLA {label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
