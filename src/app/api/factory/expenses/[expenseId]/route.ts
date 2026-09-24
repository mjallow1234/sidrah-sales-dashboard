import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminRole } from '@/lib/authorization';
import { FactoryExpenseError, voidExpense } from '@/services/factoryExpenseService';

export async function PATCH(request: NextRequest, context: { params: Promise<{ expenseId: string }> }) { const session = await getVerifiedSession(request); if (!session) return unauthorizedResponse(); if (!isAdminRole(session.role) || !session.userId) return forbiddenResponse(); try { const body = await request.json(); const { expenseId } = await context.params; return Response.json({ status: 'success', data: await voidExpense(expenseId, body?.reason, session.userId) }); } catch (error) { const status = error instanceof FactoryExpenseError ? error.status : 500; return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status }); } }
