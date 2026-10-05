import { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { createOutlet, listOutlets } from '@/services/outletService';
import { isAdminRole } from '@/lib/authorization';
import { requirePermission } from '@/lib/server/permissionEvaluator';

function errorResponse(error: unknown) { const message = error instanceof Error ? error.message : String(error); return Response.json({ status: 'error', message }, { status: message === 'Forbidden' ? 403 : 400 }); }
export async function GET(request: NextRequest) { const session = await getVerifiedSession(request); if (!session) return unauthorizedResponse(); const permission = await requirePermission(request, 'outlets.view'); if (permission instanceof Response) return permission; if (!isAdminRole(session.role)) return forbiddenResponse(); try { return Response.json({ status: 'success', data: await listOutlets(session.role) }); } catch (error) { return errorResponse(error); } }
export async function POST(request: NextRequest) { const session = await getVerifiedSession(request); if (!session) return unauthorizedResponse(); const permission = await requirePermission(request, 'outlets.manage'); if (permission instanceof Response) return permission; if (!isAdminRole(session.role) || !session.userId) return forbiddenResponse(); try { return Response.json({ status: 'success', data: await createOutlet(await request.json(), { userId: session.userId, role: session.role }) }, { status: 201 }); } catch (error) { return errorResponse(error); } }
