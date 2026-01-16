import express from 'express';
import {
  getNearestStore,
  getStoreInventory,
} from '../controllers/store.controller.js';

const router = express.Router();

/**
 * @route   GET /api/v1/stores/nearest
 * @desc    Find nearest active dark store
 * @access  Public
 */
router.get('/nearest', getNearestStore);

/**
 * @route   GET /api/v1/stores/:storeId/inventory
 * @desc    Get inventory for a specific store
 * @access  Public
 */
router.get('/:storeId/inventory', getStoreInventory);

export default router;
