import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/apiError.js';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants.js';
import { verifyToken } from '../utils/jwt.js';
import { Rider } from '../models/rider.model.js';

/**
 * Verify rider JWT token
 * Simplified authentication for riders (similar to user auth)
 */
const verifyRiderAuth = asyncHandler(async (req, res, next) => {
  // Extraction
  const token =
    req.cookies?.riderAccessToken ||
    req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.UNAUTHORIZED);
  }

  // Verification
  const decoded = verifyToken(token, process.env.ACCESS_TOKEN_SECRET);

  // Get rider from database
  const rider = await Rider.findById(decoded._id);

  if (!rider) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Rider no longer exists');
  }

  if (!rider.isActive) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Rider account is deactivated');
  }

  // Attach rider to request
  req.rider = rider;
  next();
});

export default verifyRiderAuth;
