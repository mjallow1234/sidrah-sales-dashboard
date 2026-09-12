'use client';

import { useFactoryInventoryQuery } from '@/lib/hooks/queries';

export function FactoryInventorySummary() {
  const inventory = useFactoryInventoryQuery();
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
    <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Factory inventory</p>
    <h2 className="mt-2 text-xl font-semibold">Current quantity by product</h2>
    {inventory.isLoading ? <p className="mt-5 text-sm text-slate-600">Loading inventory...</p> : inventory.isError ? <p role="alert" className="mt-5 rounded-2xl bg-rose-50 p-3 text-sm text-rose-900">Unable to load factory inventory. Please try again.</p> : <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{(inventory.data ?? []).map((item) => <div key={item.product_id} className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-semibold leading-snug">{item.product_name ?? item.product_id}</p><p className="mt-2 text-2xl font-semibold text-sidrah-600">{item.current_quantity}</p><p className="text-xs text-slate-500">{item.unit ?? 'units'}</p></div>)}{(inventory.data ?? []).length === 0 ? <p className="col-span-full text-sm text-slate-500">No factory inventory recorded yet.</p> : null}</div>}
  </section>;
}
