import type { FieldPacket, Pool, PoolConnection } from 'mysql2/promise';
import type { QueryParams } from '@/lib/db';

export type RepositoryDbClient = Pool | PoolConnection;
export type RepositoryQueryParams = QueryParams;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IBaseRepository<T, CreateDto, UpdateDto> {
  findById(id: string): Promise<T>;
  findAll(): Promise<T[]>;
  search(criteria: Record<string, unknown>): Promise<T[]>;
  create(payload: CreateDto): Promise<T>;
  update(id: string, updates: UpdateDto): Promise<T>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}
