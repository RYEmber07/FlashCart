import { z } from 'zod';

/**
 * Admin: Create dark store validation schema
 */
export const createStoreSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Store name must be at least 2 characters')
    .max(100, 'Store name must be at most 100 characters'),
  address: z
    .string()
    .trim()
    .min(10, 'Address must be at least 10 characters')
    .max(500, 'Address must be at most 500 characters'),
  latitude: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  serviceRadius: z
    .number()
    .min(1, 'Service radius must be at least 1 km')
    .max(50, 'Service radius cannot exceed 50 km')
    .optional()
    .default(5),
});

/**
 * Admin: Update store validation schema
 */
export const updateStoreSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Store name must be at least 2 characters')
    .max(100, 'Store name must be at most 100 characters')
    .optional(),
  address: z
    .string()
    .trim()
    .min(10, 'Address must be at least 10 characters')
    .max(500, 'Address must be at most 500 characters')
    .optional(),
  latitude: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional(),
  longitude: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional(),
  serviceRadius: z
    .number()
    .min(1, 'Service radius must be at least 1 km')
    .max(50, 'Service radius cannot exceed 50 km')
    .optional(),
  isActive: z.boolean().optional(),
});
