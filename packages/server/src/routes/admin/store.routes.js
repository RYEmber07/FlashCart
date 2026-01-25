import { Router } from 'express';
import {
  createStore,
  getAllStores,
  getStoreById,
  updateStore,
} from '../../controllers/admin/store.controller.js';
import validate from '../../middlewares/validate.middleware.js';
import {
  createStoreSchema,
  updateStoreSchema,
} from '../../validators/store.validator.js';

const router = Router();

/**
 * @route   POST /api/v1/admin/stores
 * @desc    Create new dark store
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter, validate(createStoreSchema)
 */
router.post('/', validate(createStoreSchema), createStore);

/**
 * @route   GET /api/v1/admin/stores
 * @desc    Get all stores
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter
 */
router.get('/', getAllStores);

/**
 * @route   GET /api/v1/admin/stores/:id
 * @desc    Get store details
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter
 */
router.get('/:id', getStoreById);

/**
 * @route   PUT /api/v1/admin/stores/:id
 * @desc    Update store details
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter, validate(updateStoreSchema)
 */
router.put('/:id', validate(updateStoreSchema), updateStore);

export default router;
