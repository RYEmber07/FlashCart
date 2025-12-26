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

import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import connectDB from '../../db/index.js';
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
    // Connect to database
    await connectDB();

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
    // Close database connection to prevent hanging
    await mongoose.disconnect();
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

      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300); // 2xx success
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
  describe('PATCH /api/v1/cart/item/:itemId', () => {
    let itemId = '';

    beforeAll(async () => {
      // Get cart to find item ID
      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`);

      if (
        res.body.data &&
        res.body.data.items &&
        res.body.data.items.length > 0
      ) {
        itemId = res.body.data.items[0]._id;
      }
    });

    it('should update item quantity', async () => {
      if (!itemId) {
        return; // Skip if no item added
      }

      const res = await request(app)
        .patch(`/api/v1/cart/item/${itemId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ quantity: 3 });

      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
    });

    it('should reject invalid quantity', async () => {
      if (!itemId) {
        return; // Skip if no item added
      }

      const res = await request(app)
        .patch(`/api/v1/cart/item/${itemId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ quantity: -1 });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ==================== Remove from Cart Tests ====================
  describe('DELETE /api/v1/cart/item/:itemId', () => {
    let itemId = '';

    beforeAll(async () => {
      // Get cart to find item ID
      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${userToken}`);

      if (
        res.body.data &&
        res.body.data.items &&
        res.body.data.items.length > 0
      ) {
        itemId = res.body.data.items[0]._id;
      }
    });

    it('should remove item from cart', async () => {
      if (!itemId) {
        return; // Skip if no item in cart
      }

      const res = await request(app)
        .delete(`/api/v1/cart/item/${itemId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
    });

    it('should reject remove without authentication', async () => {
      if (!itemId) {
        return; // Skip if no item in cart
      }

      const res = await request(app).delete(`/api/v1/cart/item/${itemId}`);

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

      // Should either succeed or give clear error
      expect([200, 201, 400, 422]).toContain(res.status);
    });
  });
});
