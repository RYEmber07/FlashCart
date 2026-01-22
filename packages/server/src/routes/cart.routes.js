import express from 'express';
import {
  addToCart,
  updateCartItem,
  removeCartItem,
  getCart,
  clearCart,
} from '../controllers/cart.controller.js';
import validate from '../middlewares/validate.middleware.js';
import verifyJWT from '../middlewares/auth.middleware.js';
import {
  addToCartSchema,
  updateCartSchema,
  removeCartItemSchema,
} from '../validators/cart.validator.js';

const router = express.Router();

// All cart routes require authentication
router.use(verifyJWT);

/**
 * @route   GET /api/v1/cart
 * @desc    Get user's cart with all items and totals
 * @access  Protected
 * @middleware verifyJWT
 */
router.get('/', getCart);

/**
 * @route   POST /api/v1/cart/add
 * @desc    Add item to cart (requires storeId)
 * @access  Protected
 * @middleware verifyJWT, validate(addToCartSchema)
 */
router.post('/add', validate(addToCartSchema), addToCart);

/**
 * @route   PUT /api/v1/cart/update
 * @desc    Update cart item quantity (requires storeId)
 * @access  Protected
 * @middleware verifyJWT, validate(updateCartSchema)
 */
router.put('/update', validate(updateCartSchema), updateCartItem);

/**
 * @route   DELETE /api/v1/cart/remove/:productId
 * @desc    Remove specific item from cart
 * @access  Protected
 * @middleware verifyJWT, validate(removeCartItemSchema, 'params')
 */
router.delete(
  '/remove/:productId',
  validate(removeCartItemSchema, 'params'),
  removeCartItem
);

/**
 * @route   POST /api/v1/cart/clear
 * @desc    Clear all items from cart
 * @access  Protected
 * @middleware verifyJWT
 */
router.post('/clear', clearCart);

export default router;
