# API Reference

> **Base URL:** `http://localhost:5000/api/v1`
>
> All endpoints return responses in the format: `{ statusCode, data, message, success }`

---

## Authentication

All **Protected** endpoints require either:

- `Cookie: accessToken=<jwt>` (httpOnly, set automatically on login), or
- `Authorization: Bearer <jwt>` header

---

## 1. Auth — `/api/v1/auth`

| Method   | Endpoint               | Access    | Rate Limit        | Description                                |
| -------- | ---------------------- | --------- | ----------------- | ------------------------------------------ |
| `POST`   | `/register`            | Public    | Sensitive (10/hr) | Register a new user                        |
| `POST`   | `/login`               | Public    | Sensitive (10/hr) | Login with contact number & password       |
| `POST`   | `/logout`              | Protected | —                 | Logout from current device                 |
| `POST`   | `/refresh-token`       | Public    | Sensitive (10/hr) | Get a new access token using refresh token |
| `GET`    | `/sessions`            | Protected | —                 | Get all active sessions                    |
| `DELETE` | `/sessions/:sessionId` | Protected | Sensitive (10/hr) | Logout from a specific device              |
| `DELETE` | `/sessions`            | Protected | Sensitive (10/hr) | Logout from all devices                    |

### Register

```
POST /auth/register
Content-Type: application/json

{
  "name": "Rishab",
  "contactNumber": "9876543210",
  "password": "Secure1Pass"
}
```

**Validation Rules:**

- `name`: 2–50 characters
- `contactNumber`: Exactly 10 digits, starts with 6–9 (Indian format)
- `password`: Min 8 characters, 1 uppercase, 1 lowercase, 1 digit

### Login

```
POST /auth/login
Content-Type: application/json

{
  "contactNumber": "9876543210",
  "password": "Secure1Pass"
}
```

**Response:** Sets `accessToken` and `refreshToken` as httpOnly cookies. Also returns tokens and user object in the body.

---

## 2. User — `/api/v1/user`

| Method   | Endpoint                 | Access    | Description                   |
| -------- | ------------------------ | --------- | ----------------------------- |
| `GET`    | `/me`                    | Protected | Get current user profile      |
| `PATCH`  | `/me`                    | Protected | Update name or contact number |
| `POST`   | `/me/address`            | Protected | Add a new address (max 5)     |
| `PATCH`  | `/me/address/:addressId` | Protected | Update an existing address    |
| `DELETE` | `/me/address/:addressId` | Protected | Delete an address             |

### Add Address

```
POST /user/me/address
Content-Type: application/json

{
  "label": "Home",
  "addressLine1": "123 Main Street, Sector 5",
  "city": "Gurugram",
  "pincode": "122001",
  "coordinates": [77.0425, 28.4089],
  "isDefault": true
}
```

---

## 3. Products — `/api/v1/product`

| Method | Endpoint   | Access | Description                                    |
| ------ | ---------- | ------ | ---------------------------------------------- |
| `GET`  | `/`        | Public | List products with filters, search, pagination |
| `GET`  | `/:id`     | Public | Get product by MongoDB ObjectId                |
| `GET`  | `/s/:slug` | Public | Get product by URL-friendly slug               |

### List Products (with geo-filtering)

```
GET /product?latitude=28.4595&longitude=77.0266&category=<categoryId>&search=milk&minPrice=10&maxPrice=100&sort=price_asc&page=1&limit=10
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `latitude` | Number | User's latitude (enables location-based filtering) |
| `longitude` | Number | User's longitude |
| `category` | ObjectId | Filter by category |
| `search` | String | Full-text search on name & description |
| `minPrice` | Number | Minimum price filter |
| `maxPrice` | Number | Maximum price filter |
| `sort` | Enum | `price_asc`, `price_desc`, `newest`, `oldest` |
| `page` | Number | Page number (default: 1) |
| `limit` | Number | Items per page (default: 10, max: 100) |

---

## 4. Categories — `/api/v1/category`

| Method | Endpoint   | Access | Description               |
| ------ | ---------- | ------ | ------------------------- |
| `GET`  | `/`        | Public | Get all active categories |
| `GET`  | `/s/:slug` | Public | Get category by slug      |

---

## 5. Cart — `/api/v1/cart`

| Method   | Endpoint             | Access    | Description                          |
| -------- | -------------------- | --------- | ------------------------------------ |
| `POST`   | `/add`               | Protected | Add item to cart                     |
| `PUT`    | `/update`            | Protected | Update item quantity                 |
| `DELETE` | `/remove/:productId` | Protected | Remove item from cart                |
| `GET`    | `/`                  | Protected | Get cart (with price/stock warnings) |
| `POST`   | `/clear`             | Protected | Clear entire cart                    |

### Add to Cart

```
POST /cart/add
Content-Type: application/json

