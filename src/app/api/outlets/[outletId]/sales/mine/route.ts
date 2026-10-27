import { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { requirePermission } from '@/lib/server/permissionEvaluator';
import { listMySales } from '@/services/outletService';
function errorResponse(error: unknown) { const message = error instanceof Error ? error.message : String(error); return Response.json({ status: 'error', message }, { status: message === 'Forbidden' ? 403 : 400 }); }
export async function GET(request: NextRequest, { params }: { params: Promise<{ outletId: string }> }) { const session = await getVerifiedSession(request); if (!session?.userId) return unauthorizedResponse(); const permission = await requirePermission(request, 'outlets.sales.record'); if (permission instanceof Response) return permission; if (session.role !== 'agent') return forbiddenResponse(); try { const q = request.nextUrl.searchParams; return Response.json({ status: 'success', data: await listMySales((await params).outletId, { from: q.get('from') || undefined, to: q.get('to') || undefined }, { userId: session.userId, role: session.role }) }); } catch (error) { return errorResponse(error); } }
