import { z } from 'zod';

/**
 * Rider login validation schema
 */
export const riderLoginSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

/**
 * Admin: Create rider validation schema
 */
export const createRiderSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  storeId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid store ID')
    .optional(),
});

/**
 * Admin: Update rider validation schema
 */
export const updateRiderSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits')
    .optional(),
  storeId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid store ID')
    .optional(),
  isActive: z.boolean().optional(),
});
