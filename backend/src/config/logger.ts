import winston from 'winston';
import path from 'path';
import { type Request, type Response } from 'express';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// ── Custom log format ──────────────────────────────────────────────────
const logFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp as string} [${level}]: ${stack || message}`;
});

// ── Log directory ──────────────────────────────────────────────────────
const logDir = path.join(__dirname, '../../logs');

// ── Logger instance ────────────────────────────────────────────────────
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
    ),
    defaultMeta: { service: 'healthcare-api' },
    transports: [
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5 MB
            maxFiles: 5,
        }),
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 5242880, // 5 MB
            maxFiles: 5,
        }),
    ],
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logDir, 'exceptions.log'),
        }),
    ],
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logDir, 'rejections.log'),
        }),
    ],
});

// Add console transport for non-production environments
if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: combine(
                colorize(),
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                errors({ stack: true }),
                logFormat
            ),
        })
    );
}

// ── HTTP request logger middleware (replaces Morgan) ───────────────────
// Logs method, URL, status code, response time, and content length.
// In production only errors (4xx/5xx) are logged to reduce noise.
export const httpLogger = (req: Request, res: Response, next: () => void): void => {
    const start = Date.now();
    const isProduction = process.env.NODE_ENV === 'production';

    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;

        // In production, skip successful requests
        if (isProduction && status < 400) {
            return;
        }

        const contentLength = res.getHeader('content-length') ?? '-';
        const message = `${req.method} ${req.originalUrl} ${status} ${duration}ms - ${contentLength}`;

        if (status >= 500) {
            logger.error(message);
        } else if (status >= 400) {
            logger.warn(message);
        } else {
            logger.http(message);
        }
    });

    next();
};
