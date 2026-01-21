import { Rider } from '../models/rider.model.js';
import { RIDER_STATUS } from '../constants.js';
import ApiError from '../utils/apiError.js';
import { HTTP_STATUS } from '../constants.js';

/**
 * Find any available rider (status-based, not distance-based)
 * @param {string} storeId - Optional: filter riders by store affinity
 * @returns {Promise<Object|null>} Available rider or null
 */
export const findAvailableRider = async (storeId = null) => {
  const query = {
    status: RIDER_STATUS.AVAILABLE,
    isActive: true,
  };

  // Prefer riders assigned to this store for faster assignments
  if (storeId) {
    const rider = await Rider.findOne({
      ...query,
      store: storeId,
    });
    if (rider) return rider;
  }

  // Fallback to any available rider if none for this store
  const rider = await Rider.findOne(query);
  return rider;
};

/**
 * Assign rider to order atomically with race condition protection
 * @param {string} riderId - Rider ID
 * @param {string} orderId - Order ID
 * @param {Object} session - Mongoose session for transaction
 * @returns {Promise<Object>} Updated rider document
 * @throws {ApiError} If rider is no longer available
 */
export const assignRiderToOrder = async (riderId, orderId, session) => {
  // Atomic update: Only assign if rider is still available
  const result = await Rider.findOneAndUpdate(
    {
      _id: riderId,
      status: RIDER_STATUS.AVAILABLE,
    },
    {
      status: RIDER_STATUS.BUSY,
      currentOrder: orderId,
    },
    { session, new: true }
  );

  if (!result) {
    throw new ApiError(HTTP_STATUS.CONFLICT, 'Rider is no longer available');
  }

  return result;
};

/**
 * Release rider back to available status after delivery
 * @param {string} riderId - Rider ID
 * @param {Object} session - Optional mongoose session for transaction
 * @returns {Promise<Object>} Updated rider document
 */
export const releaseRider = async (riderId, session = null) => {
  const updateQuery = Rider.findByIdAndUpdate(
    riderId,
    {
      status: RIDER_STATUS.AVAILABLE,
      currentOrder: null,
    },
    { new: true }
  );

  if (session) {
    updateQuery.session(session);
  }

  const rider = await updateQuery.exec();

  if (!rider) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Rider not found');
  }

  return rider;
};
