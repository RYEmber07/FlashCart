import { Order } from '../models/order.model.js';
import { releaseRider } from './rider.service.js';
import { ORDER_STATUS } from '../constants.js';
import ApiError from '../utils/apiError.js';
import { HTTP_STATUS } from '../constants.js';
import { runInTransaction, withSession } from '../utils/transaction.js';

/**
 * Complete order delivery
 * Updates order status to DELIVERED and releases rider
 *
 * @param {string} orderId - Order ID
 * @param {string} riderId - Rider ID (for verification)
 * @returns {Promise<Object>} Updated order
 */
export const completeOrder = async (orderId, riderId) => {
  return await runInTransaction(async (session) => {
    // Find and update order (verify rider assignment)
    const order = await withSession(
      Order.findOneAndUpdate(
        {
          _id: orderId,
          assignedRider: riderId,
          status: ORDER_STATUS.OUT_FOR_DELIVERY,
        },
        {
          status: ORDER_STATUS.DELIVERED,
        },
        { new: true }
      ),
      session
    );

    if (!order) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        'Order not found or already delivered'
      );
    }

    // Release rider back to available
    await releaseRider(riderId, session);

    console.log(`[ORDER] Order ${orderId} delivered by rider ${riderId}`);

    return order;
  });
};
