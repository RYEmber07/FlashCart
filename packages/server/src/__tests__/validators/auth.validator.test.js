import { describe, it, expect } from '@jest/globals';
import {
  registerSchema,
  loginSchema,
} from '../../validators/auth.validator.js';

describe('Auth Validator', () => {
  it('should validate correct registration data', () => {
    const validData = {
      name: 'Test User',
      contactNumber: '9876543210',
      password: 'SecurePass1',
    };

    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid phone number', () => {
    const invalidData = {
      name: 'Test User',
      contactNumber: '1234567890', // Invalid: starts with 1
      password: 'SecurePass1',
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject weak password', () => {
    const invalidData = {
      name: 'Test User',
      contactNumber: '9876543210',
      password: 'weak', // Too short, no numbers
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should validate correct login data', () => {
    const validData = {
      contactNumber: '9876543210',
      password: 'SecurePass1',
    };

    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});
