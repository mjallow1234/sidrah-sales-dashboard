import { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminRole } from '@/lib/authorization';
import { requirePermission } from '@/lib/server/permissionEvaluator';
import { revokeOutletSalesRepAccess } from '@/services/outletSalesRepAccessService';
function errorResponse(error: unknown) { const message = error instanceof Error ? error.message : String(error); return Response.json({ status: 'error', message }, { status: message === 'Forbidden' ? 403 : 400 }); }
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ outletId: string; userId: string }> }) { const session = await getVerifiedSession(request); if (!session?.userId) return unauthorizedResponse(); const permission = await requirePermission(request, 'outlets.manage'); if (permission instanceof Response || !isAdminRole(session.role)) return forbiddenResponse(); try { const p = await params; return Response.json({ status: 'success', data: await revokeOutletSalesRepAccess(p.outletId, p.userId, { userId: session.userId, role: session.role }) }); } catch (error) { return errorResponse(error); } }
