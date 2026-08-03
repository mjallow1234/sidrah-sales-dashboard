import { DashboardFiltersProvider } from '@/components/dashboard/dashboard-filters-provider';
import { DashboardFilters } from '@/components/dashboard/dashboard-filters';

export default function ReportsPage() {
  return (
    <DashboardFiltersProvider>
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <p className="text-sm uppercase tracking-[0.24em] text-sidrah-500">Supervisor reports</p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">Reports and inventory insights</h1>
            <p className="mt-4 text-slate-600">
              This page will display inventory status, vendor health, and outstanding balances for supervisors and administrators.
            </p>
          </section>

          <DashboardFilters />

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <p className="text-sm uppercase tracking-[0.24em] text-sidrah-500">Report summary</p>
            <p className="mt-2 text-sm text-slate-600">Use the filters above to refine the report results.</p>
          </section>
        </div>
      </main>
    </DashboardFiltersProvider>
  );
}
