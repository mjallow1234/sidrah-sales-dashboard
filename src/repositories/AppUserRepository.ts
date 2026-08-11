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
  sales_rep_id?: string;
  password_hash: string;
  password_reset_required?: boolean;
  is_system_user?: boolean;
  created_by?: string;
  updated_by?: string;
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
  updated_by?: string;
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

  public async findById(userId: string): Promise<AppUser> {
    throw new NotFoundError('AppUser', userId);
  }

  public async findAll(): Promise<AppUser[]> {
    throw new Error('AppUserRepository.findAll not implemented');
  }

  public async search(criteria: AppUserSearchCriteria): Promise<AppUser[]> {
    throw new Error('AppUserRepository.search not implemented');
  }

  public async create(payload: CreateAppUserPayload): Promise<AppUser> {
    throw new Error('AppUserRepository.create not implemented');
  }

  public async update(userId: string, updates: UpdateAppUserPayload): Promise<AppUser> {
    throw new Error('AppUserRepository.update not implemented');
  }

  public async delete(userId: string): Promise<void> {
    throw new Error('AppUserRepository.delete not implemented');
  }

  public async exists(userId: string): Promise<boolean> {
    throw new Error('AppUserRepository.exists not implemented');
  }
}
