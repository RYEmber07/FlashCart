import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/apiResponse.js';
import ApiError from '../utils/apiError.js';
import { HTTP_STATUS, RIDER_STATUS } from '../constants.js';
import { completeOrder } from '../services/delivery.service.js';
import { Rider } from '../models/rider.model.js';
import { Order } from '../models/order.model.js';

/**
 * Update rider status (available/offline)
 * @route PATCH /api/riders/status
 */
export const updateRiderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const riderId = req.rider._id;

  // Validate status
  if (!['available', 'offline'].includes(status)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Status must be either available or offline'
    );
  }

  // Don't allow changing to available if rider has current order
  const rider = await Rider.findById(riderId);
  if (status === RIDER_STATUS.AVAILABLE && rider.currentOrder) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Cannot set status to available while delivering an order'
    );
  }

  // Update status
  const updatedRider = await Rider.findByIdAndUpdate(
    riderId,
    { status },
    { new: true }
  );

  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, updatedRider, 'Status updated'));
});

/**
 * Complete delivery
 * @route POST /api/riders/complete-delivery
 */
export const completeDelivery = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const riderId = req.rider._id;

  if (!orderId) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Order ID is required');
  }

  const order = await completeOrder(orderId, riderId);

  res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, order, 'Order delivered successfully')
    );
});

/**
 * Get current order details
 * @route GET /api/riders/current-order
 */
export const getCurrentOrder = asyncHandler(async (req, res) => {
  const riderId = req.rider._id;

  const rider = await Rider.findById(riderId).select('currentOrder status');

  if (!rider.currentOrder) {
    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, null, 'No active order'));
  }

  const order = await Order.findById(rider.currentOrder)
    .select(
      'orderNumber deliveryAddress items totalAmount estimatedDeliveryTime status'
    )
    .populate('items.product', 'name image');

  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, order, 'Current order fetched'));
});
