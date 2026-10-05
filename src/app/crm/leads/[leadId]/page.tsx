import { notFound } from 'next/navigation';
import { getPagePermission } from '@/lib/server/pagePermissionEvaluator';
import { CrmLeadDetailClient } from '@/components/crm/lead-detail-client';
export default async function CrmLeadDetailPage() { if (!(await getPagePermission('crm.view'))) notFound(); return <CrmLeadDetailClient />; }
