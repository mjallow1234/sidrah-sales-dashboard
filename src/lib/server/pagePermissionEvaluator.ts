import 'server-only';
import { cookies } from 'next/headers';
import { getPool } from '@/lib/db';
import { verifySession, type SessionVerificationResult } from '@/lib/session';
import { PermissionRepository } from '@/repositories/PermissionRepository';
import { evaluatePermission } from '@/lib/server/permissionEvaluator';

export async function getPagePermission(permissionKey: string): Promise<SessionVerificationResult | null> {
  const token = (await cookies()).get('sidrah_session')?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session.valid || !session.userId) return null;
  if (!evaluatePermission(session.role, permissionKey, null).allowed) return null;
  const override = await new PermissionRepository(getPool()).findOverride(session.userId, permissionKey);
  return evaluatePermission(session.role, permissionKey, override?.effect ?? null).allowed ? session : null;
}
