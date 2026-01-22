import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants.js';
import * as orderService from '../services/order.service.js';
import * as paymentService from '../services/payment.service.js';

/**
 * @desc Create order from cart and initiate payment
 * @route POST /api/v1/order/checkout
 */
const checkout = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // 1. Create Order (Atomic Transaction handled inside Service)
  const { order } = await orderService.createOrderFromCart(userId);

  // 2. Initiate Stripe Payment
  try {
    const { clientSecret, paymentIntentId } =
      await paymentService.createPaymentIntent(order._id);

    const responseData = {
      order: {
        _id: order._id,
        totalAmount: order.totalAmount,
        status: order.status,
      },
      payment: { clientSecret, paymentIntentId },
    };

    return res
      .status(HTTP_STATUS.CREATED)
      .json(
        new ApiResponse(HTTP_STATUS.CREATED, responseData, 'Order created.')
      );
  } catch {
    // If Stripe fails, the Order exists in DB (PENDING).
    // User can retry payment from Order History.
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Order created but payment gateway failed. Please retry from your Order History.'
    );
  }
});

/**
 * @desc Get user's order history with standardized pagination
 * @route GET /api/v1/order/history
 */
const getOrderHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Pass req.query directly to service.
  const { orders, pagination } = await orderService.getOrderHistory(
    userId,
    req.query
  );

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        { orders, pagination },
        'Order history retrieved successfully'
      )
    );
});

/**
 * @desc Get specific order details
 * @route GET /api/v1/order/:id
 */
const getOrderDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const order = await orderService.getOrderDetails(id, userId);

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        order,
        'Order details retrieved successfully'
      )
    );
});

export { checkout, getOrderHistory, getOrderDetails };
