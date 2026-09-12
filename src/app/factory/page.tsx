import { FactoryOverview } from '@/components/factory/factory-overview';
import { FactoryTabs } from '@/components/factory/factory-tabs';

export default function FactoryPage() {
  return <div className="mx-auto max-w-4xl space-y-6"><div><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Factory</p><h1 className="mt-2 text-3xl font-semibold">Factory operations</h1><p className="mt-2 text-slate-600">Record production and simple product movements.</p></div><FactoryTabs active="movements" /><FactoryOverview /></div>;
}
