import { Request } from 'express';
import { UserRole } from './constants';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Request type for protected routes where the auth middleware has run.
 * `user` is non-optional because the middleware guarantees it is set.
 *
 * Used with asyncHandler<AuthenticatedRequest>(...) so controllers receive a
 * fully-typed request without redundant non-null assertions.
 */
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

/**
 * Request type for routes with optional authentication
 * (public endpoints where a logged-in user may get extra data).
 */
export interface OptionallyAuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// The global augmentation is kept to allow middleware functions (role guards,
// auth middleware) to be passed as standard Express RequestHandlers.
// Without it the narrower AuthenticatedRequest parameter would be
// incompatible with Express's contravariant RequestHandler signature.
// Controllers that need the guarantee use asyncHandler<AuthenticatedRequest>.
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
