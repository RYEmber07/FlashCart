import { z } from 'zod';

/**
 * Zod schema for user registration validation
 */
export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(50, 'Name must be at most 50 characters long')
    .trim(),

  contactNumber: z
    .string()
    .length(10, 'Contact number must be exactly 10 digits')
    .regex(/^[6-9]\d{9}$/, 'Please provide a valid Indian contact number'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password must be at most 100 characters long'),
});

/**
 * Zod schema for user login validation
 */
export const loginSchema = z.object({
  contactNumber: z
    .string()
    .length(10, 'Contact number must be exactly 10 digits')
    .regex(/^[6-9]\d{9}$/, 'Please provide a valid Indian contact number'),

  password: z
    .string()
    .min(1, 'Password is required')
    .max(100, 'Password must be at most 100 characters long'),
});
