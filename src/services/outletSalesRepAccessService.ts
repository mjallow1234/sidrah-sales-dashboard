import { getPool } from '@/lib/db';
import { OutletSalesRepAccessRepository } from '@/repositories/OutletSalesRepAccessRepository';
import { ValidationError } from './errors';
const admin = (role?: string) => role === 'admin' || role === 'super_admin';
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
export async function listOutletSalesRepAccess(outletId: string, session: { role?: string }) { if (!admin(session.role)) throw new Error('Forbidden'); return new OutletSalesRepAccessRepository(getPool()).list(outletId); }
export async function listEligibleSalesReps(session: { role?: string }) { if (!admin(session.role)) throw new Error('Forbidden'); return new OutletSalesRepAccessRepository(getPool()).eligibleUsers(); }
export async function grantOutletSalesRepAccess(outletId: string, userId: string, session: { userId: string; role?: string }) { if (!admin(session.role)) throw new Error('Forbidden'); if (!userId.trim()) throw new ValidationError('user_id is required.'); const repo = new OutletSalesRepAccessRepository(getPool()); const eligible = (await repo.eligibleUsers()).some((u) => u.user_id === userId); if (!eligible) throw new ValidationError('Only active agent users linked to an active Sales Representative may be assigned.'); await repo.grant(outletId, userId, session.userId, now()); return repo.list(outletId); }
export async function revokeOutletSalesRepAccess(outletId: string, userId: string, session: { userId: string; role?: string }) { if (!admin(session.role)) throw new Error('Forbidden'); const repo = new OutletSalesRepAccessRepository(getPool()); await repo.revoke(outletId, userId, session.userId, now()); return repo.list(outletId); }
export async function listAssignedOutlets(session: { userId: string; role?: string }) { if (session.role !== 'agent') throw new Error('Forbidden'); return new OutletSalesRepAccessRepository(getPool()).assignedOutlets(session.userId); }
