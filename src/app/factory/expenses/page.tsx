import { FactoryExpenses } from '@/components/factory/factory-expenses';

export default function FactoryExpensesPage() {
  return <div className="mx-auto max-w-7xl space-y-6"><div><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Factory</p><h1 className="mt-2 text-3xl font-semibold">Factory expenses</h1><p className="mt-2 text-slate-600">Record and review factory expenditure with an auditable history.</p></div><FactoryExpenses /></div>;
}
