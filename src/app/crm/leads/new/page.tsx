import { notFound } from 'next/navigation';
import { getPagePermission } from '@/lib/server/pagePermissionEvaluator';
import { CrmNewLeadClient } from '@/components/crm/new-lead-client';
export default async function NewCrmLeadPage() { if (!(await getPagePermission('crm.create'))) notFound(); return <CrmNewLeadClient />; }
