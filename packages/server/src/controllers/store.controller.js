import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants.js';
import * as storeService from '../services/store.service.js';

/**
 * @desc    Find nearest active dark store based on user coordinates.
 *          Uses geospatial query to find stores within service radius.
 * @route   GET /api/v1/stores/nearest
 * @access  Public
 *
 * @param   {Object} req - Express request object
 * @param   {Object} req.query - Query parameters
 * @param   {number} req.query.latitude - User's latitude coordinate (-90 to 90)
 * @param   {number} req.query.longitude - User's longitude coordinate (-180 to 180)
 * @param   {Object} res - Express response object
 * @returns {JSON} 200 - Nearest store details with distance
 * @returns {JSON} 404 - "We do not deliver to your location yet"
 * @returns {JSON} 400 - Missing latitude or longitude
 */
export const getNearestStore = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.query;

  if (!latitude || !longitude) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json(
        new ApiResponse(
          HTTP_STATUS.BAD_REQUEST,
          null,
          'Latitude and longitude are required'
        )
      );
  }

  const store = await storeService.findNearestStore(longitude, latitude);

  if (!store) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json(
        new ApiResponse(
          HTTP_STATUS.NOT_FOUND,
          null,
          'We do not deliver to your location yet'
        )
      );
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, store, 'Nearest store found successfully')
    );
});

/**
 * @desc    Get inventory for a specific store.
 *          Returns all products available at the store with stock levels.
 * @route   GET /api/v1/stores/:storeId/inventory
 * @access  Public
 *
 * @param   {Object} req - Express request object
 * @param   {Object} req.params - Route parameters
 * @param   {string} req.params.storeId - MongoDB ObjectId of the store
 * @param   {Object} req.query - Optional query filters
 * @param   {string} [req.query.productId] - Filter by specific product ID
 * @param   {string} [req.query.isAvailable] - Filter by availability ("true" or "false")
 * @param   {Object} res - Express response object
 * @returns {JSON} 200 - Array of inventory items with populated product details
 */
export const getStoreInventory = asyncHandler(async (req, res) => {
  const { storeId } = req.params;
  const filters = {
    productId: req.query.productId,
    isAvailable: req.query.isAvailable === 'true',
  };

  const inventory = await storeService.getStoreInventory(storeId, filters);

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        inventory,
        'Store inventory retrieved successfully'
      )
    );
});
