'use client';

import { useEffect, useMemo, useState } from 'react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { useStatsQuery } from '@/lib/hooks/queries';
import { useDashboardFilters } from '@/components/dashboard/dashboard-filters-provider';
import { DashboardFilters } from '@/components/dashboard/dashboard-filters';
import { DashboardFiltersSummary } from '@/components/dashboard/dashboard-filters-summary';
import { useRouter } from 'next/navigation';

export function DashboardShell() {
  const router = useRouter();
  const { filters } = useDashboardFilters();
  const [role, setRole] = useState<string | undefined>(undefined);

  useEffect(() => {
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
  }, []);

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

  const { data: stats, isLoading, isError } = useStatsQuery(statsFilters);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

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

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            {isError ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-soft">
                Unable to load dashboard stats. Please refresh the page.
              </div>
            ) : (
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatsCard label="Vendors visited" value={isLoading ? '...' : stats?.vendorsVisited ?? 0} description={isAgent ? "Vendors visited today." : "Vendors visited in the selected period."} />
                <StatsCard label="Buckets sold" value={isLoading ? '...' : stats?.bucketsSold ?? 0} description={isAgent ? "Buckets sold today." : "Total stock sold in the selected period."} />
                <StatsCard label="Cash collected" value={isLoading ? '...' : `GMD ${(stats?.cashCollected ?? 0).toLocaleString()}`} description={isAgent ? "Cash collected today." : "Cash collected in the selected period."} />
                <StatsCard label="Low stock" value={isLoading ? '...' : stats?.lowStockVendors ?? 0} description={isAgent ? "Vendors with low inventory today." : "Vendors with low inventory in the selected period."} />
                <StatsCard label="Outstanding balances" value={isLoading ? '...' : stats?.outstandingBalances ?? 0} description={isAgent ? "Outstanding balance today." : "Vendors owing cash."} />
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