{
  "productId": "<productObjectId>",
  "storeId": "<storeObjectId>",
  "quantity": 2
}
```

> **Important:** A cart is locked to a single store. Adding items from a different store requires clearing the cart first.

---

## 6. Orders — `/api/v1/order`

| Method | Endpoint    | Access    | Description                                      |
| ------ | ----------- | --------- | ------------------------------------------------ |
| `POST` | `/checkout` | Protected | Create order from cart & initiate Stripe payment |
| `GET`  | `/history`  | Protected | Get paginated order history                      |
| `GET`  | `/:id`      | Protected | Get specific order details                       |

### Checkout

```
POST /order/checkout
```

No body required — uses the authenticated user's cart and default address.

**Response:**

```json
{
  "data": {
    "order": {"_id": "...", "totalAmount": 250, "status": "PENDING_PAYMENT"},
    "payment": {
      "clientSecret": "pi_..._secret_...",
      "paymentIntentId": "pi_..."
    }
  }
}
```

**Order Statuses:** `PENDING_PAYMENT` → `CONFIRMED` → `PREPARING` → `OUT_FOR_DELIVERY` → `DELIVERED` | `CANCELLED` | `FAILED`

---

## 7. Stores — `/api/v1/stores`

| Method | Endpoint                              | Access | Description                    |
| ------ | ------------------------------------- | ------ | ------------------------------ |
| `GET`  | `/nearest?latitude=...&longitude=...` | Public | Find nearest active dark store |
| `GET`  | `/:storeId/inventory`                 | Public | Get store inventory            |

---

## 8. Riders — `/api/v1/riders`

### Rider Auth

| Method | Endpoint              | Access          | Description                |
| ------ | --------------------- | --------------- | -------------------------- |
| `POST` | `/auth/login`         | Public          | Rider login                |
| `POST` | `/auth/logout`        | Rider Protected | Rider logout               |
| `POST` | `/auth/refresh-token` | Public          | Refresh rider access token |

### Rider Operations

| Method  | Endpoint             | Access          | Description                                 |
| ------- | -------------------- | --------------- | ------------------------------------------- |
| `PATCH` | `/status`            | Rider Protected | Update availability (`available`/`offline`) |
| `POST`  | `/complete-delivery` | Rider Protected | Mark delivery as complete                   |
| `GET`   | `/current-order`     | Rider Protected | Get current assigned order                  |

---

## 9. Webhooks — `/api/v1/webhooks`

| Method | Endpoint  | Access                      | Description                  |
| ------ | --------- | --------------------------- | ---------------------------- |
| `POST` | `/stripe` | Stripe (signature verified) | Handle Stripe payment events |

**Handled Events:**

- `checkout.session.completed` → Confirms order, deducts stock, assigns rider
- `payment_intent.payment_failed` → Marks order as FAILED

---

## 10. Admin — `/api/v1/admin`

> All admin endpoints require JWT authentication **and** `role: "admin"`.

### Admin Health

| Method | Endpoint  | Description         |
| ------ | --------- | ------------------- |
| `GET`  | `/health` | Verify admin access |

### Categories — `/admin/categories`

| Method   | Endpoint | Description                             |
| -------- | -------- | --------------------------------------- |
| `POST`   | `/`      | Create category                         |
| `GET`    | `/`      | List categories (paginated, searchable) |
| `PUT`    | `/:id`   | Update category                         |
| `DELETE` | `/:id`   | Deactivate category                     |

### Products — `/admin/products`

| Method   | Endpoint              | Description                               |
| -------- | --------------------- | ----------------------------------------- |
| `POST`   | `/`                   | Create product                            |
| `GET`    | `/`                   | List all products (paginated, searchable) |
| `PUT`    | `/:id`                | Update product details                    |
| `DELETE` | `/:id`                | Soft-delete product                       |
| `PUT`    | `/:id/stock`          | Update stock at a specific store          |
| `PUT`    | `/:id/store/:storeId` | Update store-specific price               |
| `DELETE` | `/:id/store/:storeId` | Remove product from a store               |

### Orders — `/admin/orders`

| Method  | Endpoint          | Description                                            |
| ------- | ----------------- | ------------------------------------------------------ |
| `GET`   | `/`               | List all orders (filters: status, store, date, search) |
| `GET`   | `/stats/overview` | Revenue, order count, average value, status breakdown  |
| `GET`   | `/:id`            | Get order details                                      |
| `PATCH` | `/:id/status`     | Update order status                                    |

### Stores — `/admin/stores`

| Method | Endpoint | Description                   |
| ------ | -------- | ----------------------------- |
| `POST` | `/`      | Create dark store             |
| `GET`  | `/`      | List all stores (paginated)   |
| `GET`  | `/:id`   | Get store details             |
| `PUT`  | `/:id`   | Update store details/location |

### Riders — `/admin/riders`

| Method   | Endpoint | Description                                   |
| -------- | -------- | --------------------------------------------- |
| `POST`   | `/`      | Create rider                                  |
| `GET`    | `/`      | List riders (filter by store, status, search) |
| `GET`    | `/:id`   | Get rider details                             |
| `PUT`    | `/:id`   | Update rider details                          |
| `DELETE` | `/:id`   | Deactivate rider                              |

---

## Pagination

All paginated endpoints accept:

| Param   | Default | Max | Description    |
| ------- | ------- | --- | -------------- |
| `page`  | 1       | —   | Page number    |
| `limit` | 10      | 100 | Items per page |

**Response Format:**

```json
{
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 48,
    "limit": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

## Error Response Format

```json
{
  "statusCode": 400,
  "data": null,
  "message": "Validation error",
  "success": false,
  "errors": [
    {
      "field": "contactNumber",
      "message": "Please provide a valid Indian contact number"
    }
  ]
}
```

**Error Types Handled:**

- Zod validation errors
- Mongoose validation errors
- Mongoose duplicate key errors (E11000)
- Mongoose cast errors (invalid ObjectId)
- JWT errors (invalid / expired)
- Rate limit exceeded
