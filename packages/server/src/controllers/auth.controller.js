import jwt from 'jsonwebtoken';
import asyncHandler from '../utils/asyncHandler.js';
import { User } from '../models/index.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import { HTTP_STATUS, MAX_SESSIONS } from '../constants.js';

/**
 * @desc Helper to generate tokens and create a new session
 * @param {Object} user - The Mongoose user document
 * @param {string} deviceInfo - User agent string
 * @param {string} ipAddress - Client IP address
 */
const generateAccessAndRefreshTokens = async (user, deviceInfo, ipAddress) => {
  try {
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Remove oldest session if limit exceeded
    if (user.sessions.length >= MAX_SESSIONS) {
      user.sessions.sort((a, b) => a.lastUsedAt - b.lastUsedAt);
      user.sessions.shift(); // Remove oldest
    }

    // Add new session
    user.sessions.push({
      refreshToken,
      deviceInfo: deviceInfo || 'Unknown Device',
      ipAddress: ipAddress || 'Unknown',
      createdAt: new Date(),
      lastUsedAt: new Date(),
    });

    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch {
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Failed to generate authentication tokens'
    );
  }
};

/**
 * @desc    Register a new user.
 * @route   POST /api/v1/auth/register
 * @access  Public
 *
 * @param   {string} req.body.name - User's full name.
 * @param   {string} req.body.contactNumber - User's 10-digit login number.
 * @param   {string} req.body.password - User's secure password.
 * @returns {JSON} Returns the created user object (excluding sensitive fields).
 */
const registerUser = asyncHandler(async (req, res) => {
  const { name, contactNumber, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ contactNumber });
  if (existingUser) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      'User with this contact number already exists'
    );
  }

  // Create new user
  const user = await User.create({
    name,
    contactNumber,
    password,
  });

  // Sensitive fields (password, etc.) excluded via User model toJSON serializer
  return res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(HTTP_STATUS.CREATED, user, 'User registered successfully')
    );
});

/**
 * @desc    Login user.
 * @route   POST /api/v1/auth/login
 * @access  Public
 *
 * @param   {string} req.body.contactNumber - User's login number.
 * @param   {string} req.body.password - User's password.
 * @returns {JSON} Returns access/refresh tokens and user details.
 */
const loginUser = asyncHandler(async (req, res) => {
  const { contactNumber, password } = req.body;

  // Find user with password field (single DB call)
  const user = await User.findOne({ contactNumber }).select('+password');

  if (!user) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      'Invalid contact number or password'
    );
  }

  // Check if account is deleted
  if (user.isDeleted) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'This account has been deleted');
  }

  // Check if account is active
  if (!user.isActive) {
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      'This account has been deactivated. Please contact support.'
    );
  }

  // Verify password
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      'Invalid contact number or password'
    );
  }

  // Get device info and IP
  const deviceInfo = req.headers['user-agent'];
  const ipAddress = req.ip || req.connection.remoteAddress;

  // Generate tokens and create session
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user,
    deviceInfo,
    ipAddress
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  return res
    .status(HTTP_STATUS.OK)
    .cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: Number(process.env.ACCESS_TOKEN_EXPIRY_MS),
    })
    .cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: Number(process.env.REFRESH_TOKEN_EXPIRY_MS),
    })
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        {
          user, // toJSON method automatically removes sensitive fields
          accessToken,
          refreshToken,
        },
        'User logged in successfully'
      )
    );
});

/**
 * @desc    Logout user from current device.
 * @route   POST /api/v1/auth/logout
 * @access  Protected
 *
 * @returns {JSON} Success message and clears cookies.
 */
const logoutUser = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (refreshToken) {
    // Remove only the current session
    await User.findByIdAndUpdate(req.user._id, {
      $pull: {
        sessions: { refreshToken },
      },
    });
  }

  // Clear cookies
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  return res
    .status(HTTP_STATUS.OK)
    .clearCookie('accessToken', cookieOptions)
    .clearCookie('refreshToken', cookieOptions)
    .json(new ApiResponse(HTTP_STATUS.OK, {}, 'User logged out successfully'));
});

/**
 * @desc    Refresh access token.
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public (Requires Refresh Token)
 *
 * @param   {string} [req.cookies.refreshToken] - Refresh token in httpOnly cookie.
 * @param   {string} [req.body.refreshToken] - Refresh token in body (fallback).
 * @returns {JSON} New access and refresh tokens.
 */
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Refresh token is required');
  }

  // try-catch to handle invalid or expired token
  try {
    // Verify the refresh token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // Find the user
    const user = await User.findById(decodedToken._id);
    if (!user) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid refresh token');
    }

    // Check if account is deleted
    if (user.isDeleted) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        'This account has been deleted'
      );
    }

    // Check if account is active
    if (!user.isActive) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        'This account has been deactivated. Please contact support.'
      );
    }

    // Find the session with this refresh token
    const session = user.sessions.find(
      (s) => s.refreshToken === incomingRefreshToken
    );

    if (!session) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        'Refresh token has been revoked'
      );
    }

    // Update lastUsedAt for this session
    session.lastUsedAt = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate new access token (keep same refresh token)
    const newAccessToken = user.generateAccessToken();

    // Cookie options
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    };

    return res
      .status(HTTP_STATUS.OK)
      .cookie('accessToken', newAccessToken, {
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

/**
 * @desc    Get all active sessions for current user
 * @route   GET /api/v1/auth/sessions
 * @access  Protected
 */
const getSessions = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('sessions');

  // Format sessions for response (hide refresh tokens)
  const sessions = user.sessions.map((session) => ({
    _id: session._id,
    deviceInfo: session.deviceInfo,
    ipAddress: session.ipAddress,
    createdAt: session.createdAt,
    lastUsedAt: session.lastUsedAt,
  }));

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        { sessions },
        'Sessions fetched successfully'
      )
    );
});

/**
 * @desc    Logout from a specific session/device
 * @route   DELETE /api/v1/auth/sessions/:sessionId
 * @access  Protected
 */
const logoutSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $pull: {
        sessions: { _id: sessionId },
      },
    },
    { new: true }
  );

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Session not found');
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, {}, 'Session logged out successfully')
    );
});

/**
 * @desc    Logout from all sessions/devices
 * @route   DELETE /api/v1/auth/sessions
 * @access  Protected
 */
const logoutAllSessions = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $set: {
      sessions: [],
    },
  });

  // Clear cookies
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  return res
    .status(HTTP_STATUS.OK)
    .clearCookie('accessToken', cookieOptions)
    .clearCookie('refreshToken', cookieOptions)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        {},
        'Logged out from all devices successfully'
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getSessions,
  logoutSession,
  logoutAllSessions,
};
