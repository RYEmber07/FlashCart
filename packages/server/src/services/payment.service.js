import Stripe from 'stripe';
import { Order } from '../models/order.model.js';
import ApiError from '../utils/apiError.js';
import { HTTP_STATUS, ORDER_STATUS } from '../constants.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Creates a Stripe PaymentIntent for an order.
 * Links the payment intent to the order and returns client secret for frontend processing.
 *
 * @param {string} orderId - MongoDB ObjectId of the order
 * @returns {Promise<Object>} Object containing Stripe payment details
 * @returns {string} return.clientSecret - Stripe client secret for frontend payment confirmation
 * @returns {string} return.paymentIntentId - Stripe payment intent ID for tracking
 * @throws {ApiError} If order not found or not in PENDING_PAYMENT status
 */
export const createPaymentIntent = async (orderId) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found');
  }

  if (order.status !== ORDER_STATUS.PENDING_PAYMENT) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Order is not in pending payment status'
    );
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100), // convert to smallest currency unit
      currency: 'inr',
      metadata: {
        orderId: order._id.toString(),
        userId: order.user.toString(),
      },
    });

    // Link the Stripe ID to our database record
    order.paymentIntentId = paymentIntent.id;
    await order.save();

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Failed to initiate payment with Stripe'
    );
  }
};
