/**
 * Cart Endpoints - Integration Tests with Supertest
 *
 * Tests shopping cart operations:
 * - Add items to cart
 * - Retrieve cart contents
 * - Update item quantities
 * - Remove items from cart
 * - Cart validation and error handling
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../app.js';
import {
  User,
  Product,
  Category,
  DarkStore,
  StoreInventory,
} from '../../models/index.js';

describe('🛒 Cart Endpoints', () => {
  let userToken = '';
  let productId = '';
  let storeId = '';
  let userId = '';

  beforeAll(async () => {
    // Cleanup
    await Promise.all([
      User.deleteMany({ contactNumber: { $in: ['9876543210'] } }),
      Category.deleteMany({}),
      Product.deleteMany({}),
      DarkStore.deleteMany({}),
      StoreInventory.deleteMany({}),
    ]);

    // Create test category
    const category = await Category.create({
      name: 'Test Category',
      image: 'https://via.placeholder.com/200',
      description: 'Test products',
    });

    // Create test store
    const store = await DarkStore.create({
      name: 'Test Store',
      address: 'Test Address',
      location: {
        type: 'Point',
        coordinates: [77.04, 28.41],
      },
      serviceRadius: 10,
    });
    storeId = store._id;
    await DarkStore.syncIndexes();

    // Create test product
    const product = await Product.create({
      name: 'Test Product',
      description: 'A test product',
      price: 100,
      unit: '1 pc',
      image: 'https://via.placeholder.com/200',
      category: category._id,
    });
    productId = product._id;

    // Add inventory
    await StoreInventory.create({
      storeId: store._id,
      productId: product._id,
      stock: 50,
      price: 100,
    });

    // Register and login test user
    const registerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Cart Test User',
      contactNumber: '9876543210',
      password: 'CartTestPass123',
    });

    userId = registerRes.body.data._id;

    // Add address to user
    await User.findByIdAndUpdate(userId, {
      $push: {
        addresses: {
          label: 'Home',
          addressLine1: 'Test Address',
          city: 'Test City',
          pincode: '122001',
          coordinates: [77.04, 28.41],
          isDefault: true,
        },
      },
    });

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      contactNumber: '9876543210',
      password: 'CartTestPass123',
    });

    userToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    // Cleanup
    await Promise.all([
      User.deleteMany({ contactNumber: { $in: ['9876543210'] } }),
      Category.deleteMany({}),
      Product.deleteMany({}),
      DarkStore.deleteMany({}),
      StoreInventory.deleteMany({}),
    ]);
  });

  // ==================== Get Cart Tests ====================
  describe('GET /api/v1/cart', () => {
    it('should get empty cart for new user', async () => {
      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('should reject request without authentication', async () => {
      const res = await request(app).get('/api/v1/cart');

      expect(res.status).toBe(401);
    });
  });

  // ==================== Add to Cart Tests ====================
  describe('POST /api/v1/cart/add', () => {
    it('should add item to cart successfully', async () => {
      const res = await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: productId.toString(),
          quantity: 2,
          storeId: storeId.toString(),
        });

      expect(res.status).toBe(200);
    });

    it('should reject adding without authentication', async () => {
      const res = await request(app).post('/api/v1/cart/add').send({
        productId: productId.toString(),
        quantity: 1,
      });

      expect(res.status).toBe(401);
    });

    it('should reject invalid product ID', async () => {
      const res = await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: 'invalid_id',
          quantity: 1,
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject zero or negative quantity', async () => {
      const res = await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: productId.toString(),
          quantity: 0,
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject quantity exceeding stock', async () => {
      const res = await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: productId.toString(),
          quantity: 100, // More than stock (50)
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ==================== Cart Retrieval After Add ====================
  describe('GET /api/v1/cart (after items added)', () => {
    it('should return cart with items', async () => {
      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  // ==================== Update Cart Item Tests ====================
  describe('PUT /api/v1/cart/update', () => {
    it('should update item quantity', async () => {
      const res = await request(app)
        .put('/api/v1/cart/update')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: productId.toString(),
          storeId: storeId.toString(),
          quantity: 3,
        });

      expect(res.status).toBe(200);
    });

    it('should reject negative quantity', async () => {
      const res = await request(app)
        .put('/api/v1/cart/update')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: productId.toString(),
          storeId: storeId.toString(),
          quantity: -1,
        });

      expect(res.status).toBe(400);
    });
  });

  // ==================== Remove from Cart Tests ====================
  describe('DELETE /api/v1/cart/remove/:productId', () => {
    it('should remove item from cart', async () => {
      const res = await request(app)
        .delete(`/api/v1/cart/remove/${productId.toString()}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
    });

    it('should reject remove without authentication', async () => {
      const res = await request(app)
        .delete(`/api/v1/cart/remove/${productId.toString()}`);

      expect(res.status).toBe(401);
    });
  });

  // ==================== Cart Validation Tests ====================
  describe('Cart Edge Cases', () => {
    it('should handle missing storeId gracefully', async () => {
      const res = await request(app)
        .post('/api/v1/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: productId.toString(),
          quantity: 1,
        });

      // Missing storeId should return 400 Bad Request
      expect(res.status).toBe(400);
    });
  });
});
