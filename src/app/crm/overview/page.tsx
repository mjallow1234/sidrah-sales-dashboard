import { notFound } from 'next/navigation';
import { isAdminOrSupervisorRole } from '@/lib/authorization';
import { getPagePermission } from '@/lib/server/pagePermissionEvaluator';
import { AdminLeadOverview } from '@/components/crm/admin-lead-overview';

export default async function CrmOverviewPage() {
  const session = await getPagePermission('crm.view');
  if (!session || !isAdminOrSupervisorRole(session.role)) notFound();
  return <main className="mx-auto max-w-7xl space-y-6"><div><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">CRM</p><h1 className="mt-2 text-3xl font-semibold">Lead Overview</h1><p className="mt-2 text-slate-600">Management view of the complete CRM lead pipeline.</p></div><AdminLeadOverview /></main>;
}
