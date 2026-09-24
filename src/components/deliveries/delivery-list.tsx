'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAuthQuery, useDeliveriesQuery, useDeliveryPreparationSummaryQuery } from '@/lib/hooks/queries';
import { useDeliveryPaymentSummaryQuery } from '@/lib/hooks/deliveryPaymentQueries';
import { useDeliveryTrackingQuery } from '@/lib/hooks/deliveryTrackingQueries';
import type { DeliveryRecord } from '@/lib/types';
import { DeliveryCard } from './delivery-card';
import { DeliveryTrackingMap } from './delivery-tracking-map';

const statusOptions = [
  { value: '', label: 'All' },
  { value: 'pending,ongoing', label: 'Pending & Ongoing' },
  { value: 'pending', label: 'Pending' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

function businessToday() {
  return new Date().toISOString().slice(0, 10);
}

export function DeliveryList() {
  const [status, setStatus] = useState('pending,ongoing');
  const [showPaymentBreakdown, setShowPaymentBreakdown] = useState(false);
  const [selectedPaymentDate, setSelectedPaymentDate] = useState(businessToday);
  const [paymentLocation, setPaymentLocation] = useState('');
  const [paymentVendorSearch, setPaymentVendorSearch] = useState('');
  const { data: deliveries = [], isLoading, isError } = useDeliveriesQuery(status ? { status } : undefined);
  const { data: auth, isLoading: authLoading } = useAuthQuery();

  const rows = useMemo(() => deliveries, [deliveries]);
  const canCreateDelivery = !authLoading && auth?.role !== 'delivery';
  const canViewPreparationSummary = auth?.role === 'admin' || auth?.role === 'super_admin' || auth?.role === 'supervisor';
  const trackingQuery = useDeliveryTrackingQuery(canViewPreparationSummary);
  const preparationSummary = useDeliveryPreparationSummaryQuery(canViewPreparationSummary);
  const paymentSummary = useDeliveryPaymentSummaryQuery({ date: selectedPaymentDate, location: paymentLocation || undefined, vendor: paymentVendorSearch || undefined }, canViewPreparationSummary);
  const emptyStateTitle = auth?.role === 'delivery' ? 'Currently no delivery requests available.' : 'No deliveries yet.';

  if (isLoading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600">Loading deliveries…</div>;
  }

  if (isError) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">Unable to load deliveries.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Deliveries</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Delivery queue</h1>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="text-sm text-slate-700">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-2 block rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {canCreateDelivery && (
            <Link href="/deliveries/new" className="inline-flex items-center justify-center rounded-3xl bg-sidrah-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sidrah-600">
              New delivery request
            </Link>
          )}
        </div>
      </div>

      {canViewPreparationSummary ? (
        <DeliveryTrackingMap locations={trackingQuery.data ?? []} isLoading={trackingQuery.isLoading} isError={trackingQuery.isError} />
      ) : null}

      {canViewPreparationSummary ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Payment reconciliation</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Filter received payments</h2>
            </div>
            <div className="grid w-full gap-3 sm:max-w-3xl sm:grid-cols-3">
              <label className="text-sm font-semibold text-slate-700">Date<input type="date" value={selectedPaymentDate} onChange={(event) => { setSelectedPaymentDate(event.target.value); setPaymentLocation(''); }} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 font-normal" /></label>
              <label className="text-sm font-semibold text-slate-700">Location<select value={paymentLocation} onChange={(event) => setPaymentLocation(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 font-normal"><option value="">All Locations</option>{(paymentSummary.data?.locations ?? []).map((location) => <option key={location} value={location}>{location}</option>)}</select></label>
              <label className="text-sm font-semibold text-slate-700">Search Vendor<input type="search" value={paymentVendorSearch} onChange={(event) => setPaymentVendorSearch(event.target.value)} placeholder="Vendor name" className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 font-normal" /></label>
            </div>
          </div>
        </div>
      ) : null}

      {canViewPreparationSummary ? (
        <section className="rounded-3xl border border-sidrah-100 bg-sidrah-50/60 p-5 shadow-soft sm:p-6" aria-labelledby="delivery-preparation-heading">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-sidrah-600">Delivery Preparation</p>
              <h2 id="delivery-preparation-heading" className="mt-2 text-xl font-semibold text-slate-900">Outstanding quantities</h2>
              <p className="mt-1 text-sm text-slate-600">Pending and ongoing requests still requiring delivery preparation.</p>
            </div>
            {preparationSummary.isLoading ? <p className="text-sm text-slate-500">Loading summary…</p> : null}
          </div>
          {preparationSummary.isError ? (
            <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Unable to load the preparation summary. Delivery requests are still available below.</p>
          ) : preparationSummary.data ? (
            <div className="mt-5 space-y-4">
              {preparationSummary.data.items.length === 0 ? <p className="rounded-2xl bg-white p-4 text-sm text-slate-600">No outstanding deliveries. All current delivery requests have been delivered or cancelled.</p> : null}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl bg-white p-4"><p className="text-sm text-slate-600">Outstanding quantity</p><p className="mt-1 text-3xl font-semibold text-sidrah-700">{preparationSummary.data.total_quantity}</p></div>
                <div className="rounded-2xl bg-white p-4"><p className="text-sm text-slate-600">Outstanding requests</p><p className="mt-1 text-3xl font-semibold text-sidrah-700">{preparationSummary.data.request_count}</p></div>
                <button type="button" className="rounded-2xl bg-white p-4 text-left transition hover:border-sidrah-200 hover:shadow-sm" onClick={() => setShowPaymentBreakdown((value) => !value)} aria-expanded={showPaymentBreakdown}>
                  <p className="text-sm text-slate-600">Total Amount Received</p>
                  <p className="mt-1 text-3xl font-semibold text-sidrah-700">{paymentSummary.isError ? 'Unavailable' : paymentSummary.isLoading ? '…' : `D${Number(paymentSummary.data?.total_amount ?? 0).toLocaleString()}`}</p>
                  <p className="mt-1 text-xs text-slate-500">Click to view payment breakdown</p>
                </button>
              </div>
              {paymentSummary.isError ? <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Unable to load received payment totals.</p> : null}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {preparationSummary.data.items.map((item) => (
                  <div key={item.product_id} className="rounded-2xl border border-sidrah-100 bg-white p-4">
                    <p className="font-semibold text-slate-900">{item.product_name}</p>
                    <p className="mt-2 text-2xl font-semibold text-sidrah-700">{item.quantity} <span className="text-base font-medium text-slate-600">{item.unit}</span></p>
                    <p className="mt-1 text-sm text-slate-600">{item.request_count} {item.request_count === 1 ? 'request' : 'requests'}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {showPaymentBreakdown && canViewPreparationSummary ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="delivery-payment-breakdown-heading" onClick={() => setShowPaymentBreakdown(false)}>
          <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-5 shadow-xl sm:p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-sidrah-500">Delivery payments</p>
                <h2 id="delivery-payment-breakdown-heading" className="mt-1 text-xl font-semibold text-slate-900">Payment breakdown</h2>
              </div>
              <button type="button" onClick={() => setShowPaymentBreakdown(false)} className="rounded-full px-3 py-1 text-2xl leading-none text-slate-500 hover:bg-slate-100" aria-label="Close payment breakdown">×</button>
            </div>
            <div className="mt-5 rounded-2xl bg-sidrah-50 p-4">
              <p className="text-sm text-slate-600">Total Amount Received</p>
              <p className="mt-1 text-2xl font-semibold text-sidrah-700">{paymentSummary.isLoading ? '…' : paymentSummary.isError ? 'Unavailable' : `D${Number(paymentSummary.data?.total_amount ?? 0).toLocaleString()}`}</p>
            </div>
            <div className="mt-5 space-y-3">
              {paymentSummary.isLoading ? <p className="text-sm text-slate-600">Loading payment breakdown…</p> : null}
              {paymentSummary.isError ? <p className="text-sm text-rose-600">Unable to load payment breakdown.</p> : null}
              {!paymentSummary.isLoading && !paymentSummary.isError && (paymentSummary.data?.payments.length ?? 0) === 0 ? <p className="text-sm text-slate-600">No payments recorded for this date and filter combination.</p> : null}
              {!paymentSummary.isLoading && !paymentSummary.isError ? (paymentSummary.data?.payments ?? []).map((payment) => (
                <div key={payment.payment_id} className="grid gap-1 border-b border-slate-100 pb-3 text-sm last:border-0 last:pb-0 sm:grid-cols-[1.2fr_1.2fr_1fr_1fr_auto] sm:items-center">
                  <Link href={`/deliveries/${payment.delivery_id}`} className="font-semibold text-sidrah-700 hover:underline"><span className="text-xs font-normal text-slate-500">Vendor:</span> {payment.customer_name}</Link>
                  <span className="text-slate-600"><span className="text-xs text-slate-500">Location:</span> {payment.delivery_address}</span>
                  <span className="text-slate-600"><span className="text-xs text-slate-500">Delivery guy:</span> {payment.claimed_by_name || 'Unassigned'}</span>
                  <span className="text-slate-600"><span className="text-xs text-slate-500">Method:</span> {payment.payment_method}</span>
                  <span className="font-semibold text-slate-900">D{payment.amount.toLocaleString()} · {new Date(payment.recorded_at).toLocaleString()}</span>
                </div>
              )) : null}
            </div>
          </div>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600">
          <p className="text-lg font-semibold text-slate-900">{emptyStateTitle}</p>
          <p className="mt-2 text-sm text-slate-600">There are no deliveries to display right now.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((delivery) => <DeliveryCard key={delivery.delivery_id} delivery={delivery} showNavigation={auth?.role === 'delivery'} />)}
        </div>
      )}
    </div>
  );
}
