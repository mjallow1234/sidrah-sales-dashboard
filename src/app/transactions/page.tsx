'use client';

import { useTransactionsQuery } from '@/lib/hooks/queries';
import { TransactionTable } from '@/components/vendors/transaction-table';

export default function TransactionsPage() {
  const { data: transactions, isLoading, isError } = useTransactionsQuery();

  if (isLoading) {
    return (
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-slate-700">Loading transaction history…</p>
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-soft">
          <p className="text-rose-700">Unable to load transactions. Please try again later.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-sm uppercase tracking-[0.24em] text-sidrah-500">Transaction history</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">All inventory transactions</h1>
          <p className="mt-2 text-sm text-slate-600">View stock in/out, balances, and recent visit activity.</p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mt-6">
            <TransactionTable transactions={transactions ?? []} />
          </div>
        </section>
      </div>
    </main>
  );
}
