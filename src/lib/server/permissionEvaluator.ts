import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse, type SessionVerificationResult } from '@/lib/session';
import { getPool } from '@/lib/db';
import { isAccessKey, roleAllowsAccess } from '@/lib/authorization';
import { PermissionRepository, type PermissionEffect } from '@/repositories/PermissionRepository';

export interface PermissionDecision {
  allowed: boolean;
  reason: 'unauthenticated' | 'outside_role_ceiling' | 'user_denied' | 'allowed';
}

export function evaluatePermission(role: string | undefined, permissionKey: string, effect: PermissionEffect | null): PermissionDecision {
  if (!role) return { allowed: false, reason: 'unauthenticated' };
  if (!isAccessKey(permissionKey) || !roleAllowsAccess(role, permissionKey)) {
    return { allowed: false, reason: 'outside_role_ceiling' };
  }
  if (effect === 'deny') return { allowed: false, reason: 'user_denied' };
  return { allowed: true, reason: 'allowed' };
}

export async function requirePermission(request: NextRequest, permissionKey: string): Promise<SessionVerificationResult | Response> {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();

  const decisionWithoutOverride = evaluatePermission(session.role, permissionKey, null);
  if (!decisionWithoutOverride.allowed) return forbiddenResponse();

  const override = await new PermissionRepository(getPool()).findOverride(session.userId ?? '', permissionKey);
  const decision = evaluatePermission(session.role, permissionKey, override?.effect ?? null);
  if (!decision.allowed) return forbiddenResponse();
  return session;
}
