import express from 'express';
import {
  getAllCategories,
  getCategoryBySlug,
} from '../controllers/category.controller.js';

const router = express.Router();

/**
 * @route   GET /api/v1/category
 * @desc    Get all active categories
 * @access  Public
 */
router.get('/', getAllCategories);

/**
 * @route   GET /api/v1/category/s/:slug
 * @desc    Get category by slug
 * @access  Public
 */
router.get('/s/:slug', getCategoryBySlug);

export default router;
