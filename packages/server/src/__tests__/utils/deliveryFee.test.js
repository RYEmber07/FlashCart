import { describe, it, expect } from '@jest/globals';
import { calculateDeliveryFee } from '../../utils/deliveryFee.js';

describe('Delivery Fee Calculator', () => {
  // Tier 1: 0-2 km = ₹20 (flat)
  it('should calculate fee for distance <= 2km', () => {
    expect(calculateDeliveryFee(0)).toBe(20);
    expect(calculateDeliveryFee(0.5)).toBe(20);
    expect(calculateDeliveryFee(1)).toBe(20);
    expect(calculateDeliveryFee(2)).toBe(20);
  });

  // Tier 2: 2-5 km = ₹20 + ₹10 per additional km
  it('should calculate fee for distance 2-5km', () => {
    // 3 km = 20 + ceil(1) * 10 = 30
    expect(calculateDeliveryFee(3)).toBe(30);
    // 5 km = 20 + ceil(3) * 10 = 50
    expect(calculateDeliveryFee(5)).toBe(50);
  });

  // Tier 3: 5-10 km = ₹50 + ₹15 per additional km
  it('should calculate fee for distance 5-10km', () => {
    // 6 km = 50 + ceil(1) * 15 = 65
    expect(calculateDeliveryFee(6)).toBe(65);
    // 10 km = 50 + ceil(5) * 15 = 125
    expect(calculateDeliveryFee(10)).toBe(125);
  });

  // Tier 4: 10+ km = ₹125 + ₹20 per additional km
  it('should calculate fee for distance > 10km', () => {
    // 12 km = 125 + ceil(2) * 20 = 165
    expect(calculateDeliveryFee(12)).toBeGreaterThan(125);
  });

  it('should handle edge cases', () => {
    // Distance = 0 should be ₹20
    expect(calculateDeliveryFee(0)).toBe(20);
    // Negative distance should throw error
    expect(() => calculateDeliveryFee(-1)).toThrow(
      'Distance cannot be negative'
    );
    // Greater distance = greater fee
    expect(calculateDeliveryFee(10)).toBeGreaterThan(calculateDeliveryFee(5));
  });
});
