import express from 'express';
import {
  getAllProducts,
  getProductById,
  getProductBySlug,
} from '../controllers/product.controller.js';
import validate from '../middlewares/validate.middleware.js';
import { getAllProductsSchema } from '../validators/product.validator.js';

const router = express.Router();

/**
 * @route   GET /api/v1/product
 * @desc    Get all available products with pagination, filtering, and search
 * @access  Public
 */
router.get('/', validate(getAllProductsSchema, 'query'), getAllProducts);

/**
 * @route   GET /api/v1/product/s/:slug
 * @desc    Get product by slug with full details
 * @access  Public
 */
router.get('/s/:slug', getProductBySlug);

/**
 * @route   GET /api/v1/product/:id
 * @desc    Get product by ID with full details
 * @access  Public
 */
router.get('/:id', getProductById);

export default router;
