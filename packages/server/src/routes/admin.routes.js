import { Router } from 'express';
import verifyJWT from '../middlewares/auth.middleware.js';
import { verifyAdmin } from '../middlewares/adminAuth.middleware.js';
import ApiResponse from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants.js';

import categoryAdminRouter from './admin/category.routes.js';
import productAdminRouter from './admin/product.routes.js';
import orderAdminRouter from './admin/order.routes.js';
import storeAdminRouter from './admin/store.routes.js';
import riderAdminRouter from './admin/rider.routes.js';

const router = Router();

// Allow all admin routes to use these middlewares globally
// 1. Verify Authentication (JWT)
// 2. Verify Authorization (Admin Role)
router.use(verifyJWT, verifyAdmin);

// Mount admin resources
router.use('/categories', categoryAdminRouter);
router.use('/products', productAdminRouter);
router.use('/orders', orderAdminRouter);
router.use('/stores', storeAdminRouter);
router.use('/riders', riderAdminRouter);

router.get('/health', (req, res) => {
  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, {}, 'Admin access granted'));
});

export default router;
