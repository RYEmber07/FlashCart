import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/apiError.js';
import { HTTP_STATUS } from '../constants.js';

/**
 * Middleware to verify if the user has admin role
 * Must be used AFTER verifyJWT middleware
 */
export const verifyAdmin = asyncHandler(async (req, res, next) => {
  // Check if user exists on request (added by verifyJWT)
  if (!req.user) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Authentication required');
  }

  // Check user role
  if (req.user.role !== 'admin') {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Admin access required');
  }

  next();
});
