import { FactoryProductionForm } from '@/components/factory/factory-production-form';
import { FactoryHistory } from '@/components/factory/factory-history';
import { FactoryInventorySummary } from '@/components/factory/factory-inventory-summary';
import { FactoryTabs } from '@/components/factory/factory-tabs';
import Link from 'next/link';

export default function FactoryProductionPage() {
  return <div className="mx-auto max-w-4xl space-y-6"><div><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Factory</p><h1 className="mt-2 text-3xl font-semibold">Production</h1><p className="mt-2 text-slate-600">Record one finished product output per submission.</p></div><FactoryTabs active="production" /><FactoryInventorySummary /><Link href="#production-form" className="inline-flex rounded-3xl bg-sidrah-500 px-5 py-3 text-sm font-semibold text-white">+ Record Production</Link><FactoryHistory mode="production" /><div id="production-form"><FactoryProductionForm /></div></div>;
}
