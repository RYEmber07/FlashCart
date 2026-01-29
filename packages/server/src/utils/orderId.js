import crypto from 'crypto';

/**
 * Generates a unique order number with timestamp + randomness
 * Format: BLK-YYYYMMDD-TIMESTAMPRANDOM
 * Example: BLK-20260130-LXK7G9A7B2
 */
export const generateOrderNumber = () => {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = now.getTime().toString(36).toUpperCase();
  const randomPart = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `BLK-${datePart}-${timePart}${randomPart}`;
};
