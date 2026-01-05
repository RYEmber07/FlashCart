import rateLimit from 'express-rate-limit';
import ApiError from '../utils/apiError.js';

// handler to pass rate limit errors to global error handler
const limitHandler = (req, res, next, options) => {
  next(new ApiError(options.statusCode, options.message));
};

/**
 * General rate limiter for the entire app
 * Stops basic scraping and bot traffic
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests. Please slow down.',
  handler: limitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Stricter rate limiter for sensitive operations
 * Use this on: /login, /register, /checkout
 */
export const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Increased slightly to 10 to allow for accidental typos
  message: 'Security alert: Too many attempts. Please try again in an hour.',
  handler: limitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * API-specific limiter
 * Use this in your main index.js for /api/v1/routes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'API rate limit exceeded.',
  handler: limitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});
