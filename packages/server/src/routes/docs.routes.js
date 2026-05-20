import express from 'express';
import crypto from 'crypto';
import openApiSpec from '../docs/openapi.js';

const router = express.Router();

router.get('/openapi.json', (req, res) => {
  res.status(200).json(openApiSpec);
});

router.get('/', (req, res) => {
  // Create a per-request nonce to satisfy strict CSP and allow only
  // the inline script/style we control for the docs page.
  const nonce = crypto.randomBytes(16).toString('base64');

  // Set a scoped CSP for the docs page only. The Swagger UI assets are
  // served locally from the backend, so no external CDNs are required.
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'nonce-" + nonce + "'",
    "style-src 'self' 'nonce-" + nonce + "'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
  ].join('; ');

  res.set('Content-Security-Policy', csp);

  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FlashCart API Docs</title>
    <link rel="stylesheet" href="/api/v1/docs/static/swagger-ui.css" />
    <style nonce="${nonce}">
      body {
        margin: 0;
        background: #f6f7fb;
      }

      .topbar {
        display: none;
      }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/api/v1/docs/static/swagger-ui-bundle.js"></script>
    <script nonce="${nonce}">
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: '/api/v1/docs/openapi.json',
          dom_id: '#swagger-ui',
        });
      };
    </script>
  </body>
</html>`);
});

export default router;
