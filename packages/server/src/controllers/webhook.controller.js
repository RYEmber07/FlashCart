import Stripe from 'stripe';
import asyncHandler from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants.js';
import * as orderService from '../services/order.service.js';
import { getIO } from '../utils/socket.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * @desc    Handle incoming Stripe Webhook events.
 * @route   POST /api/v1/webhooks/stripe
 * @access  Public (Signature Verified)
 *
 * @param   {Object} req - Express request object containing raw body and signature header.
 * @param   {Object} res - Express response object.
 * @returns {JSON} Returns status 200 to acknowledge receipt to Stripe.
 */
export const handleStripeWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify the Stripe signature using the raw body to ensure authenticity.
    // If verification fails, it means the request might be spoofed.
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(
      `[SECURITY] Webhook Signature Verification Failed: ${err.message}`
    );

    // Return 400 immediately to specific signature errors.
    // Stripe will note this failure and we avoid processing untrusted data.
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .send(`Webhook Error: ${err.message}`);
  }

  // Handle specific event types relevant to our payment intent flow
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata?.orderId;
      const paymentIntentId = paymentIntent.id;

      if (orderId) {
        // Confirm the order and deduct stock atomically.
        // If this throws an error (e.g., DB down), we let it bubble up.
        // The global error handler will send a 500, causing Stripe to retry later.
        await orderService.confirmOrderPayment(orderId, paymentIntentId);
        console.log(
          `[INFO] Order ${orderId} successfully confirmed via webhook.`
        );

        // Emit real-time update
        try {
          const io = getIO();
          io.to(orderId).emit('payment_status', {
            status: 'CONFIRMED',
            message: 'Payment received successfully',
          });
        } catch (socketError) {
          console.error(
            `[SOCKET_ERROR] Failed to emit payment status: ${socketError.message}`
          );
        }
      } else {
        console.error(
          `[DATA_ERROR] Webhook received but 'orderId' missing in metadata.`
        );
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata?.orderId;

      if (orderId) {
        // Mark the order as FAILED so the user knows to retry.
        // We do not throw here because failing to update status isn't worth a retry loop.
        await orderService.handlePaymentFailure(orderId);
        console.log(`[INFO] Order ${orderId} marked as failed via webhook.`);

        // Emit real-time update
        try {
          const io = getIO();
          io.to(orderId).emit('payment_status', {
            status: 'FAILED',
            message: 'Payment failed',
          });
        } catch (socketError) {
          console.error(
            `[SOCKET_ERROR] Failed to emit payment status: ${socketError.message}`
          );
        }
      }
      break;
    }

    default:
      console.log(`[INFO] Unhandled event type: ${event.type}`);
  }

  // Return 200 OK to Stripe so they stop sending this specific event.
  return res.status(HTTP_STATUS.OK).json({ received: true });
});
