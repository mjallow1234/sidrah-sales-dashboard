import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAccessKey, isAdminRole, roleAllowsAccess, type AppUserRole } from '@/lib/authorization';
import { listPermissionCatalog } from '@/services/permissionService';

const roles: AppUserRole[] = ['super_admin', 'admin', 'supervisor', 'agent', 'delivery', 'foreman'];

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isAdminRole(session.role)) return forbiddenResponse();
  const requestedRole = request.nextUrl.searchParams.get('role') as AppUserRole | null;
  const role = requestedRole && roles.includes(requestedRole) ? requestedRole : session.role as AppUserRole;
  const catalog = await listPermissionCatalog();
  return Response.json({
    status: 'success',
    data: { role, permissions: catalog.map(item => ({ ...item, available: isAccessKey(item.permission_key) && roleAllowsAccess(role, item.permission_key) })) },
  });
}
