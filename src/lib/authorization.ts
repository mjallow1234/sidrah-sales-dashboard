import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/session';

export type AppUserRole = 'super_admin' | 'admin' | 'supervisor' | 'agent';
export const adminRoles = ['admin', 'super_admin'] as const;

export function isAdminRole(role?: string): role is AppUserRole {
  return role === 'admin' || role === 'super_admin';
}

export function isSupervisorRole(role?: string): role is AppUserRole {
  return role === 'supervisor';
}

export function isAgentRole(role?: string): role is AppUserRole {
  return role === 'agent';
}

export function canAccessPath(role: string | undefined, pathname: string): boolean {
  if (!role) {
    return false;
  }

  if (pathname === '/dashboard' || pathname.startsWith('/visits')) {
    return true;
  }

  if (pathname === '/vendors/new') {
    return isAdminRole(role) || isSupervisorRole(role);
  }

  if (pathname.startsWith('/vendors')) {
    return true;
  }

  if (pathname.startsWith('/users')) {
    return isAdminRole(role);
  }

  if (pathname === '/salesreps/new') {
    return isAdminRole(role);
  }

  if (pathname.startsWith('/salesreps')) {
    return isAdminRole(role) || isSupervisorRole(role);
  }

  if (pathname.startsWith('/products')) {
    return isAdminRole(role) || isSupervisorRole(role);
  }

  if (pathname.startsWith('/reports')) {
    return isAdminRole(role) || isSupervisorRole(role);
  }

  return true;
}

export function canViewLink(role: string | undefined, href: string): boolean {
  if (!role) {
    return false;
  }

  if (href.startsWith('/users')) {
    return isAdminRole(role);
  }

  if (href === '/vendors/new') {
    return isAdminRole(role) || isSupervisorRole(role);
  }

  if (href === '/salesreps/new') {
    return isAdminRole(role);
  }

  if (href.startsWith('/salesreps')) {
    return isAdminRole(role) || isSupervisorRole(role);
  }

  if (href.startsWith('/products')) {
    return isAdminRole(role) || isSupervisorRole(role);
  }

  if (href.startsWith('/reports')) {
    return isAdminRole(role) || isSupervisorRole(role);
  }

  return true;
}

export async function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get('sidrah_session')?.value;
  return token ? await verifySession(token) : { valid: false };
}
