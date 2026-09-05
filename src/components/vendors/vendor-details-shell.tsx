'use client';

import Link from 'next/link';
import { useAuthQuery, useTransactionsByVendorQuery, useVendorBalanceQuery, useVendorInventoryQuery, useVendorQuery, useProductsQuery } from '@/lib/hooks/queries';
import { TransactionTable } from '@/components/vendors/transaction-table';
import { MobileBottomNav } from '@/components/ui/mobile-bottom-nav';
import { isAdminOrSupervisorRole } from '@/lib/authorization';

interface VendorDetailsShellProps {
  vendorId: string;
}

export function VendorDetailsShell({ vendorId }: VendorDetailsShellProps) {
  const { data: session } = useAuthQuery();
  const canEditVendor = isAdminOrSupervisorRole(session?.role);
  const {
    data: vendor,
    isLoading: vendorLoading,
    isError: vendorError,
  } = useVendorQuery(vendorId);
  const {
    data: vendorInventory,
    isLoading: vendorInventoryLoading,
    isError: vendorInventoryError,
  } = useVendorInventoryQuery(vendorId);
  const {
    data: vendorBalance,
    isLoading: balanceLoading,
    isError: balanceError,
  } = useVendorBalanceQuery(vendorId);
  const {
    data: transactions,
    isLoading: transactionsLoading,
    isError: transactionsError,
  } = useTransactionsByVendorQuery(vendorId);
  const {
    data: products,
    isLoading: productsLoading,
    isError: productsError,
  } = useProductsQuery();

  const hasVendorInventory = Array.isArray(vendorInventory) && vendorInventory.length > 0;
  const currentStock = hasVendorInventory
    ? vendorInventory.reduce((sum, record) => sum + (record.current_stock ?? 0), 0)
    : 0;
  const isLoading = vendorLoading || vendorInventoryLoading || balanceLoading || transactionsLoading;
  const isVendorError = vendorError || !vendor;
  const showInventoryError = !vendorInventoryLoading && !!vendorInventoryError;
  const showEmptyInventory = !vendorInventoryLoading && !vendorInventoryError && !hasVendorInventory;
  const productNames = Array.isArray(products)
    ? Object.fromEntries(products.map((product) => [product.product_id, product.product_name]))
    : undefined;

  if (isLoading) {
    return (
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-soft">
          <p className="text-slate-700">Loading vendor details…</p>
        </div>
      </main>
    );
  }

  if (isVendorError) {
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
            {canEditVendor ? (
              <Link
                href={`/vendors/${vendor.vendor_id}/edit`}
                className="inline-flex rounded-3xl border border-sidrah-300 px-4 py-2 text-sm font-semibold text-sidrah-700 hover:bg-sidrah-50"
              >
                Edit Vendor
              </Link>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Current stock</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{currentStock}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Vendor balance</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {vendorBalance?.balance_owed === undefined || vendorBalance?.balance_owed === null ? (
                  'GMD 0'
                ) : vendorBalance.balance_owed > 0 ? (
                  `GMD ${vendorBalance.balance_owed.toLocaleString()} owed`
                ) : vendorBalance.balance_owed < 0 ? (
                  `GMD ${Math.abs(vendorBalance.balance_owed).toLocaleString()} credit`
                ) : (
                  'GMD 0'
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Vendor inventory</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Product stock held by vendor</h2>
            </div>
          </div>

          {showInventoryError ? (
            <div className="rounded-3xl bg-rose-50 p-4 text-sm text-rose-700">
              Unable to load vendor inventory. Vendor details are still available.
            </div>
          ) : null}

          {showEmptyInventory ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">This vendor has not received any stock yet. Supply stock to begin tracking their obligation.</p>
              <p className="mt-2">Current stock is 0 until a VendorInventory record exists.</p>
              <div className="mt-4">
                <a
                  href={`/supply?vendorId=${vendor.vendor_id}`}
                  className="inline-flex rounded-3xl bg-sidrah-500 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sidrah-600"
                >
                  Supply Stock
                </a>
              </div>
            </div>
          ) : null}

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Current stock</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Total received</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Supplied</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {hasVendorInventory ? (
                  vendorInventory.map((record) => (
                    <tr key={record.vendor_inventory_id}>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                        {productNames?.[record.product_id] ?? record.product_id}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{record.current_stock}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{record.total_stock_received}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{record.total_stock_received}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-500" colSpan={4}>
                      No vendor inventory records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
            <TransactionTable transactions={transactions?.slice(0, 10) ?? []} />
          </div>
        </section>
      </div>
      <MobileBottomNav />
    </main>
  );
}
