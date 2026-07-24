'use client';

import { useInventoryByVendorQuery, useTransactionsByVendorQuery, useVendorQuery } from '@/lib/hooks/queries';
import { TransactionTable } from '@/components/vendors/transaction-table';
import { MobileBottomNav } from '@/components/ui/mobile-bottom-nav';

interface VendorDetailsShellProps {
  vendorId: string;
}

export function VendorDetailsShell({ vendorId }: VendorDetailsShellProps) {
  const {
    data: vendor,
    isLoading: vendorLoading,
    isError: vendorError,
  } = useVendorQuery(vendorId);
  const {
    data: inventory,
    isLoading: inventoryLoading,
    isError: inventoryError,
  } = useInventoryByVendorQuery(vendorId);
  const {
    data: transactions,
    isLoading: transactionsLoading,
    isError: transactionsError,
  } = useTransactionsByVendorQuery(vendorId);

  const isLoading = vendorLoading || inventoryLoading || transactionsLoading;
  const isErrorState = vendorError || inventoryError || transactionsError;

  if (isLoading) {
    return (
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-soft">
          <p className="text-slate-700">Loading vendor details…</p>
        </div>
      </main>
    );
  }

  if (!vendor || isErrorState) {
    return (
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-soft">
          <p className="text-slate-700">
            {vendor ? 'Unable to load vendor details.' : 'Vendor not found.'}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Vendor details</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">{vendor.vendor_name}</h1>
              <p className="mt-1 text-sm text-slate-600">{vendor.location} • {vendor.phone}</p>
            </div>
            <span className="rounded-3xl bg-sidrah-50 px-3 py-1 text-sm font-semibold text-sidrah-700">
              {vendor.vendor_id}
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Current stock</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{inventory?.current_stock ?? 0}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Balance owed</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">GMD {(inventory?.balance_owed ?? 0).toLocaleString()}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Recent transactions</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Last 10 visits</h2>
            </div>
          </div>

          <div className="mt-6">
            <TransactionTable transactions={transactions ?? []} />
          </div>
        </section>
      </div>
      <MobileBottomNav />
    </main>
  );
}
