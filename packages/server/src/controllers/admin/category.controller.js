import asyncHandler from '../../utils/asyncHandler.js';
import { Category } from '../../models/index.js';
import ApiError from '../../utils/apiError.js';
import ApiResponse from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants.js';
import {
  getPaginationOptions,
  getPaginationMetadata,
} from '../../utils/pagination.js';

/**
 * @desc Create new category (Admin)
 * @route POST /api/v1/admin/categories
 */
const createCategory = asyncHandler(async (req, res) => {
  const { name, image, description } = req.body;

  // Check if category already exists
  const existingCategory = await Category.findOne({ name });
  if (existingCategory) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      'Category with this name already exists'
    );
  }

  const category = await Category.create({
    name,
    image,
    description,
  });

  return res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(
        HTTP_STATUS.CREATED,
        category,
        'Category created successfully'
      )
    );
});

/**
 * @desc Update category (Admin)
 * @route PUT /api/v1/admin/categories/:id
 */
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, image, description, isActive } = req.body;

  const category = await Category.findById(id);

  if (!category) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Category not found');
  }

  // If updating name, check for duplicates
  if (name && name !== category.name) {
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        'Category with this name already exists'
      );
    }
    category.name = name;
  }

  if (image !== undefined) category.image = image;
  if (description !== undefined) category.description = description;
  if (isActive !== undefined) category.isActive = isActive;

  await category.save();

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, category, 'Category updated successfully')
    );
});

/**
 * @desc Delete (Deactivate) category (Admin)
 * @route DELETE /api/v1/admin/categories/:id
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  if (!category) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Category not found');
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, {}, 'Category deactivated successfully')
    );
});

/**
 * @desc    Get all categories with pagination and filters (Admin)
 * @route   GET /api/v1/admin/categories
 * @access  Admin
 */
const getAllCategories = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationOptions(req.query);
  const { search, isActive } = req.query;

  const query = {};

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  const categories = await Category.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalCategories = await Category.countDocuments(query);
  const pagination = getPaginationMetadata(totalCategories, limit, page);

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        { categories, pagination },
        'Categories retrieved successfully'
      )
    );
});

export { createCategory, updateCategory, deleteCategory, getAllCategories };
