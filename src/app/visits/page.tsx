import { VisitShell } from '@/components/visits/visit-shell';

export default function VisitsPage() {
  return (
    <main className="min-h-screen px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm uppercase tracking-[0.24em] text-sidrah-500">Record visit</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">Capture stock and cash quickly</h1>
        </section>
        <VisitShell />
      </div>
    </main>
  );
}
