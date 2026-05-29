/**
 * ============================================================
 * API Error Classes
 * ============================================================
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
