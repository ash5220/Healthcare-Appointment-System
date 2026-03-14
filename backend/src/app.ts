import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import routes from './routes';
import { env, isProduction } from './config/env';
import { httpLogger } from './config/logger';
import {
    errorMiddleware,
    notFoundHandler,
    rateLimitMiddleware,
    sanitizeMiddleware,
    removeUnsafeFields,
} from './middleware';
import { initializeAssociations } from './models';

// Initialize model associations
initializeAssociations();

const app: Express = express();

// ── Security: Helmet ───────────────────────────────────────────────────
// Sets various HTTP security headers to protect against common attacks.
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https:'],
            },
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        },
        crossOriginEmbedderPolicy: isProduction(),
        crossOriginOpenerPolicy: isProduction() ? { policy: 'same-origin' } : false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
);

// ── Response Compression ───────────────────────────────────────────────
// Compresses response bodies (gzip / deflate) for all requests.
// Skips compression for responses smaller than 1 KB.
app.use(
    compression({
        level: 6,                      // balanced speed vs. compression ratio
        threshold: 1024,               // skip responses smaller than 1 KB
        filter: (req, res) => {
            // Don't compress server-sent events
            if (req.headers['x-no-compression']) return false;
            return compression.filter(req, res);
        },
    })
);

// ── CORS ───────────────────────────────────────────────────────────────
// NOTE: `credentials: true` is incompatible with `origin: '*'`.
// Browsers will block credentialed preflight requests if the server
// responds with a wildcard origin. We must always use an explicit list.
const allowedOrigins = isProduction()
    ? [env.frontendUrl]
    : [
        'http://localhost:4200',  // Angular dev server
        'http://localhost:3000',  // Backend (for self-requests / Swagger)
        env.frontendUrl,          // Honour any override set in .env
    ];

app.use(
    cors({
        origin: (requestOrigin, callback) => {
            // Allow server-to-server requests (no Origin header) and listed origins
            if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
                callback(null, requestOrigin ?? true);
            } else {
                callback(new Error(`CORS: origin '${requestOrigin}' not allowed`));
            }
        },
        credentials: true,
        optionsSuccessStatus: 200,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
);

// ── Body Parsing ───────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Cookie Parsing ─────────────────────────────────────────────────────
// Required to read the HttpOnly refresh token cookie sent by the client.
app.use(cookieParser());

// ── Input Sanitization ────────────────────────────────────────────────
app.use(sanitizeMiddleware);
app.use(removeUnsafeFields);

// ── Rate Limiting ──────────────────────────────────────────────────────
app.use(rateLimitMiddleware);

// ── HTTP Request Logging ───────────────────────────────────────────────
// Winston-native middleware: logs method, URL, status, and response time.
// In production only 4xx/5xx responses are logged to reduce noise.
app.use(httpLogger);

// ── API Routes ─────────────────────────────────────────────────────────
app.use(`/api/${env.apiVersion}`, routes);

// ── Root Endpoint ──────────────────────────────────────────────────────
app.get('/', (_req, res) => {
    res.json({
        success: true,
        message: 'Healthcare Appointment System API',
        version: env.apiVersion,
        documentation: `/api/${env.apiVersion}/docs`,
    });
});

// ── 404 Handler ────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ── Global Error Handler ───────────────────────────────────────────────
app.use(errorMiddleware);

export default app;
