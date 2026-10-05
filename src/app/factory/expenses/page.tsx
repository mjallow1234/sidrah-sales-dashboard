import { FactoryExpenses } from '@/components/factory/factory-expenses';
import { notFound } from 'next/navigation';
import { getPagePermission } from '@/lib/server/pagePermissionEvaluator';

export default async function FactoryExpensesPage() {
  if (!(await getPagePermission('factory.expenses.manage'))) notFound();
  return <div className="mx-auto max-w-7xl space-y-6"><div><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Factory</p><h1 className="mt-2 text-3xl font-semibold">Factory expenses</h1><p className="mt-2 text-slate-600">Record and review factory expenditure with an auditable history.</p></div><FactoryExpenses /></div>;
}
