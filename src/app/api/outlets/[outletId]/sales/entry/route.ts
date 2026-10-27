import { NextRequest } from 'next/server';
import { getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { getSalesEntryContext } from '@/services/outletService';
function errorResponse(error: unknown) { const message = error instanceof Error ? error.message : String(error); return Response.json({ status: 'error', message }, { status: message === 'Forbidden' ? 403 : 400 }); }
export async function GET(request: NextRequest, { params }: { params: Promise<{ outletId: string }> }) { const session = await getVerifiedSession(request); if (!session?.userId) return unauthorizedResponse(); try { return Response.json({ status: 'success', data: await getSalesEntryContext((await params).outletId, { userId: session.userId, role: session.role }) }); } catch (error) { return errorResponse(error); } }
