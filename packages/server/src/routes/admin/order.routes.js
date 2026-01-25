import { Router } from 'express';
import {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  getOrderStats,
} from '../../controllers/admin/order.controller.js';
import validate from '../../middlewares/validate.middleware.js';
import { updateOrderStatusSchema } from '../../validators/order.validator.js';

const router = Router();

/**
 * @route   GET /api/v1/admin/orders/stats/overview
 * @desc    Get order statistics (Must be before /:id)
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter
 */
router.get('/stats/overview', getOrderStats);

/**
 * @route   GET /api/v1/admin/orders
 * @desc    Get all orders with optional filters
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter
 */
router.get('/', getAllOrders);

/**
 * @route   GET /api/v1/admin/orders/:id
 * @desc    Get order details by ID
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter
 */
router.get('/:id', getOrderById);

/**
 * @route   PATCH /api/v1/admin/orders/:id/status
 * @desc    Update order status
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter, validate(updateOrderStatusSchema)
 */
router.patch(
  '/:id/status',
  validate(updateOrderStatusSchema),
  updateOrderStatus
);

export default router;
