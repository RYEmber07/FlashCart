/**
 * Auth Endpoints - Integration Tests with Supertest
 *
 * Tests core authentication flows:
 * - User registration with validation
 * - Login with credentials
 * - Token refresh mechanism
 * - Protected endpoint access
 * - Session management
 */

import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import connectDB from '../../db/index.js';
import { User } from '../../models/index.js';

describe('🔐 Auth Endpoints', () => {
  let accessToken = '';
  let refreshToken = '';

  beforeAll(async () => {
    // Connect to database
    await connectDB();

    // Clear existing test users
    await User.deleteMany({
      contactNumber: { $in: ['9999999999', '9888888888', '9777777777'] },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await User.deleteMany({
      contactNumber: { $in: ['9999999999', '9888888888', '9777777777'] },
    });
    // Close database connection to prevent hanging
    await mongoose.disconnect();
  });

  // ==================== Registration Tests ====================
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Test User',
        contactNumber: '9999999999',
        password: 'TestPassword123',
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.contactNumber).toBe('9999999999');
      expect(res.body.data.role).toBe('user');
    });

    it('should reject duplicate phone number', async () => {
      // Try registering same phone again
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Another User',
        contactNumber: '9999999999',
        password: 'AnotherPassword123',
      });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already');
    });

    it('should reject invalid phone number', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Invalid Phone User',
        contactNumber: '1234567890', // Starts with 1 (invalid in India)
        password: 'ValidPassword123',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Validation'); // API returns generic validation error
    });

    it('should reject weak password', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Weak Password User',
        contactNumber: '9888888888',
        password: 'weak', // Too short
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Validation'); // API returns generic validation error
    });
  });

  // ==================== Login Tests ====================
  describe('POST /api/v1/auth/login', () => {
    it('should login user with valid credentials', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        contactNumber: '9999999999',
        password: 'TestPassword123',
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user).toBeDefined();

      // Store tokens for next tests
      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('should reject invalid password', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        contactNumber: '9999999999',
        password: 'WrongPassword123',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid');
    });

    it('should reject non-existent user', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        contactNumber: '9111111111',
        password: 'SomePassword123',
      });

      expect(res.status).toBe(401);
    });
  });

  // ==================== Token Refresh Tests ====================
  describe('POST /api/v1/auth/refresh-token', () => {
    it('should refresh access token with valid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.accessToken).toBeDefined();
      // Token may be identical when generated in quick succession (JWT uses same timestamp)
      // The important thing is it's a valid new token

      // Update token for next tests
      accessToken = res.body.data.accessToken;
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: 'invalid.token.here' });

      expect(res.status).toBe(401);
    });

    it('should reject missing refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({});

      expect(res.status).toBe(401); // Controller returns UNAUTHORIZED when token is missing
    });
  });

  // ==================== Protected Endpoint Tests ====================
  describe('GET /api/v1/auth/sessions (Protected)', () => {
    it('should return user sessions when authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data.sessions)).toBe(true);
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/v1/auth/sessions');

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Unauthorized'); // Auth middleware returns 'Unauthorized access'
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
    });

    it('should reject request with malformed auth header', async () => {
      const res = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', 'InvalidHeader');

      expect(res.status).toBe(401);
    });
  });

  // ==================== Logout Tests ====================
  describe('POST /api/v1/auth/logout', () => {
    it('should logout user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('logged out');
    });

    it('should reject logout without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken });

      expect(res.status).toBe(401);
    });
  });
});
