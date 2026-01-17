import jwt from 'jsonwebtoken';
import asyncHandler from '../utils/asyncHandler.js';
import { Rider } from '../models/index.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants.js';

/**
 * @desc Helper to generate both tokens and save Refresh Token to DB
 * @param {Object} rider - The Mongoose rider document
 */
const generateAccessAndRefreshTokens = async (rider) => {
  try {
    const accessToken = rider.generateAccessToken();
    const refreshToken = rider.generateRefreshToken();

    rider.refreshToken = refreshToken;
    await rider.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Failed to generate authentication tokens'
    );
  }
};

/**
 * @desc    Login rider
 * @route   POST /api/v1/riders/auth/login
 * @access  Public
 */
export const loginRider = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  // Find rider with password field
  const rider = await Rider.findOne({ phone }).select('+password');

  if (!rider) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      'Invalid phone number or password'
    );
  }

  // Check if account is active
  if (!rider.isActive) {
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      'Rider account is deactivated. Please contact admin.'
    );
  }

  // Verify password
  const isPasswordValid = await rider.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      'Invalid phone number or password'
    );
  }

  // Generate tokens
  const { accessToken, refreshToken } =
    await generateAccessAndRefreshTokens(rider);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  return res
    .status(HTTP_STATUS.OK)
    .cookie('riderAccessToken', accessToken, {
      ...cookieOptions,
      maxAge: Number(process.env.ACCESS_TOKEN_EXPIRY_MS),
    })
    .cookie('riderRefreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: Number(process.env.REFRESH_TOKEN_EXPIRY_MS),
    })
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        {
          rider,
          accessToken,
          refreshToken,
        },
        'Rider logged in successfully'
      )
    );
});

/**
 * @desc    Logout rider
 * @route   POST /api/v1/riders/auth/logout
 * @access  Protected
 */
export const logoutRider = asyncHandler(async (req, res) => {
  // Clear refresh token from database
  await Rider.findByIdAndUpdate(
    req.rider._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    { new: true }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  return res
    .status(HTTP_STATUS.OK)
    .clearCookie('riderAccessToken', cookieOptions)
    .clearCookie('riderRefreshToken', cookieOptions)
    .json(new ApiResponse(HTTP_STATUS.OK, {}, 'Rider logged out successfully'));
});

/**
 * @desc    Refresh rider access token
 * @route   POST /api/v1/riders/auth/refresh-token
 * @access  Public (Requires Refresh Token)
 */
export const refreshRiderToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.riderRefreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Refresh token is required');
  }

  try {
    // Verify the refresh token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // Find the rider with refreshToken explicitly
    const rider = await Rider.findById(decodedToken._id).select('+refreshToken');
    if (!rider) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid refresh token');
    }

    // Check if account is active
    if (!rider.isActive) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        'Rider account is deactivated. Please contact admin.'
      );
    }

    // Check if refresh token matches
    if (incomingRefreshToken !== rider.refreshToken) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        'Refresh token has been revoked'
      );
    }

    // Generate new access token (keep same refresh token)
    const newAccessToken = rider.generateAccessToken();

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    };

    return res
      .status(HTTP_STATUS.OK)
      .cookie('riderAccessToken', newAccessToken, {
        ...cookieOptions,
        maxAge: Number(process.env.ACCESS_TOKEN_EXPIRY_MS),
      })
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          {
            accessToken: newAccessToken,
          },
          'Access token refreshed successfully'
        )
      );
  } catch {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid refresh token');
  }
});
