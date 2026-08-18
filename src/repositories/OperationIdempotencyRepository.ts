import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';

export type OperationIdempotencyStatus = 'processing' | 'completed';

export interface OperationIdempotencyRecord {
  client_transaction_id: string;
  endpoint: string;
  transaction_id: string;
  status: OperationIdempotencyStatus;
  result_visit_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export class OperationIdempotencyRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) {
    super(db);
  }

  public async claim(clientTransactionId: string, endpoint: string, transactionId: string): Promise<boolean> {
    try {
      await this.execute(
      `INSERT INTO operation_idempotency (
        client_transaction_id,
        endpoint,
        transaction_id,
        status
      ) VALUES (?, ?, ?, 'processing')`,
        [clientTransactionId, endpoint, transactionId],
      );
      return true;
    } catch (error) {
      if (error && typeof error === 'object' && (error as { code?: string }).code === 'ER_DUP_ENTRY') {
        return false;
      }
      throw error;
    }
  }

  public async findByIdForUpdate(clientTransactionId: string): Promise<OperationIdempotencyRecord | null> {
    const [rows] = await this.execute<OperationIdempotencyRecord[]>(
      'SELECT * FROM operation_idempotency WHERE client_transaction_id = ? LIMIT 1 FOR UPDATE',
      [clientTransactionId],
    );
    return rows[0] ?? null;
  }

  public async markCompleted(clientTransactionId: string, resultVisitId: string, completedAt: string): Promise<OperationIdempotencyRecord> {
    await this.execute(
      `UPDATE operation_idempotency
       SET status = 'completed', result_visit_id = ?, completed_at = ?
       WHERE client_transaction_id = ?`,
      [resultVisitId, completedAt, clientTransactionId],
    );
    const reservation = await this.findByIdForUpdate(clientTransactionId);
    if (!reservation) {
      throw new Error('Operation idempotency reservation not found.');
    }
    return reservation;
  }
}
