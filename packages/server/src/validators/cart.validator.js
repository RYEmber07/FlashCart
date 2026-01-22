import { z } from 'zod';

/**
 * Zod schema for adding items to cart validation
 */
export const addToCartSchema = z.object({
  productId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Please provide a valid product ID'),

  storeId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Please provide a valid store ID'),

  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(99, 'Quantity cannot exceed 99 items')
    .default(1),
});

/**
 * Zod schema for updating cart items validation
 */
export const updateCartSchema = z.object({
  productId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Please provide a valid product ID'),

  storeId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Please provide a valid store ID'),

  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(0, 'Quantity cannot be negative. Use 0 to remove item')
    .max(99, 'Quantity cannot exceed 99 items'),
});

/**
 * Zod schema for removing cart items validation (for route params)
 */
export const removeCartItemSchema = z.object({
  productId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Please provide a valid product ID'),
});
