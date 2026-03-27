import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { serverErrorResponse, errorResponse } from '../utils/response.util';
import { isProduction } from '../config/env';
import { ValidationError, isAppError } from '../shared/errors';
import { ValidationError as SeqValidationError, UniqueConstraintError } from 'sequelize';

// Re-type to avoid CI TypeScript inference issues with module resolution
const isProd = isProduction as () => boolean;

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
  isAppError,
  isHttpError,
} from '../shared/errors';

// Global error handler
export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error
  const appErr = isAppError(err) ? err : undefined;
  logger.error('Error:', {
    message: err.message,
    stack: isProd() ? undefined : err.stack,
    statusCode: appErr?.statusCode,
  });

  // Handle known errors
  if (appErr?.isOperational) {
    if (appErr instanceof ValidationError) {
      errorResponse(res, appErr.message, appErr.statusCode, appErr.errors);
      return;
    }
    errorResponse(res, appErr.message, appErr.statusCode || 500);
    return;
  }

  // Handle Sequelize validation errors
  if (err instanceof SeqValidationError) {
    const validationErrors: Record<string, string[]> = {};
    err.errors.forEach((e) => {
      const field = e.path ?? 'unknown';
      if (!validationErrors[field]) {
        validationErrors[field] = [];
      }
      validationErrors[field].push(e.message);
    });
    errorResponse(res, 'Validation error', 422, validationErrors);
    return;
  }

  // Handle Sequelize unique constraint errors
  if (err instanceof UniqueConstraintError) {
    errorResponse(res, 'Resource already exists', 409);
    return;
  }

  // Handle unknown errors (don't leak error details in production)
  if (isProd()) {
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
