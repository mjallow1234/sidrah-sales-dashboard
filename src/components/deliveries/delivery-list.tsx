'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAuthQuery, useDeliveriesQuery, useDeliveryPreparationSummaryQuery } from '@/lib/hooks/queries';
import type { DeliveryRecord } from '@/lib/types';

const statusOptions = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const statusClassNames: Record<string, string> = {
  pending: 'bg-rose-100 text-rose-700',
  ongoing: 'bg-blue-100 text-blue-700',
  delivered: 'bg-emerald-100 text-emerald-700',
};

export function DeliveryList() {
  const [status, setStatus] = useState('');
  const { data: deliveries = [], isLoading, isError } = useDeliveriesQuery(status ? { status } : undefined);
  const { data: auth, isLoading: authLoading } = useAuthQuery();

  const rows = useMemo(() => deliveries, [deliveries]);
  const canCreateDelivery = !authLoading && auth?.role !== 'delivery';
  const canViewPreparationSummary = auth?.role === 'admin' || auth?.role === 'super_admin' || auth?.role === 'supervisor';
  const preparationSummary = useDeliveryPreparationSummaryQuery(canViewPreparationSummary);
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
          ) : preparationSummary.data && preparationSummary.data.items.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-white p-4 text-sm text-slate-600">No outstanding deliveries. All current delivery requests have been delivered or cancelled.</p>
          ) : preparationSummary.data ? (
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-4"><p className="text-sm text-slate-600">Outstanding quantity</p><p className="mt-1 text-3xl font-semibold text-sidrah-700">{preparationSummary.data.total_quantity}</p></div>
                <div className="rounded-2xl bg-white p-4"><p className="text-sm text-slate-600">Outstanding requests</p><p className="mt-1 text-3xl font-semibold text-sidrah-700">{preparationSummary.data.request_count}</p></div>
              </div>
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

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600">
          <p className="text-lg font-semibold text-slate-900">{emptyStateTitle}</p>
          <p className="mt-2 text-sm text-slate-600">There are no deliveries to display right now.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
          <div className="grid grid-cols-5 gap-4 border-b border-slate-200 px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-500">
            <div>Customer</div>
            <div>Status</div>
            <div>Assigned to</div>
            <div>Created by</div>
            <div>Created</div>
          </div>
          <div className="divide-y divide-slate-200">
            {rows.map((delivery) => (
              <Link
                key={delivery.delivery_id}
                href={`/deliveries/${delivery.delivery_id}`}
                className="grid grid-cols-5 gap-4 px-4 py-4 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <div className="font-medium text-slate-900">{delivery.customer_name}</div>
                <div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold capitalize ${statusClassNames[delivery.status] ?? ''}`}>
                    {delivery.status}
                  </span>
                </div>
                <div>{delivery.claimed_by ? delivery.claimed_by_name || 'Unknown user' : 'Unassigned'}</div>
                <div>{delivery.created_by_name || 'Unknown user'}</div>
                <div>{new Date(delivery.date_created).toLocaleString()}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
