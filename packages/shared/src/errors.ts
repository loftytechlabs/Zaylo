export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, code: string = 'INTERNAL_ERROR', statusCode: number = 500, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'NOT_FOUND', 404, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Unauthorized', details?: unknown) {
    super(message, 'UNAUTHORIZED', 401, details);
  }
}

export class InsufficientResourcesError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'INSUFFICIENT_RESOURCES', 507, details);
  }
}

export class RuntimeUnavailableError extends AppError {
  constructor(message: string = 'Inference runtime is unavailable', details?: unknown) {
    super(message, 'RUNTIME_UNAVAILABLE', 503, details);
  }
}

export class ModelNotLoadedError extends AppError {
  constructor(message: string = 'No model is currently loaded', details?: unknown) {
    super(message, 'MODEL_NOT_LOADED', 503, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests, queue limit exceeded', details?: unknown) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, details);
  }
}
