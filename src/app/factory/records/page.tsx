import { FactoryRecords } from '@/components/factory/factory-records';
import { notFound } from 'next/navigation';
import { getPagePermission } from '@/lib/server/pagePermissionEvaluator';

export default async function FactoryRecordsPage() {
  if (!(await getPagePermission('factory.view'))) notFound();
  return <div className="mx-auto max-w-5xl space-y-6"><div><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Factory</p><h1 className="mt-2 text-3xl font-semibold">Factory records</h1><p className="mt-2 text-slate-600">Historical production, product movement, and container records.</p></div><FactoryRecords /></div>;
}
