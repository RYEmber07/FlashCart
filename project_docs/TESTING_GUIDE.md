# Testing Guide

## Quick Start

### Run Automated Tests (CI/CD Ready)

```bash
cd packages/server
npm test
```

✅ **38 automated tests** covering registration, login, cart operations, and validation.

### Manual Testing with Postman

Import `flashcart.postman_collection.json` into Postman to manually verify endpoint behavior.

### Run Development Server

```bash
cd packages/server
npm run dev
```

Use Postman or cURL to manually test endpoints following the sections below.

---

## Testing Strategy

### Automated Tests
- **Unit Tests (11):** Focused on input validation and utility logic.
- **Integration Tests (27):** End-to-end HTTP requests targeting Express endpoints with a dedicated MongoDB test instance.
- **Scope:** Coverage includes authentication flows, cart state management, JWT rotation, and global error handling.

**Execution Commands:**

```bash
npm test                    # Run the full suite
npm test -- --watch        # Continuous testing during development
npm test -- --testNamePattern="register"  # Target specific suites
```

### Manual Testing
Postman is utilized for exploratory testing and debugging:
- Import the `flashcart.postman_collection.json` file.
- Validate new features before moving to automation.
- Investigate API response structures and edge cases.

---

## Manual Testing with Postman/cURL

### 1.1 Register a New User

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "contactNumber": "9876543210",
    "password": "SecurePass1"
  }'
```

**Expected Result:** `201 Created` with a sanitized user object (passwords are never returned).

**Test Cases:**
- **Duplicate Contact:** Should return `409 Conflict`.
- **Invalid Format:** (e.g., "12345") should return `400 Bad Request` via Zod validation.
- **Weak Password:** Should return `400 Bad Request`.

### 1.2 Login

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "contactNumber": "9876543210",
    "password": "SecurePass1"
  }'
```

**Expected Result:** `200 OK` with `accessToken` and `refreshToken` securely set as httpOnly cookies.

---

## 2. Authentication & Session Security

### 2.1 Monitor Active Sessions

```bash
curl -X GET http://localhost:5000/api/v1/auth/sessions \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Result:** An array of session metadata including `deviceInfo`, `ipAddress`, and timestamps.

### 2.2 Token Rotation (Refresh)

```bash
curl -X POST http://localhost:5000/api/v1/auth/refresh-token \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "refreshToken": "<refreshToken from login>"
  }'
```

---

## 3. User & Address Management

### 3.1 Profile Retrieval

```bash
curl -X GET http://localhost:5000/api/v1/user/me \
  -H "Authorization: Bearer $TOKEN"
```

### 3.2 Address Management

The system supports up to 5 addresses per user. Default address logic ensures the most recent or primary address is prioritized for checkout.

```bash
curl -X POST http://localhost:5000/api/v1/user/address \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Home",
    "addressLine1": "123 Main Street, Sector 5",
    "city": "Gurugram",
    "pincode": "122001",
    "coordinates": [77.0425, 28.4089],
    "isDefault": true
  }'
```

---

## 4. Administrative Controls

Admin routes require a valid JWT with the `admin` role.

### 4.1 Product & Category Management
- Slugs are automatically persisted on creation.
- Deactivating a category hides all associated products from public listings.

---

## 5. Hyperlocal Logistics

### 5.1 Geospatial Search
Products are filtered based on the nearest dark store's inventory.

```bash
curl -X GET "http://localhost:5000/api/v1/product?latitude=28.4089&longitude=77.0425"
```

---

## 6. Cart & Checkout Workflow

1.  **Store Lock:** The first item added locks the cart to a specific dark store.
2.  **Price Warnings:** If product prices change while in the cart, warnings are surfaced during the `GET /cart` call.
3.  **Atomic Checkout:** Orders are created in a `PENDING_PAYMENT` state, preserving a snapshot of prices and delivery data.

---

## 7. Real-time Logistics (WebSockets)

Connect via Socket.IO to receive live updates.

```javascript
import {io} from "socket.io-client";

const socket = io("http://localhost:5000", {
  auth: {token: "<accessToken>"},
});

socket.on("payment_status", (data) => {
  console.log("Order Update:", data);
});
```
    password: "SecurePass1",
  });

  expect(result.success).toBe(true);
});
```

**Integration Test (Endpoint):**

```javascript
import request from "supertest";
import app from "../../app.js";

it("should login user and return tokens", async () => {
  const res = await request(app).post("/api/v1/auth/login").send({
    contactNumber: "9876543210",
    password: "SecurePass1",
  });

  expect(res.status).toBe(200);
  expect(res.body.data.accessToken).toBeDefined();
});
```

### Running Endpoint Tests (Advanced)

To test actual HTTP endpoints, you need:

1. **Start MongoDB:**

   ```bash
   mongod
   ```

2. **Create `.env.test` (optional):**

   ```bash
   cp .env.test.example .env.test
   # Modify if needed for your local test environment
   ```

3. **Uncomment endpoint tests** in `/src/__tests__/endpoints/`

4. **Run tests:**
   ```bash
   npm test
   ```

### Environment Configuration

**For unit tests:** No configuration needed - tests pass with defaults

**For integration tests (optional):** Create `.env.test` from template:

```bash
cp .env.test.example .env.test
```

The `.env.test` file is in `.gitignore` and not committed - each developer can customize locally.

### Test Framework Details

- **Jest 29.7.0** - Test runner (configured for ES modules)
- **Supertest 7.2.2** - HTTP request testing
- **Node.js ES Modules** - All tests use `import` syntax

### Adding More Tests

To expand test coverage:

1. **Create test file** in appropriate folder
2. **Import dependencies:**
   ```javascript
   import {describe, it, expect} from "@jest/globals";
   ```
3. **Write test cases:**
   ```javascript
   describe("Feature Name", () => {
     it("should do something", () => {
       expect(true).toBe(true);
     });
   });
   ```
4. **Run tests:** `npm test`

### Continuous Integration Ready

The test setup is ready for CI/CD pipelines. To integrate with GitHub Actions or similar:

```yaml
# Example workflow
- name: Run tests
  run: npm test -- --coverage

- name: Upload coverage
  run: npx codecov
```
