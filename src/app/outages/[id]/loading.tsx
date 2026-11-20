import {
  Skeleton,
  SkeletonCard,
  SkeletonStatus,
} from '@/components/ui/skeleton';

/**
 * Route-level loading skeleton for the outage detail page.
 * Mirrors the detail layout so content can replace it without a layout shift.
 */
export function OutageDetailSkeleton() {
  return (
    <SkeletonStatus label="Loading outage details">
      <div
        data-testid="outage-detail-skeleton"
        className="container mx-auto max-w-4xl space-y-6 px-4 py-8"
        aria-hidden="true"
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-20 rounded-md" />
            <Skeleton className="h-10 w-16 rounded-md" />
            <Skeleton className="h-10 w-32 rounded-md" />
            <Skeleton className="h-10 w-20 rounded-md" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <SkeletonCard className="min-h-[150px]" />
          <SkeletonCard className="min-h-[150px]" />
          <SkeletonCard className="min-h-[180px]" />
          <SkeletonCard className="min-h-[180px]" />
          <SkeletonCard className="min-h-[140px] md:col-span-2" />
          <SkeletonCard className="min-h-[220px] md:col-span-2" />
          <SkeletonCard className="min-h-[220px] md:col-span-2" />
          <SkeletonCard className="min-h-[220px] md:col-span-2" />
        </div>
      </div>
    </SkeletonStatus>
  );
}

export default function Loading() {
  return <OutageDetailSkeleton />;
}
