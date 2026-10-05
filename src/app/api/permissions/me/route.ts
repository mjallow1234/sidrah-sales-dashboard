import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAccessKey } from '@/lib/authorization';
import { hasEffectivePermission } from '@/services/permissionService';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session?.userId) return unauthorizedResponse();
  const permissionKey = request.nextUrl.searchParams.get('permissionKey') || '';
  if (!isAccessKey(permissionKey)) return forbiddenResponse();
  const allowed = await hasEffectivePermission(session.userId, session.role, permissionKey);
  return Response.json({ status: 'success', data: { permissionKey, allowed } });
}
