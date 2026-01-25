import { Router } from 'express';
import validate from '../../middlewares/validate.middleware.js';
import {
  createProduct,
  updateProduct,
  updateStock,
  softDeleteProduct,
  removeProductFromStore,
  updateStorePrice,
  getAllProducts,
} from '../../controllers/admin/product.controller.js';
import {
  createProductSchema,
  updateProductSchema,
  updateStockSchema,
} from '../../validators/product.validator.js';

const router = Router();

/**
 * @route   POST /api/v1/admin/products
 * @desc    Create new product (global info)
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter, validate(createProductSchema)
 */
router.post('/', validate(createProductSchema), createProduct);

/**
 * @route   PUT /api/v1/admin/products/:id
 * @desc    Update product (name, description, image, isActive)
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter, validate(updateProductSchema)
 */
router.put('/:id', validate(updateProductSchema), updateProduct);

/**
 * @route   DELETE /api/v1/admin/products/:id
 * @desc    Soft delete product
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter
 */
router.delete('/:id', softDeleteProduct);

/**
 * @route   PUT /api/v1/admin/products/:id/stock
 * @desc    Add/Update product stock in a specific store
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter, validate(updateStockSchema)
 */
router.put('/:id/stock', validate(updateStockSchema), updateStock);

/**
 * @route   DELETE /api/v1/admin/products/:id/store/:storeId
 * @desc    Remove product from a specific store
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter
 */
router.delete('/:id/store/:storeId', removeProductFromStore);

/**
 * @route   PUT /api/v1/admin/products/:id/store/:storeId
 * @desc    Update product price per store
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter
 */
router.put('/:id/store/:storeId', updateStorePrice);

/**
 * @route   GET /api/v1/admin/products
 * @desc    List all products (admin view)
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter
 */
router.get('/', getAllProducts);

export default router;
