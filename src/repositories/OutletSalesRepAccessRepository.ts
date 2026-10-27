import { randomUUID } from 'crypto';
import { BaseRepository } from './BaseRepository';
import type { RepositoryDbClient } from './types';

export interface OutletSalesRepAccess { access_id: string; outlet_id: string; user_id: string; user_name: string; sales_rep_id: string; sales_rep_name: string; active: boolean; }
export interface EntryProduct { product_id: string; product_name: string; unit: string; default_unit_price: number; available_stock: number; }

export class OutletSalesRepAccessRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) { super(db); }
  async list(outletId: string): Promise<OutletSalesRepAccess[]> {
    const rows = await this.executeMany<any>(`SELECT a.access_id,a.outlet_id,a.user_id,u.name AS user_name,u.sales_rep_id,sr.name AS sales_rep_name,a.active FROM outlet_sales_rep_access a JOIN app_users u ON u.user_id=a.user_id JOIN sales_reps sr ON sr.sales_rep_id=u.sales_rep_id WHERE a.outlet_id=:outlet_id ORDER BY a.active DESC,u.name ASC`, { outlet_id: outletId });
    return rows.map((r) => ({ access_id: String(r.access_id), outlet_id: String(r.outlet_id), user_id: String(r.user_id), user_name: String(r.user_name), sales_rep_id: String(r.sales_rep_id), sales_rep_name: String(r.sales_rep_name), active: Boolean(r.active === 1 || r.active === true) }));
  }
  async eligibleUsers(): Promise<Array<{ user_id: string; user_name: string; sales_rep_id: string; sales_rep_name: string }>> {
    const rows = await this.executeMany<any>(`SELECT u.user_id,u.name AS user_name,u.sales_rep_id,sr.name AS sales_rep_name FROM app_users u JOIN sales_reps sr ON sr.sales_rep_id=u.sales_rep_id WHERE u.role='agent' AND u.status='active' AND sr.status='active' ORDER BY u.name ASC`);
    return rows.map((r) => ({ user_id: String(r.user_id), user_name: String(r.user_name), sales_rep_id: String(r.sales_rep_id), sales_rep_name: String(r.sales_rep_name) }));
  }
  async grant(outletId: string, userId: string, actorId: string, now: string): Promise<void> {
    await this.execute(`INSERT INTO outlet_sales_rep_access(access_id,outlet_id,user_id,active,granted_by,granted_at) VALUES(:access_id,:outlet_id,:user_id,1,:granted_by,:granted_at) ON DUPLICATE KEY UPDATE active=1,granted_by=:granted_by,granted_at=:granted_at,revoked_by=NULL,revoked_at=NULL`, { access_id: `OSRA_${randomUUID().replace(/-/g,'').slice(0,20)}`, outlet_id: outletId, user_id: userId, granted_by: actorId, granted_at: now });
  }
  async revoke(outletId: string, userId: string, actorId: string, now: string): Promise<void> { await this.execute(`UPDATE outlet_sales_rep_access SET active=0,revoked_by=:revoked_by,revoked_at=:revoked_at WHERE outlet_id=:outlet_id AND user_id=:user_id`, { outlet_id: outletId, user_id: userId, revoked_by: actorId, revoked_at: now }); }
  async hasActive(outletId: string, userId: string): Promise<boolean> { return this.exists(`SELECT 1 AS present FROM outlet_sales_rep_access a JOIN app_users u ON u.user_id=a.user_id JOIN sales_reps sr ON sr.sales_rep_id=u.sales_rep_id WHERE a.outlet_id=:outlet_id AND a.user_id=:user_id AND a.active=1 AND u.role='agent' AND u.status='active' AND sr.status='active' LIMIT 1`, { outlet_id: outletId, user_id: userId }); }
  async assignedOutlets(userId: string): Promise<Array<{ outlet_id: string; name: string; location: string | null }>> { const rows = await this.executeMany<any>(`SELECT o.outlet_id,o.name,o.location FROM outlet_sales_rep_access a JOIN outlets o ON o.outlet_id=a.outlet_id WHERE a.user_id=:user_id AND a.active=1 AND o.active=1 ORDER BY o.name ASC`, { user_id: userId }); return rows.map((r) => ({ outlet_id: String(r.outlet_id), name: String(r.name), location: r.location == null ? null : String(r.location) })); }
}
