import { z } from 'zod';

/**
 * Zod schema for address validation
 */
export const addressSchema = z.object({
  label: z.enum(['Home', 'Office', 'Other'], {
    errorMap: () => ({ message: 'Label must be Home, Office, or Other' }),
  }),

  addressLine1: z
    .string()
    .min(5, 'Address line 1 must be at least 5 characters long')
    .max(200, 'Address line 1 must be at most 200 characters long')
    .trim(),

  city: z
    .string()
    .min(2, 'City must be at least 2 characters long')
    .max(50, 'City must be at most 50 characters long')
    .trim(),

  pincode: z
    .string()
    .length(6, 'Pincode must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Pincode must contain only digits'),

  coordinates: z
    .array(z.number())
    .length(2, 'Coordinates must be [longitude, latitude]')
    .optional(),

  isDefault: z.boolean().optional().default(false),
});

/**
 * Zod schema for account details update validation
 */
export const updateAccountSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(50, 'Name must be at most 50 characters long')
    .trim()
    .optional(),

  contactNumber: z
    .string()
    .length(10, 'Contact number must be exactly 10 digits')
    .regex(/^[6-9]\d{9}$/, 'Please provide a valid Indian contact number')
    .optional(),
});
