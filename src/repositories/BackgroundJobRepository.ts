import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';
import { NotFoundError } from './errors';

export interface BackgroundJobRecord {
  job_id: number;
  job_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  payload?: Record<string, unknown>;
  progress_percentage: number;
  result?: Record<string, unknown>;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  created_by?: string;
}

export interface CreateBackgroundJobPayload {
  job_type: string;
  payload?: Record<string, unknown>;
  created_by?: string;
}

export interface UpdateBackgroundJobPayload {
  status?: BackgroundJobRecord['status'];
  payload?: Record<string, unknown>;
  progress_percentage?: number;
  result?: Record<string, unknown>;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

export class BackgroundJobRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) {
    super(db);
  }

  public async findById(jobId: string): Promise<BackgroundJobRecord> {
    throw new NotFoundError('BackgroundJob', jobId);
  }

  public async findAll(): Promise<BackgroundJobRecord[]> {
    throw new Error('BackgroundJobRepository.findAll not implemented');
  }

  public async search(criteria: Partial<BackgroundJobRecord>): Promise<BackgroundJobRecord[]> {
    throw new Error('BackgroundJobRepository.search not implemented');
  }

  public async create(payload: CreateBackgroundJobPayload): Promise<BackgroundJobRecord> {
    throw new Error('BackgroundJobRepository.create not implemented');
  }

  public async update(jobId: string, updates: UpdateBackgroundJobPayload): Promise<BackgroundJobRecord> {
    throw new Error('BackgroundJobRepository.update not implemented');
  }

  public async delete(jobId: string): Promise<void> {
    throw new Error('BackgroundJobRepository.delete not implemented');
  }

  public async exists(jobId: string): Promise<boolean> {
    throw new Error('BackgroundJobRepository.exists not implemented');
  }
}
