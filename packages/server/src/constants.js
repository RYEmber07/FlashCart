// API Configuration
export const API_PREFIX = '/api';

// Database Configuration
export const DB_NAME = 'flashcart';

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
};

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

// Token Expiration Times (in seconds)
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: 15 * 60, // 15 minutes
  REFRESH_TOKEN: 7 * 24 * 60 * 60, // 7 days
};

// Common Error Messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation error',
  SERVER_ERROR: 'Internal server error',
};

// Order Statuses
export const ORDER_STATUS = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED',
};

export const ORDER_STATUS_LIST = Object.values(ORDER_STATUS);

// Rider Statuses
export const RIDER_STATUS = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  OFFLINE: 'offline',
};

export const RIDER_STATUS_LIST = Object.values(RIDER_STATUS);

// Session Management
export const MAX_SESSIONS = 5; // Maximum concurrent sessions per user

// ETA Configuration
export const ETA_CONFIG = {
  PREP_TIME_MINUTES: 5,
  AVG_SPEED_KM_PER_HOUR: 20,
  AVG_SPEED_MIN_PER_KM: 3,
  BUFFER_MINUTES: 5,
};
