import type { FieldPacket, PoolConnection } from 'mysql2/promise';
import type { QueryParams } from '@/lib/db';
import type { PaginatedResult, RepositoryDbClient } from './types';
import { NotFoundError, RepositoryError } from './errors';

export abstract class BaseRepository {
  protected readonly db: RepositoryDbClient;

  constructor(db: RepositoryDbClient) {
    this.db = db;
  }

  protected async execute<T = any>(sql: string, params: QueryParams = []): Promise<[T, FieldPacket[]]> {
    return (await this.db.execute(sql, params as any)) as [T, FieldPacket[]];
  }

  protected async executeOne<T = any>(sql: string, params: QueryParams = []): Promise<T> {
    const [rows] = await this.execute<T[]>(sql, params);
    if (rows.length === 0) {
      throw new NotFoundError('Record', 'query');
    }
    return rows[0] as T;
  }

  protected async executeMany<T = any>(sql: string, params: QueryParams = []): Promise<T[]> {
    const [rows] = await this.execute<T[]>(sql, params);
    return rows;
  }

  protected async exists(sql: string, params: QueryParams = []): Promise<boolean> {
    const [rows] = await this.execute<{ exists: number }[]>(sql, params);
    if (rows.length === 0) {
      return false;
    }

    const row = rows[0] as Record<string, unknown>;
    const value = 'exists' in row ? row.exists : Object.values(row)[0];
    return Boolean(typeof value === 'number' ? value > 0 : value);
  }

  protected async paginate<T>(
    itemsSql: string,
    countSql: string,
    params: QueryParams = [],
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResult<T>> {
    const offset = (page - 1) * pageSize;
    const paginatedSql = Array.isArray(params)
      ? `${itemsSql} LIMIT ? OFFSET ?`
      : `${itemsSql} LIMIT :limit OFFSET :offset`;

    const paginatedParams = Array.isArray(params)
      ? [...params, pageSize, offset]
      : { ...params, limit: pageSize, offset };

    const [items] = await this.execute<T[]>(paginatedSql, paginatedParams);
    const [countRows] = await this.execute<{ total: number }[]>(countSql, params);
    const total = countRows.length > 0 ? Number(countRows[0].total) : 0;

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  protected async beginTransaction(): Promise<void> {
    if (!this.isConnection()) {
      throw new RepositoryError('Transactions require a PoolConnection instance');
    }

    await this.db.beginTransaction();
  }

  protected async commit(): Promise<void> {
    if (!this.isConnection()) {
      throw new RepositoryError('Transactions require a PoolConnection instance');
    }

    await this.db.commit();
  }

  protected async rollback(): Promise<void> {
    if (!this.isConnection()) {
      throw new RepositoryError('Transactions require a PoolConnection instance');
    }

    await this.db.rollback();
  }

  private isConnection(): this is { db: PoolConnection } {
    return typeof (this.db as PoolConnection).beginTransaction === 'function';
  }
}
