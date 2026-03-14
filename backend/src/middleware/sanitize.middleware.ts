import { Request, Response, NextFunction } from 'express';

// HTML entity encoding
const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
};

const escapeHtml = (str: string): string => {
    return str.replace(/[&<>"'/]/g, char => htmlEntities[char]);
};

/**
 * Fields that should NOT be sanitized because their values must
 * pass through exactly as the user typed them.  Passwords and
 * other secrets would be silently altered if we HTML-encoded
 * characters like & or < inside them.
 */
const SANITIZE_SKIP_FIELDS = new Set([
    'password',
    'confirmPassword',
    'currentPassword',
    'newPassword',
    'confirmNewPassword',
]);

// Recursively sanitize object values, skipping specified keys
const sanitizeValue = (value: unknown, key?: string): unknown => {
    // Skip sanitization for password-related fields
    if (key && SANITIZE_SKIP_FIELDS.has(key)) {
        return value;
    }

    if (typeof value === 'string') {
        return escapeHtml(value.trim());
    }

    if (Array.isArray(value)) {
        return value.map(v => sanitizeValue(v));
    }

    if (value !== null && typeof value === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const [k, val] of Object.entries(value)) {
            sanitized[k] = sanitizeValue(val, k);
        }
        return sanitized;
    }

    return value;
};

export const sanitizeMiddleware = (
    req: Request,
    _res: Response,
    next: NextFunction
): void => {
    // Sanitize request body (skipping password fields)
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeValue(req.body) as Record<string, unknown>;
    }

    // Sanitize query parameters (mutate in place)
    if (req.query && typeof req.query === 'object') {
        const sanitizedQuery = sanitizeValue(req.query) as Record<string, unknown>;
        for (const key of Object.keys(req.query)) {
            delete req.query[key];
        }
        Object.assign(req.query, sanitizedQuery);
    }

    // Sanitize URL parameters (mutate in place)
    if (req.params && typeof req.params === 'object') {
        const sanitizedParams = sanitizeValue(req.params) as Record<string, unknown>;
        for (const [key, value] of Object.entries(sanitizedParams)) {
            req.params[key] = value as string;
        }
    }

    next();
};

// Middleware to remove potentially dangerous fields
export const removeUnsafeFields = (
    req: Request,
    _res: Response,
    next: NextFunction
): void => {
    const unsafeFields = ['__proto__', 'constructor', 'prototype'];

    const removeFields = (obj: Record<string, unknown>): void => {
        for (const field of unsafeFields) {
            if (field in obj) {
                delete obj[field];
            }
        }

        for (const value of Object.values(obj)) {
            if (value !== null && typeof value === 'object') {
                removeFields(value as Record<string, unknown>);
            }
        }
    };

    if (req.body && typeof req.body === 'object') {
        removeFields(req.body as Record<string, unknown>);
    }

    next();
};
