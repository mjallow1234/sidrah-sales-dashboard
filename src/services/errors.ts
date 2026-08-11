export class ServiceError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;

  constructor(message: string, statusCode = 500, code?: string) {
    super(message);
    this.name = 'ServiceError';
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string, code?: string) {
    super(message, 400, code);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ServiceError {
  constructor(entity: string, identifier: string) {
    super(`${entity} not found.`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ServiceError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}
