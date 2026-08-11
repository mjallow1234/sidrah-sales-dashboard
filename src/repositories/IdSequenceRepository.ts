import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';
import { NotFoundError } from './errors';

export interface IdSequenceRecord {
  entity_name: string;
  prefix: string;
  next_value: number;
}

export interface CreateIdSequencePayload {
  entity_name: string;
  prefix: string;
  next_value: number;
}

export interface UpdateIdSequencePayload {
  prefix?: string;
  next_value?: number;
}

export class IdSequenceRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) {
    super(db);
  }

  public async findById(entityName: string): Promise<IdSequenceRecord> {
    const [rows] = await this.execute<any>('SELECT entity_name, prefix, next_value FROM id_sequences WHERE entity_name = ?', [entityName]);
    if (rows.length === 0) {
      throw new NotFoundError('IdSequence', entityName);
    }
    return {
      entity_name: String(rows[0].entity_name),
      prefix: String(rows[0].prefix),
      next_value: Number(rows[0].next_value),
    };
  }

  public async incrementAndGetCurrentValue(entityName: string): Promise<IdSequenceRecord> {
    const [rows] = await this.execute<any>('SELECT entity_name, prefix, next_value FROM id_sequences WHERE entity_name = ? FOR UPDATE', [entityName]);
    if (rows.length === 0) {
      throw new NotFoundError('IdSequence', entityName);
    }

    const current = rows[0];
    await this.db.execute('UPDATE id_sequences SET next_value = next_value + 1 WHERE entity_name = ?', [entityName]);

    return {
      entity_name: String(current.entity_name),
      prefix: String(current.prefix),
      next_value: Number(current.next_value),
    };
  }

  public async findAll(): Promise<IdSequenceRecord[]> {
    const [rows] = await this.execute<any>('SELECT entity_name, prefix, next_value FROM id_sequences ORDER BY entity_name ASC');
    return rows.map((row: any) => ({
      entity_name: String(row.entity_name),
      prefix: String(row.prefix),
      next_value: Number(row.next_value),
    }));
  }

  public async search(criteria: Partial<IdSequenceRecord>): Promise<IdSequenceRecord[]> {
    const filters: string[] = [];
    const params: any[] = [];

    if (criteria.entity_name) {
      filters.push('entity_name = ?');
      params.push(criteria.entity_name);
    }
    if (criteria.prefix) {
      filters.push('prefix = ?');
      params.push(criteria.prefix);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const [rows] = await this.execute<any>(`SELECT entity_name, prefix, next_value FROM id_sequences ${whereClause} ORDER BY entity_name ASC`, params);
    return rows.map((row: any) => ({
      entity_name: String(row.entity_name),
      prefix: String(row.prefix),
      next_value: Number(row.next_value),
    }));
  }

  public async create(payload: CreateIdSequencePayload): Promise<IdSequenceRecord> {
    await this.db.execute(
      `INSERT INTO id_sequences (entity_name, prefix, next_value) VALUES (:entity_name, :prefix, :next_value)`,
      {
        entity_name: payload.entity_name,
        prefix: payload.prefix,
        next_value: payload.next_value,
      }
    );
    return this.findById(payload.entity_name);
  }

  public async update(entityName: string, updates: UpdateIdSequencePayload): Promise<IdSequenceRecord> {
    const fields: string[] = [];
    const params: Record<string, unknown> = { entity_name: entityName };

    if (updates.prefix !== undefined) {
      fields.push('prefix = :prefix');
      params.prefix = updates.prefix;
    }
    if (updates.next_value !== undefined) {
      fields.push('next_value = :next_value');
      params.next_value = updates.next_value;
    }

    if (fields.length === 0) {
      return this.findById(entityName);
    }

    await (this.db.execute as any)(`UPDATE id_sequences SET ${fields.join(', ')} WHERE entity_name = :entity_name`, params);
    return this.findById(entityName);
  }

  public async delete(entityName: string): Promise<void> {
    await this.db.execute('DELETE FROM id_sequences WHERE entity_name = ?', [entityName]);
  }

  public async exists(entityName: string): Promise<boolean> {
    const [rows] = await this.execute<{ exists: number }[]>(
      'SELECT EXISTS(SELECT 1 FROM id_sequences WHERE entity_name = ?) AS exists',
      [entityName]
    );
    return rows.length > 0 && rows[0].exists === 1;
  }
}
