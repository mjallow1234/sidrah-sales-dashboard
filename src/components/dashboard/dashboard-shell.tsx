'use client';

import { StatsCard } from '@/components/dashboard/stats-card';
import { MobileBottomNav } from '@/components/ui/mobile-bottom-nav';
import { useStatsQuery } from '@/lib/hooks/queries';

export function DashboardShell() {
  const { data: stats, isLoading, isError } = useStatsQuery();

  return (
    <main className="min-h-screen px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-sidrah-500">Dashboard</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">Field agent summary</h1>
            </div>
            <div className="rounded-3xl bg-sidrah-50 px-4 py-3 text-sm text-sidrah-700">
              Mobile-first workflow for vendor visits
            </div>
          </div>
        </section>

        {isError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-soft">
            Unable to load dashboard stats. Please refresh the page.
          </div>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatsCard label="Vendors visited" value={isLoading ? '...' : stats?.vendorsVisitedToday ?? 0} description="Visits recorded for today." />
            <StatsCard label="Buckets sold" value={isLoading ? '...' : stats?.bucketsSoldToday ?? 0} description="Total stock sold today." />
            <StatsCard label="Cash collected" value={isLoading ? '...' : `GMD ${stats?.cashCollectedToday.toLocaleString() ?? 0}`} description="Cash collected today." />
            <StatsCard label="Low stock" value={isLoading ? '...' : stats?.lowStockVendors ?? 0} description="Vendors with low inventory." />
            <StatsCard label="Outstanding balances" value={isLoading ? '...' : stats?.outstandingBalances ?? 0} description="Vendors owing cash." />
          </section>
        )}

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
      <MobileBottomNav />
    </main>
  );
}
