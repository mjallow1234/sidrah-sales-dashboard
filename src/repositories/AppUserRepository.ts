import type { AppUser } from '@/lib/types';
import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';
import { NotFoundError } from './errors';

export interface CreateAppUserPayload {
  user_id: string;
  username: string;
  email: string;
  phone: string;
  name: string;
  role: AppUser['role'];
  status: AppUser['status'];
  sales_rep_id?: string | null;
  password_hash: string;
  password_reset_required?: boolean;
  is_system_user?: boolean;
  failed_login_count?: number;
  last_login?: string | null;
  last_failed_login?: string | null;
  lockout_until?: string | null;
  password_changed_at?: string | null;
  version?: number;
  created_by?: string | null;
  updated_by?: string | null;
  date_created: string;
  last_updated: string;
}

export interface UpdateAppUserPayload {
  username?: string;
  email?: string;
  phone?: string;
  name?: string;
  role?: AppUser['role'];
  status?: AppUser['status'];
  sales_rep_id?: string | null;
  password_hash?: string;
  password_reset_required?: boolean;
  is_system_user?: boolean;
  failed_login_count?: number;
  last_login?: string | null;
  last_failed_login?: string | null;
  lockout_until?: string | null;
  password_changed_at?: string | null;
  version?: number;
  updated_by?: string | null;
  last_updated?: string;
}

export interface AppUserSearchCriteria {
  user_id?: string;
  username?: string;
  email?: string;
  phone?: string;
  role?: AppUser['role'];
  status?: AppUser['status'];
}

