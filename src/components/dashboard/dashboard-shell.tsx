'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { VendorsOwingModal } from '@/components/dashboard/vendors-owing-modal';
import { useStatsQuery, useVendorsOwingQuery } from '@/lib/hooks/queries';
import { useDashboardFilters } from '@/components/dashboard/dashboard-filters-provider';
import { DashboardFilters } from '@/components/dashboard/dashboard-filters';
import { DashboardFiltersSummary } from '@/components/dashboard/dashboard-filters-summary';
import { VendorIntelligenceSection } from '@/components/dashboard/vendor-intelligence-section';
import { useRouter } from 'next/navigation';

export function DashboardShell({ initialRole }: { initialRole?: string }) {
  const router = useRouter();
  const { filters } = useDashboardFilters();
  const [role, setRole] = useState<string | undefined>(initialRole);

  useEffect(() => {
    if (initialRole !== undefined) {
      return;
    }

    let active = true;

    async function loadRole() {
      try {
        const response = await fetch('/api/auth');
        const data = await response.json();
        if (active) {
          setRole(data?.role);
        }
      } catch {
        if (active) {
          setRole(undefined);
        }
      }
    }

    loadRole();
    return () => {
      active = false;
    };
  }, [initialRole]);

  const today = useMemo(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  }, []);

  const isAgent = role === 'agent';
  const showFilters = role !== undefined && !isAgent;
  const statsFilters = useMemo(
    () => (isAgent ? undefined : filters),
    [filters, isAgent]
  );
  const dashboardTitle = isAgent ? "Today's Activity" : 'Field Agent Summary';

  const { data: stats, isLoading, isError } = useStatsQuery(statsFilters, { enabled: role !== undefined });

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const [isVendorsOwingOpen, setIsVendorsOwingOpen] = useState(false);

  const { data: vendorsOwing, isLoading: vendorsOwingLoading } = useVendorsOwingQuery();

  const bucketsOutThereDescription = useMemo(() => {
    const productBreakdown = stats?.totalBucketsOutThereByProduct ?? [];
    if (productBreakdown.length === 0) {
      return 'Current live vendor stock total across the selected filters.';
    }

    const topProducts = productBreakdown.slice(0, 3);
    const remainingProducts = productBreakdown.length - topProducts.length;
    const remainingTotal = productBreakdown.slice(3).reduce((sum, product) => sum + product.quantity, 0);

    return (
      <div className="space-y-2">
        <div>Current live stock by product.</div>
        <div className="space-y-1 pt-2">
          {topProducts.map((item) => (
            <div key={item.productName} className="flex items-center justify-between gap-4 text-sm text-slate-600">
              <span className="truncate">{item.productName}</span>
              <span>{item.quantity.toLocaleString()}</span>
            </div>
          ))}
          {remainingProducts > 0 ? (
            <div className="flex items-center justify-between gap-4 text-sm text-slate-500">
              <span>{`+${remainingProducts} more`}</span>
              <span>{remainingTotal.toLocaleString()}</span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }, [stats?.totalBucketsOutThereByProduct]);

  type DashboardCardRow = {
    label: string;
    value: string | number;
    description: ReactNode;
    action?: () => void;
    isClickable?: boolean;
  };

  const cardRows = useMemo<DashboardCardRow[]>(() => {
    if (isAgent) {
      return [
        {
          label: 'Vendors visited',
          value: isLoading ? '...' : stats?.vendorsVisited ?? 0,
          description: 'Vendors visited today.',
        },
        {
          label: 'Buckets sold',
          value: isLoading ? '...' : stats?.bucketsSold ?? 0,
          description: 'Buckets sold today.',
        },
        {
          label: 'Cash collected',
          value: isLoading ? '...' : `GMD ${(stats?.cashCollected ?? 0).toLocaleString()}`,
          description: 'Cash collected today.',
        },
        {
          label: 'Balance owed',
          value: isLoading ? '...' : `GMD ${(stats?.totalVendorReceivables ?? 0).toLocaleString()}`,
          description: 'Total outstanding balance from your vendors.',
          action: () => setIsVendorsOwingOpen(true),
          isClickable: true,
        },
      ];
    }

    return [
      {
        label: 'Total buckets out there',
        value: isLoading ? '...' : stats?.totalBucketsOutThere ?? 0,
        description: bucketsOutThereDescription,
      },
      {
        label: 'Total vendors',
        value: isLoading ? '...' : stats?.totalActiveVendors ?? 0,
        description: 'Total number of active vendors.',
      },
      {
        label: 'Buckets sold',
        value: isLoading ? '...' : stats?.bucketsSold ?? 0,
        description: 'Total stock sold in the selected period.',
      },
      {
        label: 'Cash collected',
        value: isLoading ? '...' : `GMD ${(stats?.cashCollected ?? 0).toLocaleString()}`,
        description: 'Cash collected in the selected period.',
      },
      {
        label: 'Total amount owed',
        value: isLoading ? '...' : `GMD ${(stats?.totalAmountOwed ?? 0).toLocaleString()}`,
        description: 'Current cumulative outstanding product value minus cash received.',
      },
    ];
  }, [isAgent, isLoading, stats, bucketsOutThereDescription]);

  return (
    <div className="px-4 pb-24 pt-8 sm:px-6 sm:pb-8 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-sidrah-500">Dashboard</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-slate-900">{dashboardTitle}</h1>
                {isAgent ? (
                  <span className="rounded-full bg-sidrah-50 px-3 py-1 text-sm font-semibold text-sidrah-700">
                    Today's Activity Only
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-3xl bg-sidrah-50 px-4 py-3 text-sm text-sidrah-700">
                Mobile-first workflow for vendor visits
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-3xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Logout
              </button>
            </div>
          </div>
        </section>

        {showFilters ? <DashboardFilters /> : null}

        <VendorIntelligenceSection />

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            {isError ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-soft">
                Unable to load dashboard stats. Please refresh the page.
              </div>
            ) : (
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                {cardRows.map((card) => (
                  <StatsCard
                    key={card.label}
                    label={card.label}
                    value={card.value}
                    description={card.description}
                    onClick={card.action}
                    isClickable={card.isClickable}
                  />
                ))}
              </section>
            )}
          </div>

          {showFilters ? (
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
                <h3 className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Filter summary</h3>
                <p className="mt-2 text-sm text-slate-600">Filters active on dashboard metrics and charts.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
                <DashboardFiltersSummary isAgent={isAgent} today={today} />
              </div>
            </div>
          ) : null}
        </section>

        {isAgent && isVendorsOwingOpen ? (
          <VendorsOwingModal
            vendors={vendorsOwing ?? []}
            totalOwed={stats?.totalVendorReceivables ?? 0}
            onClose={() => setIsVendorsOwingOpen(false)}
          />
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Recent vendors</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Vendor activity</h2>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <p className="text-sm text-slate-600">Search vendors or record a visit using the navigation bar.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Quick actions</p>
            <div className="mt-6 space-y-3">
              <a href="/vendors" className="block rounded-3xl border border-sidrah-100 bg-sidrah-50 px-4 py-4 text-sm font-semibold text-sidrah-900 hover:bg-sidrah-100">
                Search vendors
              </a>
              <a href="/visits" className="block rounded-3xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-900 hover:bg-slate-50">
                Record a visit
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
