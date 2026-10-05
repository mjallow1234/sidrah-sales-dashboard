import { FactoryOverview } from '@/components/factory/factory-overview';
import { notFound } from 'next/navigation';
import { getPagePermission } from '@/lib/server/pagePermissionEvaluator';

export default async function FactoryPage() {
  if (!(await getPagePermission('factory.view'))) notFound();
  return <div className="mx-auto max-w-4xl space-y-6"><div><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Factory</p><h1 className="mt-2 text-3xl font-semibold">Factory overview</h1><p className="mt-1 text-slate-600">See the current Factory situation and record the next operation.</p></div><FactoryOverview /></div>;
}
