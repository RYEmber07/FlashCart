import express from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getSessions,
  logoutSession,
  logoutAllSessions,
} from '../controllers/auth.controller.js';
import validate from '../middlewares/validate.middleware.js';
import verifyJWT from '../middlewares/auth.middleware.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { sensitiveLimiter } from '../middlewares/rateLimit.middleware.js';

const router = express.Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user account
 * @access  Public (Rate limited)
 * @middleware sensitiveLimiter, validate(registerSchema)
 */
router.post(
  '/register',
  sensitiveLimiter,
  validate(registerSchema),
  registerUser
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user and return access/refresh tokens
 * @access  Public (Rate limited)
 * @middleware sensitiveLimiter, validate(loginSchema)
 */
router.post('/login', sensitiveLimiter, validate(loginSchema), loginUser);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user and clear refresh token
 * @access  Protected
 * @middleware verifyJWT
 */
router.post('/logout', verifyJWT, logoutUser);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public (Rate limited)
 * @middleware sensitiveLimiter
 */
router.post('/refresh-token', sensitiveLimiter, refreshAccessToken);

/**
 * @route   GET /api/v1/auth/sessions
 * @desc    Get all active sessions for current user
 * @access  Protected
 * @middleware verifyJWT
 */
router.get('/sessions', verifyJWT, getSessions);

/**
 * @route   DELETE /api/v1/auth/sessions/:sessionId
 * @desc    Logout from a specific session/device
 * @access  Protected (Rate limited)
 * @middleware verifyJWT, sensitiveLimiter
 */
router.delete(
  '/sessions/:sessionId',
  verifyJWT,
  sensitiveLimiter,
  logoutSession
);

/**
 * @route   DELETE /api/v1/auth/sessions
 * @desc    Logout from all sessions/devices
 * @access  Protected (Rate limited)
 * @middleware verifyJWT, sensitiveLimiter
 */
router.delete('/sessions', verifyJWT, sensitiveLimiter, logoutAllSessions);

export default router;
