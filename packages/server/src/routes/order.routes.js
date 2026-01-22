import express from 'express';
import {
  checkout,
  getOrderHistory,
  getOrderDetails,
} from '../controllers/order.controller.js';
import verifyJWT from '../middlewares/auth.middleware.js';
import { sensitiveLimiter } from '../middlewares/rateLimit.middleware.js';

const router = express.Router();

// All order routes require authentication
router.use(verifyJWT);

/**
 * @route   POST /api/v1/order/checkout
 * @desc    Create order from cart and initiate payment
 * @access  Protected (Rate limited)
 * @middleware sensitiveLimiter
 */
router.post('/checkout', sensitiveLimiter, checkout);

/**
 * @route   GET /api/v1/order/history
 * @desc    Get user's order history with pagination
 * @access  Protected
 */
router.get('/history', getOrderHistory);

/**
 * @route   GET /api/v1/order/:id
 * @desc    Get specific order details
 * @access  Protected
 */
router.get('/:id', getOrderDetails);

export default router;
