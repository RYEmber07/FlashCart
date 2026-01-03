import asyncHandler from '../utils/asyncHandler.js';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants.js';
import ApiError from '../utils/apiError.js';
import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/index.js';

const verifyJWT = asyncHandler(async (req, res, next) => {
  // Extraction
  const token =
    req.cookies?.accessToken ||
    req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.UNAUTHORIZED);
  }

  // Verification
  const decoded = verifyToken(token, process.env.ACCESS_TOKEN_SECRET);

  const user = await User.findById(decoded._id).select(
    '-password -refreshToken'
  );

  if (!user) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'User no longer exists');
  }

  if (!user.isActive) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Your account is deactivated');
  }

  // Identity Attachment
  req.user = user;

  next();
});

export default verifyJWT;
