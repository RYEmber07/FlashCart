import { HTTP_STATUS, ERROR_MESSAGES } from '../constants.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';

/**
 * Central Error Translator Middleware
 * Converts raw library errors into standardized ApiError format
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Log raw error in development
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${req.method} ${req.url}:`, err);
  }

  // Error Translation Layer

  // Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
    error = new ApiError(
      HTTP_STATUS.CONFLICT,
      `The ${fieldName} is already in use.`
    );
  }

  // Mongoose Validation Error
  else if (err.name === 'ValidationError') {
    const validationErrors = Object.values(err.errors ?? {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    error = new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_MESSAGES.VALIDATION_ERROR,
      validationErrors
    );
  }

  // Zod Validation Error (fallback if bypassed validate middleware)
  else if (err.name === 'ZodError') {
    const issues = err.errors || err.issues || [];
    const validationErrors = issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    error = new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_MESSAGES.VALIDATION_ERROR,
      validationErrors
    );
  }

  // JWT Errors
  else if (err.name === 'JsonWebTokenError') {
    error = new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.UNAUTHORIZED);
  } else if (err.name === 'TokenExpiredError') {
    error = new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Token has expired');
  }

  // Mongoose Cast Error (Invalid ObjectId)
  else if (err.name === 'CastError') {
    error = new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      `Invalid ${err.path}: ${err.value}`
    );
  }

  // Response Construction
  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = error.message || ERROR_MESSAGES.SERVER_ERROR;

  // Create standardized response
  const response = new ApiResponse(statusCode, null, message);

  // Attach validation errors if they exist
  if (
    error instanceof ApiError &&
    Array.isArray(error.errors) &&
    error.errors.length > 0
  ) {
    response.errors = error.errors;
  }

  // Attach stack trace in development only
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};

export { errorHandler };
