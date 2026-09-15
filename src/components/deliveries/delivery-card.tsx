'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { DeliveryRecord } from '@/lib/types';

const statusLabels: Record<DeliveryRecord['status'], string> = {
  pending: 'Pending',
  ongoing: 'Ongoing',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const statusClassNames: Record<DeliveryRecord['status'], string> = {
  pending: 'bg-rose-100 text-rose-700',
  ongoing: 'bg-blue-100 text-blue-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-200 text-slate-700',
};

function formatRequestedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function DeliveryCard({ delivery }: { delivery: DeliveryRecord }) {
  const [showAllProducts, setShowAllProducts] = useState(false);
  const visibleItems = showAllProducts ? delivery.items : delivery.items.slice(0, 3);
  const hasMoreItems = delivery.items.length > visibleItems.length;

  return (
    <article className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-soft transition hover:border-sidrah-200 hover:shadow-md">
      <Link href={`/deliveries/${delivery.delivery_id}`} className="block flex-1 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-sidrah-500 focus-visible:ring-offset-2">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 break-words text-lg font-semibold text-slate-900">{delivery.customer_name}</h2>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClassNames[delivery.status]}`}>
            {statusLabels[delivery.status]}
          </span>
        </div>

        <div className="mt-5 space-y-4 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Location</p>
            <p className="mt-1 break-words text-slate-800">{delivery.delivery_address}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Products</p>
            <div className="mt-2 space-y-2">
              {visibleItems.map((item, index) => (
                <div key={`${item.product_id ?? item.product_name ?? 'item'}-${index}`} className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                  <span className="min-w-0 break-words text-slate-800">{item.product_name || item.description || 'Product unavailable'}</span>
                  <span className="shrink-0 font-semibold text-slate-900">{item.quantity} {item.quantity === 1 ? 'bucket' : 'buckets'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Assigned</p>
              <p className="mt-1 break-words text-slate-800">{delivery.claimed_by ? delivery.claimed_by_name || 'Assigned user unavailable' : 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Requested</p>
              <p className="mt-1 break-words text-slate-800">{formatRequestedAt(delivery.date_created)}</p>
            </div>
          </div>

          {delivery.created_by_name ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Created by</p>
              <p className="mt-1 break-words text-slate-700">{delivery.created_by_name}</p>
            </div>
          ) : null}
        </div>

        <span className="mt-5 inline-flex text-sm font-semibold text-sidrah-700">View request <span aria-hidden="true" className="ml-1">→</span></span>
      </Link>

      {hasMoreItems ? (
        <button type="button" onClick={() => setShowAllProducts(true)} className="mt-3 self-start rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50" aria-expanded={showAllProducts}>
          Show all products ({delivery.items.length})
        </button>
      ) : delivery.items.length > 3 ? (
        <button type="button" onClick={() => setShowAllProducts(false)} className="mt-3 self-start rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50" aria-expanded={showAllProducts}>
          Show fewer products
        </button>
      ) : null}
    </article>
  );
}
