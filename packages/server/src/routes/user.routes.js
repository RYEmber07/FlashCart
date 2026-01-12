import express from 'express';
import {
  getCurrentUser,
  addAddress,
  updateAddress,
  deleteAddress,
  updateAccountDetails,
} from '../controllers/user.controller.js';
import validate from '../middlewares/validate.middleware.js';
import verifyJWT from '../middlewares/auth.middleware.js';
import {
  addressSchema,
  updateAccountSchema,
} from '../validators/user.validator.js';
import { sensitiveLimiter } from '../middlewares/rateLimit.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(verifyJWT);

/**
 * @route   GET /api/v1/user/me
 * @desc    Get current user profile with addresses
 * @access  Protected
 * @middleware verifyJWT
 */
router.get('/me', getCurrentUser);

/**
 * @route   PATCH /api/v1/user/me
 * @desc    Update account details (partial update)
 * @access  Protected (Rate limited)
 * @middleware verifyJWT, sensitiveLimiter, validate(updateAccountSchema)
 */
router.patch(
  '/me',
  sensitiveLimiter,
  validate(updateAccountSchema),
  updateAccountDetails
);

/**
 * @route   POST /api/v1/user/address
 * @desc    Add new address to user profile
 * @access  Protected (Rate limited)
 * @middleware verifyJWT, sensitiveLimiter, validate(addressSchema)
 */
router.post('/address', sensitiveLimiter, validate(addressSchema), addAddress);

/**
 * @route   PATCH /api/v1/user/address/:addressId
 * @desc    Update specific address (partial update)
 * @access  Protected (Rate limited)
 * @middleware verifyJWT, sensitiveLimiter, validate(addressSchema.partial())
 */
router.patch(
  '/address/:addressId',
  sensitiveLimiter,
  validate(addressSchema.partial()),
  updateAddress
);

/**
 * @route   DELETE /api/v1/user/address/:addressId
 * @desc    Delete specific address from user profile
 * @access  Protected (Rate limited)
 * @middleware verifyJWT, sensitiveLimiter
 */
router.delete('/address/:addressId', sensitiveLimiter, deleteAddress);

export default router;
