import { FactoryContainerSection } from '@/components/factory/factory-container-section';
import { notFound } from 'next/navigation';
import { getPagePermission } from '@/lib/server/pagePermissionEvaluator';

export default async function FactoryContainersPage() {
  if (!(await getPagePermission('factory.view'))) notFound();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Factory operations</p>
        <h1 className="mt-2 text-2xl font-semibold">Containers</h1>
        <p className="mt-1 text-sm text-slate-600">Record received and used empty containers, review current inventory, and trace container history.</p>
      </div>
      <FactoryContainerSection />
    </div>
  );
}
