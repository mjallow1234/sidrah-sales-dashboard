import { FactoryMovementForm } from '@/components/factory/factory-movement-form';
import { FactoryHistory } from '@/components/factory/factory-history';
import { FactoryInventorySummary } from '@/components/factory/factory-inventory-summary';
import { FactoryTabs } from '@/components/factory/factory-tabs';
import Link from 'next/link';

export default function FactoryMovementsPage() {
  return <div className="mx-auto max-w-4xl space-y-6"><div><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Factory</p><h1 className="mt-2 text-3xl font-semibold">Movements</h1><p className="mt-2 text-slate-600">Record products leaving or returning to the factory. Comments are free text.</p></div><FactoryTabs active="movements" /><FactoryInventorySummary /><Link href="#movement-form" className="inline-flex rounded-3xl bg-sidrah-500 px-5 py-3 text-sm font-semibold text-white">+ Record Movement</Link><FactoryHistory mode="movements" /><div id="movement-form"><FactoryMovementForm /></div></div>;
}
