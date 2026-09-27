import { randomUUID } from 'crypto';
import { getPool, transaction } from '@/lib/db';
import { VendorAccountabilityAssignmentRepository } from '@/repositories/VendorAccountabilityAssignmentRepository';
import type { AppUserRole } from '@/lib/authorization';

export class VendorAssignmentHttpError extends Error { public readonly status: number; constructor(status: number, message: string) { super(message); this.status = status; } }

function authorized(role?: AppUserRole): boolean { return role === 'admin' || role === 'super_admin' || role === 'supervisor'; }

export async function assignVendorToAgent(input: { vendorId: string; agentUserId: unknown; operationId?: unknown; actorUserId: string; role?: AppUserRole }) {
  if (!authorized(input.role)) throw new VendorAssignmentHttpError(403, 'Only management users can assign vendor accountability.');
  const agentUserId = typeof input.agentUserId === 'string' ? input.agentUserId.trim() : '';
  if (!agentUserId) throw new VendorAssignmentHttpError(400, 'Agent is required.');
  const operationId = typeof input.operationId === 'string' && input.operationId.trim() ? input.operationId.trim() : `AVA_${randomUUID().replace(/-/g, '')}`;
  const assignedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  try {
    return await transaction(async (connection) => new VendorAccountabilityAssignmentRepository(connection).assign({ vendorId: input.vendorId, agentUserId, assignedBy: input.actorUserId, operationId, assignedAt }));
  } catch (error) {
    if (error instanceof VendorAssignmentHttpError) throw error;
    throw new VendorAssignmentHttpError(400, error instanceof Error ? error.message : String(error));
  }
}

export async function getVendorAssignments(vendorId: string, role?: AppUserRole) {
  if (!authorized(role)) throw new VendorAssignmentHttpError(403, 'Only management users can view vendor accountability assignments.');
  return new VendorAccountabilityAssignmentRepository(getPool()).listForVendor(vendorId);
}
