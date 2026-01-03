import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';

/**
 * Security middleware that sets various HTTP headers
 * and protects against common web vulnerabilities
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
});

/**
 * Sanitizes user input to prevent NoSQL injection
 * Removes any keys containing prohibited characters or operators
 * In Express 5, req.query is a read-only getter, so we use mongoSanitize.sanitize()
 * to mutate the object in-place rather than replacing it.
 */
export const sanitizeInput = (req, res, next) => {
  const options = {
    replaceWith: '_',
    onSanitize: ({ key, value }) => {
      console.warn(`Sanitized potentially malicious input: ${key}=${value}`);
    },
  };

  if (req.body) mongoSanitize.sanitize(req.body, options);
  if (req.query) mongoSanitize.sanitize(req.query, options);
  if (req.params) mongoSanitize.sanitize(req.params, options);

  next();
};

/**
 * Prevents HTTP Parameter Pollution
 */
export const preventParameterPollution = (req, res, next) => {
  // Remove duplicate parameters
  for (const key in req.query) {
    if (Array.isArray(req.query[key])) {
      req.query[key] = req.query[key][req.query[key].length - 1];
    }
  }
  next();
};
