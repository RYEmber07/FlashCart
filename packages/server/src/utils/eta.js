import { ETA_CONFIG } from '../constants.js';

/**
 * Calculate static ETA for delivery
 * Simple formula based on delivery distance only
 *
 * @param {number} deliveryDistanceKm - Distance from store to delivery address in km
 * @returns {number} Estimated delivery time in minutes
 */
export const calculateStaticETA = (deliveryDistanceKm) => {
  const { PREP_TIME_MINUTES, AVG_SPEED_MIN_PER_KM, BUFFER_MINUTES } =
    ETA_CONFIG;

  const deliveryTime = deliveryDistanceKm * AVG_SPEED_MIN_PER_KM;

  return Math.ceil(PREP_TIME_MINUTES + deliveryTime + BUFFER_MINUTES);
};