export class AppUserRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) {
    super(db);
  }

  private formatDateValue(value: unknown): string {
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        return '';
      }
      return value.toISOString().split('T')[0];
    }
    return value === null || value === undefined ? '' : String(value);
  }

  private formatDateTimeValue(value: unknown): string {
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        return '';
      }
      return value.toISOString();
    }
    return value === null || value === undefined ? '' : String(value);
  }

  private mapRow(row: any): AppUser {
    return {
      user_id: String(row.user_id),
      username: String(row.username),
      email: String(row.email),
      phone: String(row.phone),
      name: String(row.name),
      role: String(row.role) as AppUser['role'],
      status: String(row.status) as AppUser['status'],
      sales_rep_id: row.sales_rep_id === null ? undefined : String(row.sales_rep_id),
      password_hash: String(row.password_hash ?? ''),
      password_reset_required: String(row.password_reset_required ?? ''),
      last_login: row.last_login === null ? '' : this.formatDateTimeValue(row.last_login),
      is_system_user: String(row.is_system_user ?? ''),
      failed_login_count: Number(row.failed_login_count) || 0,
      last_failed_login: row.last_failed_login === null ? '' : this.formatDateTimeValue(row.last_failed_login),
      lockout_until: row.lockout_until === null ? '' : this.formatDateTimeValue(row.lockout_until),
      created_by: row.created_by === null ? '' : String(row.created_by),
      updated_by: row.updated_by === null ? '' : String(row.updated_by),
      password_changed_at: row.password_changed_at === null ? '' : this.formatDateTimeValue(row.password_changed_at),
      date_created: this.formatDateValue(row.date_created),
      last_updated: this.formatDateTimeValue(row.last_updated),
    } as unknown as AppUser;
  }

  public async findById(userId: string): Promise<AppUser> {
    const [rows] = await this.execute<any[]>('SELECT * FROM app_users WHERE user_id = ? LIMIT 1', [userId]);
    if (rows.length === 0) {
      throw new NotFoundError('AppUser', userId);
    }
    return this.mapRow(rows[0]);
  }

  public async findByPhone(phone: string): Promise<AppUser | null> {
    const [rows] = await this.execute<any[]>('SELECT * FROM app_users WHERE phone = ? LIMIT 1', [phone]);
    return rows.length === 0 ? null : this.mapRow(rows[0]);
  }

  public async findAll(): Promise<AppUser[]> {
    const [rows] = await this.execute<any[]>('SELECT * FROM app_users ORDER BY username ASC');
    return rows.map((row) => this.mapRow(row));
  }

  public async search(criteria: AppUserSearchCriteria): Promise<AppUser[]> {
    const filters: string[] = [];
    const params: Record<string, unknown> = {};

    if (criteria.user_id) {
      filters.push('user_id = :user_id');
      params.user_id = criteria.user_id;
    }
    if (criteria.username) {
      filters.push('username LIKE :username');
      params.username = `%${criteria.username}%`;
    }
    if (criteria.email) {
      filters.push('email = :email');
      params.email = criteria.email;
    }
    if (criteria.phone) {
      filters.push('phone = :phone');
      params.phone = criteria.phone;
    }
    if (criteria.role) {
      filters.push('role = :role');
      params.role = criteria.role;
    }
    if (criteria.status) {
      filters.push('status = :status');
      params.status = criteria.status;
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const [rows] = await this.execute<any[]>(`SELECT * FROM app_users ${whereClause} ORDER BY username ASC`, params);
    return rows.map((row) => this.mapRow(row));
  }

  public async create(payload: CreateAppUserPayload): Promise<AppUser> {
    await (this.db.execute as any)(
      `INSERT INTO app_users (
        user_id,
        username,
        email,
        phone,
        name,
        role,
        status,
        sales_rep_id,
        password_hash,
        password_reset_required,
        last_login,
        is_system_user,
        failed_login_count,
        last_failed_login,
        lockout_until,
        version,
        created_by,
        updated_by,
        date_created,
        last_updated
      ) VALUES (
        :user_id,
        :username,
        :email,
        :phone,
        :name,
        :role,
        :status,
        :sales_rep_id,
        :password_hash,
        :password_reset_required,
        :last_login,
        :is_system_user,
        :failed_login_count,
        :last_failed_login,
        :lockout_until,
        :version,
        :created_by,
        :updated_by,
        :date_created,
        :last_updated
      )`,

      {
        user_id: payload.user_id,
        username: payload.username,
        email: payload.email,
        phone: payload.phone,
        name: payload.name,
        role: payload.role,
        status: payload.status,
        sales_rep_id: payload.sales_rep_id ?? null,
        password_hash: payload.password_hash,
        password_reset_required: payload.password_reset_required ? 1 : 0,
        last_login: payload.last_login ?? null,
        is_system_user: payload.is_system_user ? 1 : 0,
        failed_login_count: payload.failed_login_count ?? 0,
        last_failed_login: payload.last_failed_login ?? null,
        lockout_until: payload.lockout_until ?? null,
        version: payload.version ?? 1,
        created_by: payload.created_by ?? null,
        updated_by: payload.updated_by ?? null,
        date_created: payload.date_created,
        last_updated: payload.last_updated,
      }
    );

    return this.findById(payload.user_id);
  }

  public async update(userId: string, updates: UpdateAppUserPayload): Promise<AppUser> {
    const fields: string[] = [];
    const params: Record<string, unknown> = { user_id: userId };

    if (updates.username !== undefined) {
      fields.push('username = :username');
      params.username = updates.username;
    }
    if (updates.email !== undefined) {
      fields.push('email = :email');
      params.email = updates.email;
    }
    if (updates.phone !== undefined) {
      fields.push('phone = :phone');
      params.phone = updates.phone;
    }
    if (updates.name !== undefined) {
      fields.push('name = :name');
      params.name = updates.name;
    }
    if (updates.role !== undefined) {
      fields.push('role = :role');
      params.role = updates.role;
    }
    if (updates.status !== undefined) {
      fields.push('status = :status');
      params.status = updates.status;
    }
    if (updates.sales_rep_id !== undefined) {
      fields.push('sales_rep_id = :sales_rep_id');
      params.sales_rep_id = updates.sales_rep_id;
    }
    if (updates.password_hash !== undefined) {
      fields.push('password_hash = :password_hash');
      params.password_hash = updates.password_hash;
    }
    if (updates.password_reset_required !== undefined) {
      fields.push('password_reset_required = :password_reset_required');
      params.password_reset_required = updates.password_reset_required ? 1 : 0;
    }
    if (updates.last_login !== undefined) {
      fields.push('last_login = :last_login');
      params.last_login = updates.last_login;
    }
    if (updates.is_system_user !== undefined) {
      fields.push('is_system_user = :is_system_user');
      params.is_system_user = updates.is_system_user ? 1 : 0;
    }
    if (updates.failed_login_count !== undefined) {
      fields.push('failed_login_count = :failed_login_count');
      params.failed_login_count = updates.failed_login_count;
    }
    if (updates.last_failed_login !== undefined) {
      fields.push('last_failed_login = :last_failed_login');
      params.last_failed_login = updates.last_failed_login;
    }
    if (updates.lockout_until !== undefined) {
      fields.push('lockout_until = :lockout_until');
      params.lockout_until = updates.lockout_until;
    }
    if (updates.version !== undefined) {
      fields.push('version = :version');
      params.version = updates.version;
    }
    if (updates.updated_by !== undefined) {
      fields.push('updated_by = :updated_by');
      params.updated_by = updates.updated_by;
    }
    if (updates.last_updated !== undefined) {
      fields.push('last_updated = :last_updated');
      params.last_updated = updates.last_updated;
    }

    if (fields.length === 0) {
      throw new Error('No AppUser update fields were provided.');
    }

    const sql = `UPDATE app_users SET ${fields.join(', ')} WHERE user_id = :user_id`;
    const [result] = await (this.db.execute as any)(sql, params);
    if ((result as import('mysql2/promise').OkPacket).affectedRows === 0) {
      throw new NotFoundError('AppUser', userId);
    }

    return this.findById(userId);
  }

  public async delete(userId: string): Promise<void> {
    await this.db.execute('DELETE FROM app_users WHERE user_id = ?', [userId]);
  }

  public async exists(userId: string): Promise<boolean> {
    const [rows] = await this.execute<{ record_exists: number }[]>(
      'SELECT EXISTS(SELECT 1 FROM app_users WHERE user_id = ?) AS record_exists',
      [userId]
    );
    return rows.length > 0 && rows[0].record_exists === 1;
  }
}
