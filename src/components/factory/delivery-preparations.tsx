'use client';

import { useAuthQuery, useForemanDeliveryPreparationSummaryQuery } from '@/lib/hooks/queries';

export function DeliveryPreparations() {
  const auth = useAuthQuery();
  const enabled = auth.data?.role === 'foreman';
  const summary = useForemanDeliveryPreparationSummaryQuery(enabled);

  if (!enabled && !auth.isLoading) return null;

  return (
    <section className="rounded-3xl border border-sidrah-100 bg-sidrah-50/60 p-5 shadow-soft sm:p-6" aria-labelledby="delivery-preparations-heading">
      <p className="text-sm uppercase tracking-[0.22em] text-sidrah-600">Delivery preparations</p>
      <h2 id="delivery-preparations-heading" className="mt-2 text-xl font-semibold text-slate-900">Products needed for outgoing deliveries</h2>
      {summary.isLoading ? <p className="mt-5 text-sm text-slate-600">Loading delivery preparations...</p> : null}
      {summary.isError ? <p role="alert" className="mt-5 rounded-2xl bg-rose-50 p-3 text-sm text-rose-900">Unable to load delivery preparations.</p> : null}
      {!summary.isLoading && !summary.isError && summary.data ? (
        summary.data.items.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {summary.data.items.map((item) => (
              <div key={item.product_id} className="rounded-2xl bg-white p-4">
                <p className="font-semibold leading-snug text-slate-900">{item.product_name}</p>
                <p className="mt-2 text-2xl font-semibold text-sidrah-700">
                  {item.quantity} <span className="text-base font-medium text-slate-600">{item.unit}</span>
                </p>
                <p className="mt-1 text-sm text-slate-600">{item.request_count} {item.request_count === 1 ? 'request' : 'requests'}</p>
              </div>
            ))}
          </div>
        ) : <p className="mt-5 rounded-2xl bg-white p-4 text-sm text-slate-600">No pending delivery preparations.</p>
      ) : null}
    </section>
  );
}
