import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-soft">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-sidrah-50 p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-sidrah-700">SIDRAH SALAAM</p>
            <h1 className="mt-4 text-3xl font-semibold text-sidrah-900 sm:text-4xl">
              Vendor Management System
            </h1>
            <p className="mt-4 max-w-2xl text-slate-700">
              Fast mobile-first workflow for field agents to record stock sales, cash collection, and deliveries without spreadsheets.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/login" className="rounded-3xl bg-sidrah-500 px-5 py-4 text-white shadow-soft transition hover:bg-sidrah-600">
              Launch App
            </Link>
            <Link href="/dashboard" className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-slate-900 shadow-soft transition hover:border-sidrah-300">
              View Dashboard
            </Link>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-semibold text-slate-900">Built for field agents</h2>
            <ul className="mt-4 space-y-3 text-slate-700">
              <li>• Search vendors instantly by ID, name, or phone.</li>
              <li>• Record visits with stock sold, cash collected, and stock delivered.</li>
              <li>• Offline-aware mobile UI designed for fast daily use.</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
