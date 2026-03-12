# FlashCart Backend — Server Documentation

## Overview

Express 5 REST API implementing a hyperlocal instant-delivery platform with MongoDB ACID transactions, Stripe payments, real-time Socket.IO tracking, and multi-role authentication.

## Quick Start

```bash
npm install
cp .env.example .env          # Configure environment
npm run dev                   # Start server on :5000
```

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# MongoDB
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net

# JWT
ACCESS_TOKEN_SECRET=<64-hex>
REFRESH_TOKEN_SECRET=<64-hex>
ACCESS_TOKEN_EXPIRY_MS=900000        # 15 min
REFRESH_TOKEN_EXPIRY_MS=2592000000   # 30 days

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Available Commands

```bash
npm run dev              # Development with hot-reload
npm start                # Production
npm test                 # Run Jest tests
npm run test:watch      # Watch mode
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix issues
npm run seed             # Database seeding
```

## Project Structure

```
src/
├── index.js                    # Server entry
├── app.js                      # Middleware pipeline
├── controllers/                # Request handlers
├── services/                   # Business logic
├── models/                     # Data schemas
├── middlewares/                # Custom middleware
├── validators/                 # Request schemas
├── utils/                      # Helper functions
└── __tests__/                  # Automated suites
```

## Database Models

| Model | Purpose | Notes |
|-------|---------|-------|
| **User** | Customers + Admins | Multi-device sessions, embedded addresses |
| **Product** | Catalog | Auto-slug, text search, price fallback |
| **Category** | Taxonomy | Categories with hierarchy |
| **Cart** | Shopping cart | Single-store, session-based |
| **Order** | Historical orders | Embedded item/address snapshots |
| **DarkStore** | Fulfillment centers | GeoJSON with 2dsphere index |
| **StoreInventory** | Stock junction | Per-store stock + price overrides |
| **Rider** | Delivery personnel | Location, status, store assignment |

## API Response Format

All endpoints return standardized JSON:

```json
{
  "statusCode": 200,
  "data": { /* payload */ },
  "message": "Success message"
}
```

Errors follow same format with `statusCode` (4xx/5xx) and `message`.

## Resilience & Quality

- ✅ **Helmet** — Secure HTTP headers.
- ✅ **Rate Limiting** — Multi-tier protection (Global, API, and Sensitive paths).
- ✅ **Data Sanitization** — Native protection against NoSQL injection.
- ✅ **Schema Validation** — Zod-driven request enforcement.
- ✅ **Atomic Transactions** — MongoDB ACID compliance for checkout logic.
- ✅ **CI/CD** — Automated testing via GitHub Actions.

## Key Workflows

### Checkout Flow
```
1. User adds items to cart
2. POST /cart/add → Items added
3. POST /orders/checkout → Order created (PENDING_PAYMENT)
4. Frontend loads Stripe PaymentIntent
5. User confirms payment
6. Stripe webhook → payment_intent.succeeded
7. Backend validates signature
8. Database transaction:
   - Deduct inventory
   - Find available rider
   - Assign to order
   - Update status to OUT_FOR_DELIVERY
9. Socket.IO real-time update
```

### Auth & Sessions
- Login → JWT tokens + session record
- Each device = separate refresh token
- Refresh token auto-rotates
- Logout removes session (doesn't affect other devices)

## Testing

```bash
npm test                        # Run all tests
npm run test:watch              # Watch mode
npm run test:coverage           # Coverage report
```

Tests cover:
- Validator schemas
- Utility functions
- Error handling
- Edge cases

## Common Issues

### "Refresh token has been revoked"
*Cause:* refreshToken field has `select: false` in model
*Fix:* Use `.select('+refreshToken')` when fetching rider

### "Order stuck in PENDING_PAYMENT"
*Cause:* Webhook listening for wrong event
*Fix:* Use `payment_intent.succeeded` not `checkout.session.completed`

### "Admin status update doesn't trigger delivery"
*Cause:* Direct findByIdAndUpdate bypasses side effects
*Fix:* Use delivery.service.completeOrder() for DELIVERED status

### "Rider assigned from wrong store"
*Cause:* findAvailableRider() doesn't filter by store
*Fix:* Pass storeId parameter to prefer store-affiliated riders

### "Stripe webhook always fails"
*Cause:* req.originalUrl matching is fragile
*Fix:* Use req.path for more robust matching

## Performance Tips

- **Indexes** — All frequently-queried fields indexed
- **Lean queries** — Use `.lean()` for read-only operations
- **Pagination** — Implement cursor-based or offset pagination
- **Geospatial** — 2dsphere index on store locations automatically
- **Caching** — Socket.IO reduces database queries for real-time updates

## Deployment

### Heroku
```bash
npm install -g heroku-cli
heroku login
heroku create app-name
heroku config:set NODE_ENV=production ...
git push heroku main
```

### Render
1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically on push

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## Monitoring & Logging

All logs include contextual tags:
- `[AUTH]` - Authentication events
- `[ORDER]` - Order processing
- `[RIDER]` - Rider assignment
- `[STOCK_CRITIQUE]` - Inventory issues
- `[SOCKET_ERROR]` - Real-time connection issues
- `[SECURITY]` - Security-related events

## Debugging

```bash
# Enable verbose logging
DEBUG=* npm run dev

# Check MongoDB connection
mongo "mongodb+srv://..." --eval "db.version()"

# Test Stripe webhook locally
ngrok http 5000
# Add http://localhost:ngrok-port/api/v1/webhooks/stripe to Stripe dashboard
```

## Architecture Decisions

### Why MongoDB ACID Transactions?
For atomic stock deduction + payment confirmation. Prevents overselling.

### Why Stripe PaymentIntent?
Supports SCA/3D Secure. More flexible than Checkout Session for custom flows.

### Why Socket.IO Authenticated Rooms?
Real-time order tracking without polling. Reduces server load.

### Why Embedded Schemas?
User addresses and order items rarely change after creation. Reduces JOINs.

### Why Separate Controllers for Admin/Rider?
Different permission models. Cleaner code organization.

## Contributing

- Follow existing code patterns
- Add tests for new features
- Run `npm run lint:fix` before commits
- Keep commits atomic

## License

ISC - Personal portfolio project
