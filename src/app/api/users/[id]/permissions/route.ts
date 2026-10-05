import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminRole } from '@/lib/authorization';
import { getUserPermissionView, PermissionServiceError, replacePermissionOverrides } from '@/services/permissionService';

function getTargetUserId(request: Request): string {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  return parts[parts.length - 2] || '';
}

function errorResponse(error: unknown) {
  const status = error instanceof PermissionServiceError ? error.statusCode : 500;
  return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status });
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isAdminRole(session.role)) return forbiddenResponse();
  try {
    const targetUserId = getTargetUserId(request);
    const data = await getUserPermissionView(session.userId ?? '', session.role, targetUserId);
    return Response.json({ status: 'success', data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isAdminRole(session.role)) return forbiddenResponse();
  try {
    const body = await request.json() as { overrides?: unknown };
    if (!Array.isArray(body.overrides)) return Response.json({ status: 'error', message: 'overrides must be an array.' }, { status: 400 });
    const targetUserId = getTargetUserId(request);
    const overrides = body.overrides.map((item) => {
      if (!item || typeof item !== 'object') throw new PermissionServiceError('Invalid permission override.', 400);
      const value = item as Record<string, unknown>;
      return { permission_key: String(value.permission_key ?? ''), effect: String(value.effect ?? '') as 'allow' | 'deny', reason: value.reason == null ? null : String(value.reason) };
    });
    const saved = await replacePermissionOverrides({ actorUserId: session.userId ?? '', actorRole: session.role, targetUserId, overrides });
    return Response.json({ status: 'success', data: saved });
  } catch (error) {
    return errorResponse(error);
  }
}
