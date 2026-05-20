/**
 * Admin RBAC — Authorization Boundary Tests
 *
 * Verifies that role-based access control actually works:
 *   - A regular user CANNOT access admin-only endpoints (expects 403 Forbidden)
 *   - An admin user CAN access admin-only endpoints (expects 200 OK)
 *   - An unauthenticated request is rejected (expects 401 Unauthorized)
 *
 * Uses the /api/v1/admin/health endpoint as a lightweight probe —
 * no database mutations needed, purely tests the auth middleware chain.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../app.js';
import { User } from '../../models/index.js';

describe('🔒 Admin RBAC Boundary', () => {
  let regularUserToken = '';
  let adminToken = '';

  const TEST_REGULAR = {
    name: 'RBAC Regular User',
    contactNumber: '9000000002',
    password: 'RegularPass123',
  };

  const TEST_ADMIN = {
    name: 'RBAC Admin User',
    contactNumber: '9000000003',
    password: 'AdminPass123',
  };

  beforeAll(async () => {
    // Clean any leftover test users
    await User.deleteMany({
      contactNumber: { $in: [TEST_REGULAR.contactNumber, TEST_ADMIN.contactNumber] },
    });

    // 1. Create and login a REGULAR user (via API)
    await request(app).post('/api/v1/auth/register').send(TEST_REGULAR);
    const regularLogin = await request(app).post('/api/v1/auth/login').send({
      contactNumber: TEST_REGULAR.contactNumber,
      password: TEST_REGULAR.password,
    });
    regularUserToken = regularLogin.body.data.accessToken;

    // 2. Create an ADMIN user (via model, since register defaults to 'user' role)
    await User.create({ ...TEST_ADMIN, role: 'admin' });
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      contactNumber: TEST_ADMIN.contactNumber,
      password: TEST_ADMIN.password,
    });
    adminToken = adminLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await User.deleteMany({
      contactNumber: { $in: [TEST_REGULAR.contactNumber, TEST_ADMIN.contactNumber] },
    });
  });

  // ==================== Unauthenticated ====================
  it('should reject unauthenticated requests to admin endpoints with 401', async () => {
    const res = await request(app).get('/api/v1/admin/health');
    expect(res.status).toBe(401);
  });

  // ==================== Regular User (Forbidden) ====================
  it('should reject regular users from admin endpoints with 403', async () => {
    const res = await request(app)
      .get('/api/v1/admin/health')
      .set('Authorization', `Bearer ${regularUserToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Admin');
  });

  // ==================== Admin User (Granted) ====================
  it('should grant admin users access to admin endpoints with 200', async () => {
    const res = await request(app)
      .get('/api/v1/admin/health')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Admin access granted');
  });
});
