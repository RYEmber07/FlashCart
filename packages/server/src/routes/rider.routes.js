import { Router } from 'express';
import {
  loginRider,
  logoutRider,
  refreshRiderToken,
} from '../controllers/riderAuth.controller.js';
import {
  updateRiderStatus,
  completeDelivery,
  getCurrentOrder,
} from '../controllers/rider.controller.js';
import verifyRiderAuth from '../middlewares/riderAuth.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { riderLoginSchema } from '../validators/rider.validator.js';
import { sensitiveLimiter } from '../middlewares/rateLimit.middleware.js';

const router = Router();

// Auth routes (public)

/**
 * @route   POST /api/v1/riders/auth/login
 * @desc    Rider login with phone/password
 * @access  Public (Rate limited)
 * @middleware sensitiveLimiter, validate(riderLoginSchema)
 */
router.post(
  '/auth/login',
  sensitiveLimiter,
  validate(riderLoginSchema),
  loginRider
);

/**
 * @route   POST /api/v1/riders/auth/refresh-token
 * @desc    Refresh rider access token
 * @access  Public (Rate limited)
 * @middleware sensitiveLimiter
 */
router.post('/auth/refresh-token', sensitiveLimiter, refreshRiderToken);

// Protected routes (require authentication)
router.use(verifyRiderAuth);

/**
 * @route   POST /api/v1/riders/auth/logout
 * @desc    Logout rider
 * @access  Protected (Rider)
 * @middleware verifyRiderAuth
 */
router.post('/auth/logout', logoutRider);

/**
 * @route   PATCH /api/v1/riders/status
 * @desc    Update rider availability status
 * @access  Protected (Rider)
 * @middleware verifyRiderAuth
 */
router.patch('/status', updateRiderStatus);

/**
 * @route   POST /api/v1/riders/complete-delivery
 * @desc    Mark current order as delivered
 * @access  Protected (Rider)
 * @middleware verifyRiderAuth
 */
router.post('/complete-delivery', completeDelivery);

/**
 * @route   GET /api/v1/riders/current-order
 * @desc    Get currently assigned active order
 * @access  Protected (Rider)
 * @middleware verifyRiderAuth
 */
router.get('/current-order', getCurrentOrder);

export default router;
