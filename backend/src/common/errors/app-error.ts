export interface InvalidParamDetail {
  name: string;
  reason: string;
}

export abstract class AppError extends Error {
  public abstract readonly statusCode: number;
  public abstract readonly errorCode: string;
  public abstract readonly title: string;
  public readonly isOperational: boolean = true;
  public readonly invalidParams?: InvalidParamDetail[] | undefined;

  constructor(message: string, invalidParams?: InvalidParamDetail[]) {
    super(message);
    this.name = this.constructor.name;
    this.invalidParams = invalidParams;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  public readonly statusCode = 400;
  public readonly errorCode = "BAD_REQUEST";
  public readonly title = "Bad Request";
}

export class UnauthorizedError extends AppError {
  public readonly statusCode = 401;
  public readonly errorCode = "UNAUTHORIZED";
  public readonly title = "Unauthorized Access";
}

export class ForbiddenError extends AppError {
  public readonly statusCode = 403;
  public readonly errorCode = "FORBIDDEN";
  public readonly title = "Forbidden";
}

export class NotFoundError extends AppError {
  public readonly statusCode = 404;
  public readonly errorCode = "NOT_FOUND";
  public readonly title = "Resource Not Found";
}

export class ConflictError extends AppError {
  public readonly statusCode = 409;
  public readonly errorCode = "CONFLICT";
  public readonly title = "Resource Conflict";
}

export class ValidationError extends AppError {
  public readonly statusCode = 422;
  public readonly errorCode = "VALIDATION_ERROR";
  public readonly title = "Unprocessable Entity / Validation Failed";

  constructor(message = "Request validation failed", invalidParams?: InvalidParamDetail[]) {
    super(message, invalidParams);
  }
}

export class RateLimitError extends AppError {
  public readonly statusCode = 429;
  public readonly errorCode = "RATE_LIMITED";
  public readonly title = "Too Many Requests";
}

export class InternalServerError extends AppError {
  public readonly statusCode = 500;
  public readonly errorCode = "INTERNAL_SERVER_ERROR";
  public readonly title = "Internal Server Error";
  public override readonly isOperational = false;
}
