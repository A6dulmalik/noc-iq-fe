import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refetchPrimary = vi.fn().mockResolvedValue({});
const refetchSecondary = vi.fn().mockResolvedValue({});
const refetchMttr = vi.fn().mockResolvedValue({});
const refetchOutages = vi.fn().mockResolvedValue({});

let useQueryCall = 0;

const metricsData = {
  sla_compliance_percentage: 95,
  penalties: { total: 0, count: 0 },
  rewards: { total: 0, count: 0 },
  trends: [],
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => {
    const idx = useQueryCall++;
    const base = {
      data:
        idx === 3
          ? { items: [], total: 0, page: 1, page_size: 500 }
          : idx === 2
            ? { items: [], total: 0, page: 1, page_size: 500 }
            : metricsData,
      isLoading: false,
      isError: false,
      isFetching: false,
      error: null,
      dataUpdatedAt: Date.now(),
    };
    if (idx === 0) return { ...base, refetch: refetchPrimary };
    if (idx === 1) return { ...base, refetch: refetchSecondary };
    if (idx === 2) return { ...base, refetch: refetchMttr };
    return { ...base, refetch: refetchOutages };
  },
}));

vi.mock('@/hooks/useUrlSync', () => ({
  useUrlSync: () => [
    {
      date_from: '',
      date_to: '',
      severity: '',
      site: '',
      compare: '0',
      compare_from: '',
      compare_to: '',
      preset: '',
    },
    vi.fn(),
  ],
}));

vi.mock('@/hooks/useAutoRefresh', () => ({
  useAutoRefresh: () => ({
    refetchInterval: false,
    intervalMs: 0,
    setIntervalMs: vi.fn(),
    isTabVisible: true,
  }),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => vi.fn(),
}));

vi.mock('@/services/outages', () => ({
  getOutages: vi.fn(),
}));
vi.mock('@/services/dashboardService', () => ({
  fetchDashboardMetrics: vi.fn(),
}));

vi.mock('@/lib/dashboardSnapshot', () => ({
  buildDashboardShareUrl: vi.fn(),
  buildDashboardSnapshot: vi.fn(),
}));
vi.mock('@/lib/mttrHistogram', () => ({
  buildMttrHistogram: () => [],
}));
vi.mock('@/lib/slaTrendSeries', () => ({
  buildSlaTrendSeries: () => [],
  resolveTrendWindow: () => ({ from: new Date(0), to: new Date(1) }),
}));
vi.mock('@/lib/pdfExport', () => ({
  exportSlaReportPdf: vi.fn(),
}));
vi.mock('@/lib/queryKeys', () => ({
  queryKeys: {
    dashboard: {
      metrics: () => ['dashboard', 'metrics'],
      compare: () => ['dashboard', 'compare'],
    },
    outages: {
      list: () => ['outages', 'list'],
    },
  },
}));
vi.mock('@/lib/dateRangePresets', () => ({
  DATE_RANGE_PRESETS: [],
  computePresetRange: vi.fn(),
}));
vi.mock('@/lib/kpiDefinitions', () => ({
  KPI_DEFINITIONS: {
    slaCompliance: '',
    totalPenalties: '',
    totalRewards: '',
    netBalance: '',
  },
}));

vi.mock('@/components/dashboard/KPICard', () => ({ default: () => null }));
vi.mock('@/components/dashboard/OutageAlertBanner', () => ({ default: () => null }));
vi.mock('@/components/dashboard/PenaltiesRewardsChart', () => ({ default: () => null }));
vi.mock('@/components/dashboard/SLATrendChart', () => ({ default: () => null }));
vi.mock('@/components/dashboard/AutoRefreshControl', () => ({ default: () => null }));
vi.mock('@/components/dashboard/ExportModal', () => ({ default: () => null }));
vi.mock('@/components/dashboard/FinancialSummaryWidget', () => ({ default: () => null }));
vi.mock('@/components/dashboard/PenaltyCreditsWidget', () => ({ default: () => null }));
vi.mock('@/components/dashboard/MTTRHistogramChart', () => ({ default: () => null }));
vi.mock('@/components/dashboard/MttrMtbfCards', () => ({ default: () => null }));
vi.mock('@/components/dashboard/SLABreachCountdownCard', () => ({ default: () => null }));
vi.mock('@/components/dashboard/SystemStatusWidget', () => ({ default: () => null }));
vi.mock('@/components/dashboard/SiteSelector', () => ({
  default: () => null,
  deriveSiteOptions: () => [],
}));
vi.mock('@/components/charts/RiskGauge', () => ({ default: () => null }));
vi.mock('@/components/charts/SlaTrendChart', () => ({ default: () => null }));
vi.mock('@/components/notifications/BreachToast', () => ({ BreachToast: () => null }));
vi.mock('@/components/ui/route-state', () => ({ RouteErrorState: () => null }));
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => null,
  SkeletonChart: () => null,
  SkeletonMetricCard: () => null,
  SkeletonStatus: () => null,
}));

import SLADashboardView from './sla-dashboard-view';

describe('SLADashboardView manual refresh (#905)', () => {
  beforeEach(() => {
    useQueryCall = 0;
    refetchPrimary.mockClear();
    refetchSecondary.mockClear();
    refetchMttr.mockClear();
    refetchOutages.mockClear();
  });

  it('triggers a dashboard refetch when refresh is clicked', async () => {
    const user = userEvent.setup();
    render(<SLADashboardView />);

    const button = screen.getByRole('button', { name: 'Refresh dashboard' });
    expect(button).toBeEnabled();
    expect(button).toHaveTextContent('Refresh');

    await user.click(button);

    expect(refetchPrimary).toHaveBeenCalledTimes(1);
    expect(refetchSecondary).toHaveBeenCalledTimes(1);
    expect(refetchMttr).toHaveBeenCalledTimes(1);
    expect(refetchOutages).toHaveBeenCalledTimes(1);
  });
});
