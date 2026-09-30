import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAgentRole, isAdminOrSupervisorRole } from '@/lib/authorization';
import { addActivity, getActivities } from '@/services/crmLeadService';

function allowed(role?: string) { return isAgentRole(role) || isAdminOrSupervisorRole(role); }
function errorResponse(error: unknown) { const status = error instanceof Error && /not found/i.test(error.message) ? 404 : error instanceof Error && /permissions/i.test(error.message) ? 403 : 400; return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status }); }

export async function GET(request: NextRequest, { params }: { params: Promise<{ leadId: string }> }) { const session = await getVerifiedSession(request); if (!session) return unauthorizedResponse(); if (!allowed(session.role) || !session.userId) return forbiddenResponse(); try { return Response.json({ status: 'success', data: await getActivities((await params).leadId, { userId: session.userId, role: session.role }) }); } catch (error) { return errorResponse(error); } }
export async function POST(request: NextRequest, { params }: { params: Promise<{ leadId: string }> }) { const session = await getVerifiedSession(request); if (!session) return unauthorizedResponse(); if (!allowed(session.role) || !session.userId) return forbiddenResponse(); try { return Response.json({ status: 'success', data: await addActivity((await params).leadId, await request.json(), { userId: session.userId, role: session.role }) }); } catch (error) { return errorResponse(error); } }
