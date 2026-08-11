import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';
import { NotFoundError } from './errors';

export interface DailyStatsRecord {
  date: string;
  sales_rep_id: string;
  vendor_count: number;
  visits: number;
  stock_sold: number;
  cash_collected: number;
  expected_cash: number;
}

export interface CreateDailyStatsPayload extends DailyStatsRecord {}
export interface UpdateDailyStatsPayload {
  vendor_count?: number;
  visits?: number;
  stock_sold?: number;
  cash_collected?: number;
  expected_cash?: number;
}

export class DailyStatsRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) {
    super(db);
  }

  public async findById(id: string): Promise<DailyStatsRecord> {
    throw new NotFoundError('DailyStats', id);
  }

  public async findAll(): Promise<DailyStatsRecord[]> {
    throw new Error('DailyStatsRepository.findAll not implemented');
  }

  public async search(criteria: Partial<DailyStatsRecord>): Promise<DailyStatsRecord[]> {
    throw new Error('DailyStatsRepository.search not implemented');
  }

  public async create(payload: CreateDailyStatsPayload): Promise<DailyStatsRecord> {
    throw new Error('DailyStatsRepository.create not implemented');
  }

  public async update(id: string, updates: UpdateDailyStatsPayload): Promise<DailyStatsRecord> {
    throw new Error('DailyStatsRepository.update not implemented');
  }

  public async delete(id: string): Promise<void> {
    throw new Error('DailyStatsRepository.delete not implemented');
  }

  public async exists(id: string): Promise<boolean> {
    throw new Error('DailyStatsRepository.exists not implemented');
  }
}
