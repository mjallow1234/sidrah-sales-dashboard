import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { isAdminRole } from '@/lib/authorization';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';

export async function DELETE(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isAdminRole(session.role)) return forbiddenResponse();
  const acquiredById = new URL(request.url).pathname.split('/').filter(Boolean).pop() || '';
  const [result] = await query<any>('UPDATE acquired_by_names SET is_active = 0 WHERE acquired_by_id = ? AND is_active = 1', [acquiredById]);
  if (!result.affectedRows) return Response.json({ status: 'error', message: 'Acquired By name not found.' }, { status: 404 });
  return Response.json({ status: 'success', data: null });
}
