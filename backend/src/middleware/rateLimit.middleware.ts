import { Request, Response, NextFunction } from 'express';
import { RateLimiterMySQL, RateLimiterRes, RateLimiterAbstract } from 'rate-limiter-flexible';
import mysql from 'mysql2';
import { env } from '../config/env';
import { errorResponse } from '../utils/response.util';
import { logger } from '../config/logger';

// Create a MySQL pool specifically for rate limiting
const pool = mysql.createPool({
  host: env.dbHost,
  port: env.dbPort,
  user: env.dbUser,
  password: env.dbPassword,
  database: env.dbName,
});

// General API rate limiter
const apiLimiter = new RateLimiterMySQL({
  storeClient: pool,
  dbName: env.dbName,
  tableName: 'rate_limits_api',
  points: env.rateLimitMaxRequests, // Number of requests
  duration: env.rateLimitWindowMs / 1000, // Per X seconds
  blockDuration: 60, // Block for 1 minute if exceeded
});

// Stricter rate limiter for login attempts (by IP)
const loginIpLimiter = new RateLimiterMySQL({
  storeClient: pool,
  dbName: env.dbName,
  tableName: 'rate_limits_login_ip',
  points: 5, // 5 attempts
  duration: 15 * 60, // Per 15 minutes
  blockDuration: 15 * 60, // Block for 15 minutes
});

// Stricter rate limiter for login attempts (by Email)
const loginEmailLimiter = new RateLimiterMySQL({
  storeClient: pool,
  dbName: env.dbName,
  tableName: 'rate_limits_login_email',
  points: 5, // 5 attempts
  duration: 15 * 60, // Per 15 minutes
  blockDuration: 15 * 60, // Block for 15 minutes
});

// Stricter rate limiter for password reset
const passwordResetLimiter = new RateLimiterMySQL({
  storeClient: pool,
  dbName: env.dbName,
  tableName: 'rate_limits_password_reset',
  points: 3, // 3 attempts
  duration: 60 * 60, // Per hour
  blockDuration: 60 * 60, // Block for 1 hour
});

// Stricter rate limiter for registration
const registrationLimiter = new RateLimiterMySQL({
  storeClient: pool,
  dbName: env.dbName,
  tableName: 'rate_limits_registration',
  points: 5, // 5 attempts
  duration: 60 * 60, // Per hour
  blockDuration: 60 * 60, // Block for 1 hour
});

const handleRateLimitError = (res: Response, error: unknown, limitType: string, ip: string) => {
  if (error instanceof Error) {
    logger.warn(`Rate limit error for ${limitType}:`, error.message);
    errorResponse(res, 'Too many requests', 429);
    return;
  }

  const rateLimiterRes = error as RateLimiterRes;
  const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000);

  logger.warn(`Rate limit exceeded for ${limitType}:`, {
    ip,
    retryAfter,
  });

  res.setHeader('Retry-After', retryAfter.toString());
  res.setHeader(
    'X-RateLimit-Reset',
    new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString()
  );

  errorResponse(res, `Too many requests. Please try again in ${retryAfter} seconds.`, 429);
};

const createRateLimitMiddleware = (limiter: RateLimiterAbstract, limitType: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Use IP address as key
      const key = req.ip || req.socket.remoteAddress || 'unknown';

      await limiter.consume(key);
      next();
    } catch (error: unknown) {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      handleRateLimitError(res, error, limitType, ip);
    }
  };
};

export const rateLimitMiddleware = createRateLimitMiddleware(apiLimiter, 'API');

export const loginRateLimitMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const email = req.body?.email;

    // Check IP rate limit
    await loginIpLimiter.consume(ip);

    // Check Email rate limit if email is provided
    if (email && typeof email === 'string') {
      await loginEmailLimiter.consume(email.toLowerCase());
    }

    next();
  } catch (error: unknown) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    handleRateLimitError(res, error, 'Login', ip);
  }
};

export const passwordResetRateLimitMiddleware = createRateLimitMiddleware(
  passwordResetLimiter,
  'Password Reset'
);
export const registrationRateLimitMiddleware = createRateLimitMiddleware(
  registrationLimiter,
  'Registration'
);
