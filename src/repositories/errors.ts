export class RepositoryError extends Error {
  public readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'RepositoryError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends RepositoryError {
  constructor(entity: string, identifier: string) {
    super(`${entity} not found: ${identifier}`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class DuplicateRecordError extends RepositoryError {
  constructor(message: string) {
    super(message, 'DUPLICATE_RECORD');
    this.name = 'DuplicateRecordError';
  }
}

export class TransactionError extends RepositoryError {
  constructor(message: string) {
    super(message, 'TRANSACTION_ERROR');
    this.name = 'TransactionError';
  }
}

export class RepositoryStateError extends RepositoryError {
  constructor(message: string) {
    super(message, 'REPOSITORY_STATE_ERROR');
    this.name = 'RepositoryStateError';
  }
}
