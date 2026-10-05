import { LeadList } from '@/components/crm/lead-list';
import { notFound } from 'next/navigation';
import { getPagePermission } from '@/lib/server/pagePermissionEvaluator';
export default async function CrmLeadsPage() { if (!(await getPagePermission('crm.view'))) notFound(); return <main className="mx-auto max-w-5xl space-y-6"><div><p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">CRM</p><h1 className="mt-2 text-3xl font-semibold">Leads</h1><p className="mt-2 text-slate-600">Capture and manage field leads manually.</p></div><LeadList /></main>; }
