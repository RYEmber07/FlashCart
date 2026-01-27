/**
 * Calculate delivery fee based on distance using tiered pricing
 *
 * @param {number} distanceInKm - Distance in kilometers
 * @returns {number} Delivery fee in rupees
 */
export const calculateDeliveryFee = (distanceInKm) => {
  if (distanceInKm < 0) {
    throw new Error('Distance cannot be negative');
  }

  // Tier 1: 0-2 km - Base fee
  if (distanceInKm <= 2) {
    return 20;
  }

  // Tier 2: 2-5 km - ₹20 + ₹10 per additional km
  if (distanceInKm <= 5) {
    const additionalKm = distanceInKm - 2;
    return 20 + Math.ceil(additionalKm) * 10;
  }

  // Tier 3: 5-10 km - ₹50 + ₹15 per additional km
  if (distanceInKm <= 10) {
    const additionalKm = distanceInKm - 5;
    return 50 + Math.ceil(additionalKm) * 15;
  }

  // Tier 4: 10+ km - ₹125 + ₹20 per additional km
  const additionalKm = distanceInKm - 10;
  return 125 + Math.ceil(additionalKm) * 20;
};
