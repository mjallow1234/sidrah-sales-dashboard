import { NextRequest } from 'next/server';
import { getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { listAssignedOutlets } from '@/services/outletSalesRepAccessService';
function errorResponse(error: unknown) { const message = error instanceof Error ? error.message : String(error); return Response.json({ status: 'error', message }, { status: message === 'Forbidden' ? 403 : 400 }); }
export async function GET(request: NextRequest) { const session = await getVerifiedSession(request); if (!session?.userId) return unauthorizedResponse(); try { return Response.json({ status: 'success', data: await listAssignedOutlets({ userId: session.userId, role: session.role }) }); } catch (error) { return errorResponse(error); } }
