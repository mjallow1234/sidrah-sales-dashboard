import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';
import { NotFoundError } from './errors';

export interface TransactionJournalRecord {
  transaction_journal_id: number;
  transaction_id: string;
  timestamp: string;
  endpoint: string;
  stage: string;
  status: 'pending' | 'success' | 'failure';
  payload?: Record<string, unknown>;
  completed: boolean;
  actor?: string | null;
  error_message?: string | null;
  duration_ms: number;
  created_at: string;
}

export interface CreateTransactionJournalPayload extends Omit<TransactionJournalRecord, 'transaction_journal_id' | 'created_at'> {}
export interface UpdateTransactionJournalPayload {
  status?: TransactionJournalRecord['status'];
  payload?: Record<string, unknown>;
  completed?: boolean;
  actor?: string | null;
  error_message?: string | null;
  duration_ms?: number;
}

export class TransactionJournalRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) {
    super(db);
  }

  public async findById(transactionJournalId: string): Promise<TransactionJournalRecord> {
    const [rows] = await this.execute<TransactionJournalRecord[]>(
      'SELECT * FROM transaction_journal WHERE transaction_journal_id = ? LIMIT 1',
      [transactionJournalId]
    );
    if (rows.length === 0) {
      throw new NotFoundError('TransactionJournal', transactionJournalId);
    }
    return rows[0];
  }

  public async findAll(): Promise<TransactionJournalRecord[]> {
    const [rows] = await this.execute<TransactionJournalRecord[]>('SELECT * FROM transaction_journal', []);
    return rows;
  }

  public async search(criteria: Partial<TransactionJournalRecord>): Promise<TransactionJournalRecord[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (criteria.transaction_journal_id !== undefined) {
      clauses.push('transaction_journal_id = ?');
      params.push(criteria.transaction_journal_id);
    }
    if (criteria.transaction_id !== undefined) {
      clauses.push('transaction_id = ?');
      params.push(criteria.transaction_id);
    }
    if (criteria.endpoint !== undefined) {
      clauses.push('endpoint = ?');
      params.push(criteria.endpoint);
    }
    if (criteria.stage !== undefined) {
      clauses.push('stage = ?');
      params.push(criteria.stage);
    }
    if (criteria.status !== undefined) {
      clauses.push('status = ?');
      params.push(criteria.status);
    }
    if (criteria.completed !== undefined) {
      clauses.push('completed = ?');
      params.push(criteria.completed);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await this.execute<TransactionJournalRecord[]>(`SELECT * FROM transaction_journal ${where}`, params);
    return rows;
  }

  public async create(payload: CreateTransactionJournalPayload): Promise<TransactionJournalRecord> {
    await this.execute(
      `INSERT INTO transaction_journal (
        transaction_id,
        timestamp,
        endpoint,
        stage,
        status,
        payload,
        completed,
        actor,
        error_message,
        duration_ms,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.transaction_id,
        payload.timestamp,
        payload.endpoint,
        payload.stage,
        payload.status,
        JSON.stringify(payload.payload ?? {}),
        payload.completed,
        payload.actor ?? null,
        payload.error_message ?? null,
        payload.duration_ms ?? 0,
        new Date().toISOString().slice(0, 19).replace('T', ' '),
      ]
    );

    const [rows] = await this.execute<TransactionJournalRecord[]>(
      'SELECT * FROM transaction_journal WHERE transaction_id = ? AND timestamp = ? AND endpoint = ? ORDER BY created_at DESC LIMIT 1',
      [payload.transaction_id, payload.timestamp, payload.endpoint]
    );
    return rows[0];
  }

  public async update(transactionJournalId: string, updates: UpdateTransactionJournalPayload): Promise<TransactionJournalRecord> {
    const parts: string[] = [];
    const params: unknown[] = [];

    if (updates.status !== undefined) {
      parts.push('status = ?');
      params.push(updates.status);
    }
    if (updates.payload !== undefined) {
      parts.push('payload = ?');
      params.push(JSON.stringify(updates.payload));
    }
    if (updates.completed !== undefined) {
      parts.push('completed = ?');
      params.push(updates.completed);
    }
    if (updates.actor !== undefined) {
      parts.push('actor = ?');
      params.push(updates.actor);
    }
    if (updates.error_message !== undefined) {
      parts.push('error_message = ?');
      params.push(updates.error_message);
    }
    if (updates.duration_ms !== undefined) {
      parts.push('duration_ms = ?');
      params.push(updates.duration_ms);
    }

    if (parts.length === 0) {
      return this.findById(transactionJournalId);
    }

    const sql = `UPDATE transaction_journal SET ${parts.join(', ')} WHERE transaction_journal_id = ?`;
    await this.execute(sql, [...params, transactionJournalId]);
    return this.findById(transactionJournalId);
  }

  public async delete(transactionJournalId: string): Promise<void> {
    await this.execute('DELETE FROM transaction_journal WHERE transaction_journal_id = ?', [transactionJournalId]);
  }

  public async exists(transactionJournalId: string): Promise<boolean> {
    const [rows] = await this.execute<Array<{ exists: number }>>(
      'SELECT COUNT(1) AS exists FROM transaction_journal WHERE transaction_journal_id = ?',
      [transactionJournalId]
    );
    return rows.length > 0 && Number(rows[0].exists) > 0;
  }
}
