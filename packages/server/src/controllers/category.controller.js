import asyncHandler from '../utils/asyncHandler.js';
import { Category } from '../models/index.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants.js';

/**
 * @desc Get all active categories
 * @route GET /api/v1/categories
 */
const getAllCategories = asyncHandler(async (req, res) => {
  // Fetch all active categories and sort alphabetically by name
  const categories = await Category.find({ isActive: true })
    .sort({ name: 1 })
    .select('name slug image');

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        categories,
        'Categories retrieved successfully'
      )
    );
});

/**
 * @desc Get a single category by slug
 * @route GET /api/v1/category/s/:slug
 */
const getCategoryBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const category = await Category.findOne({ slug, isActive: true })
    .select('name slug image description')
    .lean();

  if (!category) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      'Category not found or currently unavailable'
    );
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        category,
        'Category retrieved successfully'
      )
    );
});

export { getAllCategories, getCategoryBySlug };
