/**
 * Custom Error Classes for Application
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    code: string = 'INTERNAL_ERROR',
    statusCode: number = 500,
    details?: Record<string, any>
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details?: Record<string, any>) {
    super(message, 'UNAUTHORIZED', 401, details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', details?: Record<string, any>) {
    super(message, 'FORBIDDEN', 403, details);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not Found', details?: Record<string, any>) {
    super(message, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation Failed', details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', details?: Record<string, any>) {
    super(message, 'CONFLICT', 409, details);
    this.name = 'ConflictError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network Error', details?: Record<string, any>) {
    super(message, 'NETWORK_ERROR', 0, details);
    this.name = 'NetworkError';
  }
}
