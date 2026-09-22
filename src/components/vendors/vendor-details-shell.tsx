'use client';

import Link from 'next/link';
import { useAuthQuery, useTransactionsByVendorQuery, useVendorBalanceQuery, useVendorInventoryQuery, useVendorQuery, useProductsQuery, useAdminActivityQuery } from '@/lib/hooks/queries';
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
    refetch: refetchTransactions,
  } = useTransactionsByVendorQuery(vendorId);
  const {
    data: products,
    isLoading: productsLoading,
    isError: productsError,
  } = useProductsQuery();
  const {
    data: stockMovements,
    isLoading: stockMovementsLoading,
    isError: stockMovementsError,
  } = useAdminActivityQuery({ vendorId }, { enabled: canEditVendor });

  const hasVendorInventory = Array.isArray(vendorInventory) && vendorInventory.length > 0;
  const hasStockMovements = Array.isArray(stockMovements) && stockMovements.length > 0;
  const showStockMovementsError = canEditVendor && !stockMovementsLoading && !!stockMovementsError;
  const showEmptyStockMovements = canEditVendor && !stockMovementsLoading && !stockMovementsError && !hasStockMovements;
  const activeVisitSupplied = (transactions ?? []).reduce((total, transaction) => (
    transaction.is_reversed ? total : total + (transaction.stock_added ?? 0)
  ), 0);
  const reversedSupplied = (transactions ?? []).reduce((total, transaction) => (
    transaction.is_reversed ? total + (transaction.stock_added ?? 0) : total
  ), 0);
  const reversedCash = (transactions ?? []).reduce((total, transaction) => (
    transaction.is_reversed ? total + (transaction.cash_collected ?? 0) : total
  ), 0);
  const inventoryReceivedTotal = hasVendorInventory
    ? vendorInventory.reduce((sum, record) => sum + (record.total_stock_received ?? 0), 0)
    : 0;
  const roleIndependentTransferInQuantity = hasVendorInventory
    ? vendorInventory.reduce((sum, record) => sum + (record.transfer_in_quantity ?? 0), 0)
    : 0;
  const roleIndependentTransferOutQuantity = hasVendorInventory
    ? vendorInventory.reduce((sum, record) => sum + (record.transfer_out_quantity ?? 0), 0)
    : 0;
  const roleIndependentRetrievalQuantity = hasVendorInventory
    ? vendorInventory.reduce((sum, record) => sum + (record.retrieval_quantity ?? 0), 0)
    : 0;
  const totalSupplied = inventoryReceivedTotal + roleIndependentTransferInQuantity - roleIndependentTransferOutQuantity - reversedSupplied - roleIndependentRetrievalQuantity;
  const legacyOpeningQuantity = Math.max(inventoryReceivedTotal - activeVisitSupplied - roleIndependentTransferInQuantity, 0);
  const lastAddedStock = [...(transactions ?? [])]
    .filter((transaction) => !transaction.is_reversed && transaction.stock_added > 0)
    .sort((left, right) => (right.timestamp ? new Date(right.timestamp).getTime() : -Infinity) - (left.timestamp ? new Date(left.timestamp).getTime() : -Infinity))[0]?.stock_added ?? 0;
  const productCashReceived = (transactions ?? []).reduce<Record<string, number>>((totals, transaction) => {
    if (transaction.is_reversed || !transaction.product_id) {
      return totals;
    }
    totals[transaction.product_id] = (totals[transaction.product_id] ?? 0) + (transaction.cash_collected ?? 0);
    return totals;
  }, {});
  const isLoading = vendorLoading || vendorInventoryLoading || balanceLoading || transactionsLoading || (canEditVendor && stockMovementsLoading);
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
              <p className="mt-1 text-sm text-slate-600">Acquired By: {vendor.acquired_by_name || 'Not specified'}</p>
              <p className="mt-1 text-sm text-slate-600">Vendor Type: {vendor.vendor_type_name || 'Not specified'}</p>
            </div>
            {canEditVendor ? (
              <Link
                href={`/vendors/${vendor.vendor_id}/edit`}
                className="inline-flex rounded-3xl border border-sidrah-300 px-4 py-2 text-sm font-semibold text-sidrah-700 hover:bg-sidrah-50"
              >
                Edit Vendor
              </Link>
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Current attributable quantity</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{totalSupplied}</p>
              <p className="mt-1 text-xs text-slate-500">Currently payable after removals and reversals</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Total cash received</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                GMD {(vendorBalance?.cash_collected ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Balance owed</p>
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
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Last added stock</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{lastAddedStock}</p>
              <p className="mt-1 text-xs text-slate-500">Latest active supplied quantity</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Supply and cash breakdown</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Supplied quantity</p>
              <dl className="mt-3 space-y-2 text-sm text-slate-600">
                <div className="flex justify-between gap-3"><dt>Visit supplied</dt><dd className="font-semibold text-slate-900">{activeVisitSupplied}</dd></div>
                <div className="flex justify-between gap-3"><dt>Transfer in</dt><dd className="font-semibold text-slate-900">{roleIndependentTransferInQuantity}</dd></div>
                <div className="flex justify-between gap-3"><dt>Previous/opening inventory</dt><dd className="font-semibold text-slate-900">{legacyOpeningQuantity}</dd></div>
                <div className="flex justify-between gap-3 border-t border-slate-200 pt-2"><dt>Reversed (excluded)</dt><dd className="font-semibold text-rose-700">{reversedSupplied}</dd></div>
              </dl>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Cash received</p>
              <dl className="mt-3 space-y-2 text-sm text-slate-600">
                <div className="flex justify-between gap-3"><dt>Cash received</dt><dd className="font-semibold text-slate-900">GMD {(vendorBalance?.cash_collected ?? 0).toLocaleString()}</dd></div>
                <div className="flex justify-between gap-3"><dt>Reversed (excluded)</dt><dd className="font-semibold text-rose-700">GMD {reversedCash.toLocaleString()}</dd></div>
              </dl>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Legacy/opening quantity is shown only where it can be derived from the existing inventory and transaction records.</p>
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

          <div className="mt-6 space-y-3">
            {reversedSupplied > 0 ? (
              <p className="mb-3 text-xs text-slate-500">
                Supplied totals show active stock only; {reversedSupplied} reversed unit{reversedSupplied === 1 ? '' : 's'} excluded.
              </p>
            ) : null}
            {hasVendorInventory ? (
              vendorInventory.map((record) => (
                <article key={record.vendor_inventory_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{productNames?.[record.product_id] ?? 'Product unavailable — historical record'}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-slate-500">Product cash received</dt><dd className="mt-1 font-semibold text-slate-900">GMD {(productCashReceived[record.product_id] ?? 0).toLocaleString()}</dd></div>
                    <div><dt className="text-slate-500">Current attributable quantity</dt><dd className="mt-1 font-semibold text-slate-900">{record.total_stock_received + (record.transfer_in_quantity ?? 0) - (record.transfer_out_quantity ?? 0) - (transactions ?? []).reduce((total, transaction) => transaction.product_id === record.product_id && transaction.is_reversed ? total + (transaction.stock_added ?? 0) : total, 0) - (record.retrieval_quantity ?? 0)}</dd></div>
                    <div><dt className="text-slate-500">Last added stock</dt><dd className="mt-1 font-semibold text-slate-900">{record.last_supplied_quantity}</dd></div>
                  </dl>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No vendor inventory records found.</div>
            )}
          </div>
        </section>

        {canEditVendor ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Stock traceability</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Stock movement history</h2>
                <p className="mt-1 text-sm text-slate-600">Transfers, retrievals, and reversal movements for this vendor.</p>
              </div>
            </div>

            {showStockMovementsError ? (
              <div className="mt-4 rounded-3xl bg-rose-50 p-4 text-sm text-rose-700">
                Unable to load stock movements. Vendor details are still available.
              </div>
            ) : null}

            {showEmptyStockMovements ? (
              <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
                No stock movements recorded for this vendor.
              </div>
            ) : null}

            {hasStockMovements ? (
              <div className="mt-6 space-y-3">
                {stockMovements!.map((movement) => {
                      const typeLabel =
                        movement.action_type === 'transfer'
                          ? 'Transferred'
                          : movement.action_type === 'reversal'
                            ? 'Reversed'
                            : 'Retrieved';
                      return (
                        <article key={`${movement.operation_id}-${movement.timestamp}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">{typeLabel}</p>
                              <p className="mt-1 text-sm text-slate-600">{movement.product_name || 'Product unavailable — historical record'} · {movement.quantity}</p>
                            </div>
                            <p className="text-right text-xs text-slate-500">{new Date(movement.timestamp).toLocaleString()}</p>
                          </div>
                          <p className="mt-3 text-sm text-slate-700">
                            {movement.action_type === 'transfer' ? (
                              movement.source_vendor_id === vendorId ? (
                                <>To {movement.destination_vendor_name ?? 'destination not recorded'}</>
                              ) : movement.destination_vendor_id === vendorId ? (
                                <>From {movement.source_vendor_name ?? 'source not recorded'}</>
                              ) : (
                                'Transfer destination/source not recorded'
                              )
                            ) : movement.action_type === 'reversal' ? (
                              movement.reversal_reason ? `Reversed: ${movement.reversal_reason}` : 'Reversed — original supply undone'
                            ) : (
                              'Retrieved'
                            )}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">Recorded by {movement.admin_name || 'Actor unavailable — historical record'}</p>
                        </article>
                      );
                    })}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Transaction history</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">All visits</h2>
            </div>
          </div>

          <div className="mt-6">
            <TransactionTable
              transactions={transactions ?? []}
              enableAgentReversal={session?.role === 'agent'}
              currentSalesRepId={session?.sales_rep_id}
              canAdministrativeReversal={canEditVendor}
              onReversed={() => { void refetchTransactions(); }}
            />
          </div>
        </section>
      </div>
      <MobileBottomNav />
    </main>
  );
}
