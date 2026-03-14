import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { env, isProduction } from '../config/env';
import { errorResponse } from '../utils/response.util';
import { logger } from '../config/logger';

// ── Production warning ──────────────────────────────────────────────────
// TODO: RateLimiterMemory is process-local: each PM2 cluster / server instance
// maintains its own counter.  In a multi-process or multi-server deployment
// an attacker can bypass per-instance limits by rotating requests across
// instances.  Replace with RateLimiterMySQL (using the existing MySQL
// connection) or RateLimiterRedis in production for shared state.
// See: https://github.com/animir/node-rate-limiter-flexible#mysql
if (isProduction()) {
  logger.warn(
    '[RateLimit] Using in-memory rate limiter — not suitable for ' +
      'multi-process/multi-server deployments.  Migrate to ' +
      'RateLimiterMySQL or RateLimiterRedis before go-live.'
  );
}

// General API rate limiter
const apiLimiter = new RateLimiterMemory({
  points: env.rateLimitMaxRequests, // Number of requests
  duration: env.rateLimitWindowMs / 1000, // Per X seconds
  blockDuration: 60, // Block for 1 minute if exceeded
});

// Stricter rate limiter for login attempts
const loginLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 15 * 60, // Per 15 minutes
  blockDuration: 15 * 60, // Block for 15 minutes
});

// Stricter rate limiter for password reset
const passwordResetLimiter = new RateLimiterMemory({
  points: 3, // 3 attempts
  duration: 60 * 60, // Per hour
  blockDuration: 60 * 60, // Block for 1 hour
});

// Stricter rate limiter for registration
const registrationLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 60 * 60, // Per hour
  blockDuration: 60 * 60, // Block for 1 hour
});

const createRateLimitMiddleware = (limiter: RateLimiterMemory, limitType: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Use IP address as key
      const key = req.ip || req.socket.remoteAddress || 'unknown';

      await limiter.consume(key);
      next();
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.warn(`Rate limit error for ${limitType}:`, error.message);
        errorResponse(res, 'Too many requests', 429);
        return;
      }

      const rateLimiterRes = error as RateLimiterRes;
      const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000);

      logger.warn(`Rate limit exceeded for ${limitType}:`, {
        ip: req.ip,
        path: req.path,
        retryAfter,
      });

      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', limiter.points.toString());
      res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints.toString());
      res.setHeader(
        'X-RateLimit-Reset',
        new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString()
      );

      errorResponse(res, `Too many requests. Please try again in ${retryAfter} seconds.`, 429);
    }
  };
};

export const rateLimitMiddleware = createRateLimitMiddleware(apiLimiter, 'API');
export const loginRateLimitMiddleware = createRateLimitMiddleware(loginLimiter, 'Login');
export const passwordResetRateLimitMiddleware = createRateLimitMiddleware(
  passwordResetLimiter,
  'Password Reset'
);
export const registrationRateLimitMiddleware = createRateLimitMiddleware(
  registrationLimiter,
  'Registration'
);
