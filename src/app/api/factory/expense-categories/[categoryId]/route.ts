import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminRole } from '@/lib/authorization';
import { editCategory, FactoryExpenseError } from '@/services/factoryExpenseService';
import { requirePermission } from '@/lib/server/permissionEvaluator';

export async function PATCH(request: NextRequest, context: { params: Promise<{ categoryId: string }> }) { const session = await requirePermission(request, 'factory.expenses.manage'); if (session instanceof Response) return session; if (!isAdminRole(session.role)) return forbiddenResponse(); try { const { categoryId } = await context.params; return Response.json({ status: 'success', data: await editCategory(categoryId, await request.json()) }); } catch (error) { const status = error instanceof FactoryExpenseError ? error.status : 500; return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status }); } }
