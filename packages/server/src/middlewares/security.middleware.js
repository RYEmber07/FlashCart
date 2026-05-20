import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';

/**
 * Security middleware that sets various HTTP headers
 * and protects against common web vulnerabilities
 *
 * Note: we intentionally avoid using Helmet's automatic CSP here so we can
 * set a per-route CSP for the docs page (nonce-based) without producing
 * multiple conflicting CSP headers. A default CSP is applied via
 * `defaultCSP` middleware below and will be skipped for the docs route.
 */
export const securityHeaders = helmet({
  // Disable helmet's built-in CSP to avoid header conflicts with per-route CSP
  contentSecurityPolicy: false,
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
 * Default Content Security Policy applied to all non-docs routes.
 * The docs route uses a nonce-based CSP defined in `docs.routes.js`.
 */
export const defaultCSP = (req, res, next) => {
  if (req.path.startsWith('/api/v1/docs')) return next();

  const directives = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
  ];

  res.set('Content-Security-Policy', directives.join('; '));
  next();
};

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
