import { Response } from 'express';
import { isProduction } from '../config/env';

// Re-type to avoid CI TypeScript inference issues
const isProd = isProduction as () => boolean;

/**
 * Cookie name used to store the refresh token.
 * Centralised here so it's consistent across the codebase.
 */
export const REFRESH_TOKEN_COOKIE = 'refreshToken';

/**
 * Options applied to the refresh token cookie.
 *
 * - httpOnly : JavaScript cannot read this cookie (blocks XSS token theft)
 * - secure   : Cookie is only sent over HTTPS (enforced in production)
 * - sameSite : 'strict' — cookie is never sent on cross-site requests (CSRF defence)
 * - maxAge   : 7 days in milliseconds, matching JWT_REFRESH_EXPIRES_IN
 * - path     : Scoped to /api so it is only sent with API requests, not every resource
 */
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: isProd(), // HTTPS only in production, HTTP allowed in dev
  sameSite: 'strict' as const, // Never sent on cross-site requests
  maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  path: '/api', // Only sent with API requests
};

/**
 * Set the refresh token as a secure HttpOnly cookie on the response.
 */
export const setRefreshTokenCookie = (res: Response, refreshToken: string): void => {
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, refreshTokenCookieOptions);
};

/**
 * Clear the refresh token cookie (used on logout).
 */
export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'strict' as const,
    path: '/api',
  });
};
