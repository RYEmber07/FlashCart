import express from 'express';
import authRouter from './auth.routes.js';
import userRouter from './user.routes.js';
import productRouter from './product.routes.js';
import categoryRouter from './category.routes.js';
import cartRouter from './cart.routes.js';
import orderRouter from './order.routes.js';
import webhookRouter from './webhook.routes.js';
import storeRouter from './store.routes.js';
import riderRouter from './rider.routes.js';
import adminRouter from './admin.routes.js';

const rootRouter = express.Router();

// Health Check
rootRouter.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount domain routers
rootRouter.use('/auth', authRouter);
rootRouter.use('/user', userRouter);
rootRouter.use('/product', productRouter);
rootRouter.use('/category', categoryRouter);
rootRouter.use('/cart', cartRouter);
rootRouter.use('/order', orderRouter);
rootRouter.use('/webhooks', webhookRouter);
rootRouter.use('/stores', storeRouter);
rootRouter.use('/riders', riderRouter);
rootRouter.use('/admin', adminRouter);

export default rootRouter;
