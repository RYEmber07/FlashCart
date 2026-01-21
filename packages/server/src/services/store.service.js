import { DarkStore } from '../models/darkStore.model.js';

/**
 * Finds the nearest active dark store to given coordinates using geospatial query.
 * Uses MongoDB's $geoNear aggregation to find stores within their service radius.
 *
 * @param {number} longitude - Longitude coordinate (range: -180 to 180)
 * @param {number} latitude - Latitude coordinate (range: -90 to 90)
 * @returns {Promise<Object|null>} Nearest store object with distance field, or null if no store found within service radius
 *
 * @example
 * const store = await findNearestStore(77.5946, 12.9716); // Bangalore coordinates
 */
export const findNearestStore = async (longitude, latitude) => {
  // Use $geoNear aggregation for geospatial query
  const stores = await DarkStore.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        distanceField: 'distance', // in meters
        spherical: true,
        key: 'location', // Explicitly specify the index key to avoid ambiguity
        query: { isActive: true },
      },
    },
    {
      $addFields: {
        // Convert service radius from km to meters for comparison
        serviceRadiusInMeters: { $multiply: ['$serviceRadius', 1000] },
      },
    },
    {
      $match: {
        // Only include stores where user is within service radius
        $expr: { $lte: ['$distance', '$serviceRadiusInMeters'] },
      },
    },
    {
      $limit: 1,
    },
  ]);

  return stores.length > 0 ? stores[0] : null;
};

/**
 * Retrieves inventory for a specific store with optional filtering.
 * Populates product details for each inventory item.
 *
 * @param {string} storeId - MongoDB ObjectId of the store
 * @param {Object} [filters={}] - Optional filters
 * @param {string} [filters.productId] - Filter by specific product ID
 * @param {boolean} [filters.isAvailable] - Filter by availability status
 * @returns {Promise<Array>} Array of inventory items with populated product details
 */
export const getStoreInventory = async (storeId, filters = {}) => {
  const { StoreInventory } = await import('../models/storeInventory.model.js');

  const query = { storeId };

  if (filters.productId) {
    query.productId = filters.productId;
  }

  if (filters.isAvailable !== undefined) {
    query.isAvailable = filters.isAvailable;
  }

  const inventory = await StoreInventory.find(query)
    .populate('productId', 'name description image category unit currentPrice')
    .lean();

  return inventory.map((item) => ({
    ...item,
    price: item.price ?? item.productId?.currentPrice,
  }));
};
