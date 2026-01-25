import asyncHandler from '../../utils/asyncHandler.js';
import { Order } from '../../models/index.js';
import ApiError from '../../utils/apiError.js';
import ApiResponse from '../../utils/apiResponse.js';
import { HTTP_STATUS, ORDER_STATUS_LIST } from '../../constants.js';
import {
  getPaginationOptions,
  getPaginationMetadata,
} from '../../utils/pagination.js';

/**
 * @desc    Get all orders (Admin) with pagination and filters
 * @route   GET /api/v1/admin/orders
 * @access  Admin
 */
const getAllOrders = asyncHandler(async (req, res) => {
  const { status, storeId, date, search } = req.query;

  const query = {};

  // Filter by Status
  if (status && ORDER_STATUS_LIST.includes(status)) {
    query.status = status;
  }

  // Filter by Store
  if (storeId) {
    query.storeId = storeId;
  }

  // Filter by Date (orders created on a specific date)
  if (date) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    query.createdAt = {
      $gte: startDate,
      $lt: endDate,
    };
  }

  // Search by Order Number
  if (search) {
    query.orderNumber = { $regex: search, $options: 'i' };
  }

  const { skip, limit, page } = getPaginationOptions(req.query);

  const orders = await Order.find(query)
    .populate('user', 'name contactNumber')
    .populate('storeId', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalOrders = await Order.countDocuments(query);
  const pagination = getPaginationMetadata(totalOrders, limit, page);

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        { orders, pagination },
        'Orders retrieved successfully'
      )
    );
});

/**
 * @desc    Get order by ID (Admin)
 * @route   GET /api/v1/admin/orders/:id
 * @access  Admin
 */
const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id)
    .populate('user', 'name contactNumber email')
    .populate('storeId', 'name address')
    .populate('assignedRider', 'name phone')
    .lean();

  if (!order) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found');
  }

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

/**
 * @desc    Update order status (Admin) with proper delivery side-effects
 * @route   PATCH /api/v1/admin/orders/:id/status
 * @access  Admin
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const order = await Order.findById(id);

  if (!order) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found');
  }

  // Use delivery service to handle status transitions with side effects
  const { completeOrder } = await import('../../services/delivery.service.js');
  
  let updatedOrder;
  if (status === 'DELIVERED' && order.assignedRider) {
    // Use delivery service to properly handle delivery completion (releases rider, etc)
    updatedOrder = await completeOrder(id, order.assignedRider);
  } else {
    // For other status changes, update directly but log the change
    updatedOrder = await Order.findByIdAndUpdate(id, { status }, { new: true });
    console.log(`[ADMIN] Order ${id} status changed to ${status} by admin`);
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        updatedOrder,
        'Order status updated successfully'
      )
    );
});

/**
 * @desc    Get order stats (Admin)
 * @route   GET /api/v1/admin/orders/stats/overview
 * @access  Admin
 */
const getOrderStats = asyncHandler(async (req, res) => {
  const stats = await Order.aggregate([
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        avgOrderValue: { $avg: '$totalAmount' },
      },
    },
  ]);

  const statusBreakdown = await Order.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      {
        overview: stats[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          avgOrderValue: 0,
        },
        breakdown: statusBreakdown,
      },
      'Order stats retrieved successfully'
    )
  );
});

export { getAllOrders, getOrderById, updateOrderStatus, getOrderStats };
