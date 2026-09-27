import { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { assignVendorToAgent, getVendorAssignments, VendorAssignmentHttpError } from '@/services/vendorAccountabilityAssignmentService';

function idFrom(request: NextRequest): string { const parts = new URL(request.url).pathname.split('/').filter(Boolean); return parts[parts.length - 2] || ''; }

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  try { return Response.json({ status: 'success', data: await getVendorAssignments(idFrom(request), session.role as any) }); }
  catch (error) { const status = error instanceof VendorAssignmentHttpError ? error.status : 500; return status === 403 ? forbiddenResponse() : Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status }); }
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session?.userId) return unauthorizedResponse();
  try {
    const body = await request.json();
    const data = await assignVendorToAgent({ vendorId: idFrom(request), agentUserId: body?.agent_user_id, operationId: body?.operation_id, actorUserId: session.userId, role: session.role as any });
    return Response.json({ status: 'success', data }, { status: 201 });
  } catch (error) { const status = error instanceof VendorAssignmentHttpError ? error.status : 500; return status === 403 ? forbiddenResponse() : Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status }); }
}
