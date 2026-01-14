import { z } from 'zod';

export const createProductSchema = z.object({
  name: z
    .string()
    .min(2, 'Product name must be at least 2 characters')
    .max(100, 'Product name must be at most 100 characters')
    .trim(),

  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must be at most 1000 characters')
    .trim(),

  price: z
    .number({ required_error: 'Price is required' })
    .nonnegative('Price cannot be negative')
    .max(100000, 'Price cannot exceed ₹1,00,000'),

  discountPrice: z
    .number()
    .nonnegative('Discount price cannot be negative')
    .optional()
    .refine((val) => !val || val <= 100000, 'Discount price is too high'),

  category: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Category ID format'),

  image: z
    .string()
    .url('Please provide a valid image URL')
    .or(z.string().min(1, 'Image path is required')),

  unit: z
    .string()
    .min(1, 'Unit is required')
    .trim()
    .regex(
      /^\d+(\.\d+)?\s*(g|kg|ml|l|pcs|pc|pack|units|bunch|dozen)$/i,
      'Invalid format. Use e.g., "500g", "1 kg", "12 pcs"'
    ),
});

export const updateProductSchema = z.object({
  name: z
    .string()
    .min(2, 'Product name must be at least 2 characters')
    .max(100, 'Product name must be at most 100 characters')
    .trim()
    .optional(),

  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must be at most 1000 characters')
    .trim()
    .optional(),

  price: z
    .number()
    .nonnegative('Price cannot be negative')
    .max(100000, 'Price cannot exceed ₹1,00,000')
    .optional(),

  discountPrice: z
    .number()
    .nonnegative('Discount price cannot be negative')
    .optional()
    .refine((val) => !val || val <= 100000, 'Discount price is too high'),

  category: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Category ID format')
    .optional(),

  image: z
    .string()
    .url('Please provide a valid image URL')
    .or(z.string().min(1, 'Image path is required'))
    .optional(),

  unit: z
    .string()
    .min(1, 'Unit is required')
    .trim()
    .regex(
      /^\d+(\.\d+)?\s*(g|kg|ml|l|pcs|pc|pack|units|bunch|dozen)$/i,
      'Invalid format. Use e.g., "500g", "1 kg", "12 pcs"'
    )
    .optional(),

  isActive: z.boolean().optional(),
});

export const updateStockSchema = z.object({
  storeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Store ID format'),
  stock: z
    .number({ required_error: 'Stock quantity is required' })
    .int('Stock must be an integer')
    .nonnegative('Stock cannot be negative'),
  price: z
    .number()
    .nonnegative('Override price cannot be negative')
    .max(100000, 'Price cannot exceed ₹1,00,000')
    .optional(),
});

export const getAllProductsSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
  sort: z.enum(['price_asc', 'price_desc', 'newest', 'oldest']).optional(),
  category: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Category ID')
    .optional(),
  search: z.string().max(100).optional(),
  minPrice: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),
  maxPrice: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),
  latitude: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),
  longitude: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),
});
