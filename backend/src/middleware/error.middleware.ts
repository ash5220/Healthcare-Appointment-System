import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { serverErrorResponse, errorResponse } from '../utils/response.util';
import { isProduction } from '../config/env';
import { AppError, ValidationError } from '../shared/errors';

// Re-export error classes from the shared layer so existing imports that point
// here keep working without any changes.
export {
  AppError,
  HttpError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../shared/errors';

// Global error handler
export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error
  const errAny = err as AppError;
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    statusCode: errAny.statusCode,
  });

  // Handle known errors
  const appErr = err as AppError;
  if (appErr.isOperational) {
    if (appErr instanceof ValidationError) {
      errorResponse(res, appErr.message, appErr.statusCode, appErr.errors);
      return;
    }
    errorResponse(res, appErr.message, appErr.statusCode || 500);
    return;
  }

  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    const validationErrors: Record<string, string[]> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).errors?.forEach((e: any) => {
      const field = e.path as string;
      if (!validationErrors[field]) {
        validationErrors[field] = [];
      }
      validationErrors[field].push(e.message as string);
    });
    errorResponse(res, 'Validation error', 422, validationErrors);
    return;
  }

  // Handle Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    errorResponse(res, 'Resource already exists', 409);
    return;
  }

  // Handle unknown errors (don't leak error details in production)
  if (isProduction()) {
    serverErrorResponse(res);
  } else {
    errorResponse(res, err.message || 'Internal server error', 500);
  }
};

// Async handler wrapper with typed request support.
// Use TReq to narrow the request type in controllers that require authentication:
//   asyncHandler<AuthenticatedRequest>(async (req, res) => { req.user.userId; ... })
export const asyncHandler = <TReq extends Request = Request>(
  fn: (req: TReq, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req as TReq, res, next)).catch(next);
  };
};

// Not found handler for undefined routes
export const notFoundHandler = (req: Request, res: Response, _next: NextFunction): void => {
  errorResponse(res, `Route ${req.method} ${req.path} not found`, 404);
};
