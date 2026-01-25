import { Router } from 'express';
import {
  createRider,
  getAllRiders,
  getRiderById,
  updateRider,
  deleteRider,
} from '../../controllers/admin/rider.controller.js';
import validate from '../../middlewares/validate.middleware.js';
import {
  createRiderSchema,
  updateRiderSchema,
} from '../../validators/rider.validator.js';

const router = Router();

/**
 * @route   POST /api/v1/admin/riders
 * @desc    Create new rider account
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter, validate(createRiderSchema)
 */
router.post('/', validate(createRiderSchema), createRider);

/**
 * @route   GET /api/v1/admin/riders
 * @desc    Get all riders
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter
 */
router.get('/', getAllRiders);

/**
 * @route   GET /api/v1/admin/riders/:id
 * @desc    Get rider details
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter
 */
router.get('/:id', getRiderById);

/**
 * @route   PUT /api/v1/admin/riders/:id
 * @desc    Update rider details (assign store etc)
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter, validate(updateRiderSchema)
 */
router.put('/:id', validate(updateRiderSchema), updateRider);

/**
 * @route   DELETE /api/v1/admin/riders/:id
 * @desc    Deactivate rider
 * @access  Admin
 * @middleware verifyJWT, verifyAdmin, apiLimiter
 */
router.delete('/:id', deleteRider);

export default router;
