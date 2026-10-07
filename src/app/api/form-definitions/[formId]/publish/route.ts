import { NextRequest } from 'next/server';
import { getVerifiedSession, unauthorizedResponse, forbiddenResponse } from '@/lib/session';
import { publishForm } from '@/services/formDefinitionService';
import { isAdminRole } from '@/lib/authorization';
export async function POST(request: NextRequest, context: { params: Promise<{ formId: string }> }) { const session = await getVerifiedSession(request); if (!session) return unauthorizedResponse(); if (!isAdminRole(session.role)) return forbiddenResponse(); try { return Response.json({ status: 'success', data: await publishForm((await context.params).formId, session.userId!, session.role) }); } catch (error) { const status = error instanceof Error && error.message === 'Forbidden' ? 403 : 400; return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status }); } }
