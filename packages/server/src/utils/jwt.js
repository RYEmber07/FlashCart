import jwt from 'jsonwebtoken';
import { TOKEN_EXPIRY } from '../constants.js';

/**
 * Generates an access token with minimal payload
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @returns {string} JWT access token
 */
export const generateAccessToken = (userId, role) => {
  const payload = {
    _id: userId,
    role: role,
  };

  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: TOKEN_EXPIRY.ACCESS_TOKEN,
  });
};

/**
 * Generates a refresh token with minimal payload
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @returns {string} JWT refresh token
 */
export const generateRefreshToken = (userId, role) => {
  const payload = {
    _id: userId,
    role: role,
  };

  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: TOKEN_EXPIRY.REFRESH_TOKEN,
  });
};

/**
 * Verifies a JWT token
 * @param {string} token - JWT token to verify
 * @param {string} secret - Secret key for verification
 * @returns {Object} Decoded payload
 * @throws {JsonWebTokenError} If token is invalid
 * @throws {TokenExpiredError} If token has expired
 */
export const verifyToken = (token, secret) => {
  return jwt.verify(token, secret);
};
