/**
 * Checkout & Payment Lifecycle — End-to-End Integration Tests
 *
 * Tests the COMPLETE checkout-to-delivery flow:
 *   1. Unauthenticated requests are rejected
 *   2. Authenticated checkout creates order + returns Stripe payment details
 *   3. Cart is cleared after successful checkout
 *   4. Stripe webhook (payment_intent.succeeded) confirms order + deducts stock
 *   5. Stripe webhook (payment_intent.payment_failed) marks order as FAILED
 *   6. Checkout with empty cart is rejected
 *
 * Stripe SDK is fully mocked (paymentIntents.create + webhooks.constructEvent).
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, jest } from '@jest/globals';

// ── Mock Stripe SDK (must happen before any app/service import) ─────────
const createPaymentIntentMock = jest.fn();
const constructEventMock = jest.fn();

await jest.unstable_mockModule('stripe', () => ({
  default: class Stripe {
    constructor() {
      return {
        paymentIntents: {
          create: createPaymentIntentMock,
        },
        webhooks: {
          constructEvent: constructEventMock,
        },
      };
    }
  },
}));

// ── Dynamic imports (receive the mocked Stripe) ─────────────────────────
const { default: request } = await import('supertest');
const { default: app } = await import('../../app.js');
const {
  User,
  Product,
  Category,
  DarkStore,
  StoreInventory,
} = await import('../../models/index.js');
const { Cart } = await import('../../models/cart.model.js');
const { Order } = await import('../../models/order.model.js');

describe('🧾 Checkout & Payment Lifecycle', () => {
  let userToken = '';
  let productId = '';
  let storeId = '';

  // Shared across describe blocks so the webhook tests can reference
  // the order created by the checkout test.
  let checkoutOrderId = '';
  let failureOrderId = '';

  beforeAll(async () => {
    // Clean slate
    await Promise.all([
      User.deleteMany({ contactNumber: '9000000001' }),
      Category.deleteMany({ name: 'Checkout Test Category' }),
      Product.deleteMany({ name: 'Checkout Test Product' }),
      DarkStore.deleteMany({ name: 'Checkout Test Store' }),
      StoreInventory.deleteMany({}),
      Cart.deleteMany({}),
      Order.deleteMany({}),
    ]);

    // Seed category
    const category = await Category.create({
      name: 'Checkout Test Category',
      image: 'https://via.placeholder.com/200',
      description: 'Test category for checkout',
    });

    // Seed dark store with geo-coordinates
    const store = await DarkStore.create({
      name: 'Checkout Test Store',
      address: 'Checkout Test Address, Sector 50',
      location: {
        type: 'Point',
        coordinates: [77.04, 28.41],
      },
      serviceRadius: 10,
    });
    storeId = store._id;
    // Wait for the 2dsphere index to be built so $geoNear works
    await DarkStore.syncIndexes();

    // Seed product
    const product = await Product.create({
      name: 'Checkout Test Product',
      description: 'A product for checkout testing',
      price: 100,
      unit: '1 pc',
      image: 'https://via.placeholder.com/200',
      category: category._id,
    });
    productId = product._id;

    // Seed inventory (50 units in stock)
    await StoreInventory.create({
      storeId: store._id,
      productId: product._id,
      stock: 50,
      price: 100,
    });


    // Register a test user
    const registerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Checkout Test User',
      contactNumber: '9000000001',
      password: 'CheckoutTestPass123',
    });

    const userId = registerRes.body.data._id;

    // Add delivery address with coordinates near the test store
    await User.findByIdAndUpdate(userId, {
      $push: {
        addresses: {
          label: 'Home',
          addressLine1: 'Checkout Test Address',
          city: 'Gurugram',
          pincode: '122001',
          coordinates: [77.0425, 28.4089],
          isDefault: true,
        },
      },
    });

    // Login to get JWT
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      contactNumber: '9000000001',
      password: 'CheckoutTestPass123',
    });

    userToken = loginRes.body.data.accessToken;

  });

  beforeEach(() => {
    // Configure Stripe mock to return a test PaymentIntent before each test
    createPaymentIntentMock.mockResolvedValue({
      id: 'pi_checkout_test_123',
      client_secret: 'pi_checkout_test_123_secret_456',
    });
  });

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({ contactNumber: '9000000001' }),
      Category.deleteMany({ name: 'Checkout Test Category' }),
      Product.deleteMany({ name: 'Checkout Test Product' }),
      DarkStore.deleteMany({ name: 'Checkout Test Store' }),
      StoreInventory.deleteMany({}),
      Cart.deleteMany({}),
      Order.deleteMany({}),
    ]);
  });

  // ==================== Unauthenticated ====================
  it('should reject unauthenticated checkout requests with 401', async () => {
    const res = await request(app).post('/api/v1/order/checkout').send({});
    expect(res.status).toBe(401);
  });

  // ==================== Successful Checkout ====================
  describe('Authenticated checkout with seeded cart', () => {
    beforeAll(async () => {
      // Add item to cart via the API
      const addRes = await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: productId.toString(),
          storeId: storeId.toString(),
          quantity: 2,
        });

      // Verify item was added
      expect(addRes.status).toBeGreaterThanOrEqual(200);
      expect(addRes.status).toBeLessThan(300);
    });

    it('should create an order with PENDING_PAYMENT status and return Stripe payment details', async () => {
      const res = await request(app)
        .post('/api/v1/order/checkout')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();

      // Verify order details
      const { order, payment } = res.body.data;
      expect(order).toBeDefined();
      expect(order._id).toBeDefined();
      expect(order.status).toBe('PENDING_PAYMENT');
      expect(order.totalAmount).toBeGreaterThan(0);

      // Verify Stripe payment details
      expect(payment).toBeDefined();
      expect(payment.clientSecret).toBe('pi_checkout_test_123_secret_456');
      expect(payment.paymentIntentId).toBe('pi_checkout_test_123');

      // Verify Stripe was called with correct amount
      expect(createPaymentIntentMock).toHaveBeenCalled();
      const stripeCall = createPaymentIntentMock.mock.calls[0][0];
      expect(stripeCall.currency).toBe('inr');
      expect(stripeCall.amount).toBeGreaterThan(0);

      // Save orderId for the webhook tests below
      checkoutOrderId = order._id;
    });

    it('should have cleared the cart after successful checkout', async () => {
      const cartRes = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`);

      expect(cartRes.status).toBe(200);

      // Cart should be empty or have no items
      const cart = cartRes.body.data;
      if (cart && cart.items) {
        expect(cart.items.length).toBe(0);
      }
    });
  });

  // ==================== Webhook: Payment Success ====================
  describe('Stripe webhook — payment confirmation', () => {
    it('should confirm the order and deduct inventory when payment_intent.succeeded fires', async () => {
      // Pre-condition: we have an order from the checkout test above
      expect(checkoutOrderId).toBeTruthy();

      // Snapshot stock BEFORE the webhook
      const inventoryBefore = await StoreInventory.findOne({
        storeId,
        productId,
      });
      const stockBefore = inventoryBefore.stock;

      // Configure constructEvent mock to return a fake succeeded event.
      // This bypasses Stripe's real signature verification while exercising
      // the full webhook handler → order service → stock deduction pipeline.
      constructEventMock.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_checkout_test_123',
            metadata: { orderId: checkoutOrderId },
          },
        },
      });

      // POST to the webhook endpoint (raw body, as Stripe sends it)
      const webhookRes = await request(app)
        .post('/api/v1/webhooks/stripe')
        .set('stripe-signature', 'test_sig_for_mock')
        .set('Content-Type', 'application/json')
        .send(Buffer.from(JSON.stringify({ type: 'payment_intent.succeeded' })));

      expect(webhookRes.status).toBe(200);
      expect(webhookRes.body.received).toBe(true);

      // Verify order transitioned OUT of PENDING_PAYMENT
      const confirmedOrder = await Order.findById(checkoutOrderId);
      expect(confirmedOrder).toBeDefined();
      expect(confirmedOrder.status).not.toBe('PENDING_PAYMENT');

      // Without riders seeded, order.service falls back to CONFIRMED.
      // With riders it would be OUT_FOR_DELIVERY.
      expect(['CONFIRMED', 'OUT_FOR_DELIVERY']).toContain(confirmedOrder.status);

      // Verify paymentIntentId was recorded
      expect(confirmedOrder.paymentIntentId).toBe('pi_checkout_test_123');

      // Verify stock was atomically deducted (2 items were ordered)
      const inventoryAfter = await StoreInventory.findOne({
        storeId,
        productId,
      });
      expect(inventoryAfter.stock).toBe(stockBefore - 2);
    });

    it('should be idempotent — re-processing the same webhook has no side effect', async () => {
      // Snapshot stock before duplicate webhook
      const inventoryBefore = await StoreInventory.findOne({
        storeId,
        productId,
      });

      // Fire the same webhook event again
      constructEventMock.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_checkout_test_123',
            metadata: { orderId: checkoutOrderId },
          },
        },
      });

      const res = await request(app)
        .post('/api/v1/webhooks/stripe')
        .set('stripe-signature', 'test_sig_for_mock')
        .set('Content-Type', 'application/json')
        .send(Buffer.from(JSON.stringify({ type: 'payment_intent.succeeded' })));

      expect(res.status).toBe(200);

      // Order status should remain unchanged (idempotency guard in confirmOrderPayment)
      const order = await Order.findById(checkoutOrderId);
      expect(['CONFIRMED', 'OUT_FOR_DELIVERY']).toContain(order.status);

      // Stock should NOT be deducted again
      const inventoryAfter = await StoreInventory.findOne({
        storeId,
        productId,
      });
      expect(inventoryAfter.stock).toBe(inventoryBefore.stock);
    });
  });

  // ==================== Webhook: Payment Failure ====================
  describe('Stripe webhook — payment failure', () => {
    beforeAll(async () => {
      // Create a second order to test the failure path.
      // Re-add item to cart and checkout again.
      await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: productId.toString(),
          storeId: storeId.toString(),
          quantity: 1,
        });

      createPaymentIntentMock.mockResolvedValue({
        id: 'pi_failure_test_789',
        client_secret: 'pi_failure_test_789_secret',
      });

      const res = await request(app)
        .post('/api/v1/order/checkout')
        .set('Authorization', `Bearer ${userToken}`);

      failureOrderId = res.body.data.order._id;
    });

    it('should mark the order as FAILED when payment_intent.payment_failed fires', async () => {
      expect(failureOrderId).toBeTruthy();

      constructEventMock.mockReturnValue({
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_failure_test_789',
            metadata: { orderId: failureOrderId },
          },
        },
      });

      const res = await request(app)
        .post('/api/v1/webhooks/stripe')
        .set('stripe-signature', 'test_sig_for_mock')
        .set('Content-Type', 'application/json')
        .send(Buffer.from(JSON.stringify({ type: 'payment_intent.payment_failed' })));

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);

      // Verify order is now FAILED
      const failedOrder = await Order.findById(failureOrderId);
      expect(failedOrder.status).toBe('FAILED');
    });
  });

  // ==================== Empty Cart Checkout ====================
  it('should reject checkout when cart is empty', async () => {
    // Cart was cleared by the previous successful checkout
    const res = await request(app)
      .post('/api/v1/order/checkout')
      .set('Authorization', `Bearer ${userToken}`);

    // Should get a 4xx error for empty cart
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
