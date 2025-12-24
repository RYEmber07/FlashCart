# FlashCart: Production-Grade Hyperlocal Backend API

A robust **RESTful API for hyperlocal delivery services**, designed for high-concurrency and data integrity. Built with a modern Node.js stack including Express 5, MongoDB, Stripe integration, and real-time updates via Socket.IO.

This project demonstrates system design principles required for instant-delivery platforms, handling complex workflows like atomic inventory management and geospatial rider assignment.

## Key Features

- **Geospatial Fulfillment** — Uses MongoDB 2dsphere indexes for efficient nearest-store lookups.
- **Atomic Checkout** — Implements MongoDB transactions to ensure data consistency during order placement.
- **Financial Integration** — Secure Stripe PaymentIntent workflow with automated webhook validation.
- **Live Event Stream** — Authenticated Socket.IO integration for real-time order status updates.
- **Multi-Device Session Management** — Secure JWT architecture with per-device refresh token rotation.
- **Granular RBAC** — Distinct authentication flows and permission levels for Users, Admins, and Riders.
- **Advanced Security** — Hardened with Helmet, intelligent rate limiting, and Zod-driven schema validation.

## Tech Stack

| Component      | Technology                   |
| -------------- | ---------------------------- |
| Runtime        | Node.js (ES Modules)         |
| Framework      | Express 5                    |
| Database       | MongoDB + Mongoose 9         |
| Authentication | JWT + Session Rotation       |
| Payments       | Stripe API                   |
| Real-time      | Socket.IO v4                 |
| Validation     | Zod                          |
| Testing        | Jest v29                     |
| Security       | Helmet, Rate-Limit, Sanitize |

## Setup & Installation

```bash
# Navigate to the server directory
cd packages/server

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Launch development server
npm run dev
```

## Primary API Endpoints

**Authentication**
- `POST /auth/register` — User onboarding
- `POST /auth/login` — Session initialization
- `POST /auth/refresh-token` — Token rotation
- `GET /auth/sessions` — Active session monitoring

**Catalog & Cart**
- `GET /products` — Item discovery with geo-filtering
- `POST /cart/add` — Secure cart mutation
- `GET /cart` — Verified cart state

**Order Lifecycle**
- `POST /orders/checkout` — Atomic order creation
- `GET /orders/:id` — Detailed status tracking
- `POST /webhooks/stripe` — Asynchronous payment processing

Full documentation is available in the [project_docs](./project_docs) directory.

## Core Services & Architecture

- **DarkStore Implementation** — Optimized for hyperlocal fulfillment.
- **Geospatial Indexing** — Enables sub-second store selection based on user coordinates.
- **Real-time Logistics** — Dynamic rider assignment based on store affinity and availability.
- **Data Integrity** — Snapshot-based ordering to preserve historical pricing and address data.

## Project Structure

```
packages/server/
├── src/
│   ├── controllers/           # Request orchestration
│   ├── models/                # Business data schemas
│   ├── routes/                # API routing
│   ├── services/              # Encapsulated business logic
│   ├── middlewares/           # Cross-cutting concerns (Auth, Validation)
│   ├── validators/            # Request schema enforcement
│   ├── utils/                 # Shared utilities
│   ├── __tests__/             # Automated test suites
│   ├── app.js                 # App configuration
│   └── index.js               # Entry point
```

## Resilience & Quality

### Security
The API implementes several layers of defense:
- Multi-tier rate limiting to prevent DDoS and brute force.
- HTTP security headers via Helmet.
- Automated payload sanitization to prevent NoSQL injection.
- Bcrypt (cost 12) for secure credential storage.

### Database Strategy
- **Text Search** — Optimized indexes for product discovery.
- **Transactions** — Mandatory for checkout and payment confirmation.
- **Soft Deletes** — Built-in support for data retention.

## Testing Strategy

The repository includes a pre-configured Jest environment:

```bash
# Execute full test suite
npm test

# Run in watch mode
npm run test:watch

# Generate coverage reports
npm run test:coverage
```

## Performance Benchmarks
- **Latency:** ~50-80ms per request (standard DB ops).
- **Concurrency:** Architected for 1000+ concurrent Socket.IO connections.
- **Throughput:** Capable of handling hundreds of atomic transactions per minute.

## Author

**RYEMBER07**

---

⭐ If you found this useful, you can even star the repository!
