import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

// Import our Security Utilities
import {
  globalLimiter,
  apiLimiter,
} from './middlewares/rateLimit.middleware.js';
import {
  securityHeaders,
  sanitizeInput,
  preventParameterPollution,
} from './middlewares/security.middleware.js';

// Import Routes and Error Handling
import rootRouter from './routes/index.js';
import { errorHandler } from './middlewares/errorMiddleware.js';

const app = express();

// 1. Trust Proxy (for Rate Limiting on Render/Vercel/AWS)
app.set('trust proxy', 1);

// 2. Initial Security Layers
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(securityHeaders); // Sets Secure HTTP Headers
app.use(globalLimiter); // Basic protection for all paths

// 3. Webhook Body Parsing (Stripe)
// Why: Stripe webhooks require the raw request body Buffer for signature verification.
// We must use 'express.raw' for this specific route BEFORE 'express.json' consumes the stream globally.
app.use((req, res, next) => {
  if (
    req.path === '/api/v1/webhooks/stripe' ||
    req.path.startsWith('/api/v1/webhooks/stripe')
  ) {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json({ limit: '16kb' })(req, res, next);
  }
});

// 4. Body Parsing
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(cookieParser());

// 5. Data Sanitization (Run after body is parsed)
app.use(sanitizeInput); // Prevents NoSQL Injection
app.use(preventParameterPollution); // Prevents Query Array Pollution

// 6. Logging (Development only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 7. Static Files
app.use(express.static('public'));

// 8. API Routes with API-specific Rate Limiting
// This protects your database routes more strictly than static files
app.use('/api/v1', apiLimiter, rootRouter);

// 9. Global Error Handler (Hides stack traces in production)
app.use(errorHandler);

export default app;
