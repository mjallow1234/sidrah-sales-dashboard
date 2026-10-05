'use client';

import { useParams } from 'next/navigation';
import { LeadDetail } from '@/components/crm/lead-detail';

export function CrmLeadDetailClient() {
  const params = useParams<{ leadId: string }>();
  return <main className="mx-auto max-w-3xl"><LeadDetail leadId={params.leadId} /></main>;
}
