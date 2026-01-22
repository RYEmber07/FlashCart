import { z } from 'zod';
import { ORDER_STATUS_LIST } from '../constants.js';

/**
 * Schema for updating order status
 * Validates that the new status is a valid order status
 */
export const updateOrderStatusSchema = z.object({
  status: z
    .enum(ORDER_STATUS_LIST, {
      errorMap: () => ({ message: 'Invalid order status' }),
    })
    .describe('New order status'),
});
