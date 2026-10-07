import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/server/permissionEvaluator';
import { getPublishedForm } from '@/services/formDefinitionService';

export async function GET(request: NextRequest) {
  const session = await requirePermission(request, 'crm.view');
  if (session instanceof Response) return session;
  try {
    return Response.json({ status: 'success', data: await getPublishedForm('crm-lead') });
  } catch (error) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 503 });
  }
}
