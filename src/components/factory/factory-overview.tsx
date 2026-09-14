'use client';

import Link from 'next/link';
import { useFactoryContainerInventoryQuery } from '@/lib/hooks/queries';
import { FactoryInventorySummary } from './factory-inventory-summary';

const labels: Record<string, string> = { gallon: 'Gallons', bucket_5l: '5L Buckets', bucket_1kg: '1kg Buckets' };

export function FactoryOverview() {
  const containers = useFactoryContainerInventoryQuery();
  return <div className="space-y-6">
    <FactoryInventorySummary />
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
      <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Empty containers</p>
      <h2 className="mt-2 text-xl font-semibold">Current container inventory</h2>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{(containers.data ?? []).map((item) => <div key={item.container_type} className="rounded-2xl bg-slate-50 p-4"><p className="font-semibold">{labels[item.container_type]}</p><p className="mt-2 text-2xl font-semibold text-sidrah-600">{item.current_quantity}</p><p className="text-xs text-slate-500">empty containers</p></div>)}</div>
      <Link href="/factory/containers" className="mt-4 inline-flex rounded-2xl border px-4 py-2 text-sm font-semibold">Manage container operations</Link>
    </section>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6"><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Quick actions</p><h2 className="mt-2 text-xl font-semibold">Record an operation</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><Link href="/factory/production#production-form" className="rounded-2xl bg-sidrah-500 px-4 py-3 text-center font-semibold text-white">Record Production</Link><Link href="/factory/movements#movement-form" className="rounded-2xl border px-4 py-3 text-center font-semibold">Record Product Movement</Link><Link href="/factory/containers" className="rounded-2xl border px-4 py-3 text-center font-semibold">Record Container Movement</Link></div></section>
    <Link href="/factory/records" className="inline-flex rounded-2xl border px-4 py-3 font-semibold">View all Factory records</Link>
  </div>;
}
