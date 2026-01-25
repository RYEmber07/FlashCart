import { Router } from 'express';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,
} from '../../controllers/admin/category.controller.js';
import validate from '../../middlewares/validate.middleware.js';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../../validators/category.validator.js';

const router = Router();

// Global admin middleware (verifyJWT, verifyAdmin) is applied in admin.routes.js

/**
 * @route   POST /api/v1/admin/categories
 * @desc    Create new category
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter, validate(createCategorySchema)
 */
router.post('/', validate(createCategorySchema), createCategory);

/**
 * @route   GET /api/v1/admin/categories
 * @desc    Get all categories (paginated)
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter
 */
router.get('/', getAllCategories);

/**
 * @route   PUT /api/v1/admin/categories/:id
 * @desc    Update category and active status
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter, validate(updateCategorySchema)
 */
router.put('/:id', validate(updateCategorySchema), updateCategory);

/**
 * @route   DELETE /api/v1/admin/categories/:id
 * @desc    Deactivate category (Soft Delete)
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter
 */
router.delete('/:id', deleteCategory);

export default router;
