import asyncHandler from '../utils/asyncHandler.js';
import { Cart } from '../models/index.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants.js';
import * as cartService from '../services/cart.service.js';

/**
 * @desc    Add item to cart.
 * @route   POST /api/v1/cart/add
 * @access  Protected
 *
 * @param   {string} req.body.productId - Product Object ID.
 * @param   {string} req.body.storeId - Store Object ID.
 * @param   {number} [req.body.quantity=1] - Quantity to add.
 * @returns {JSON} Updated cart object.
 */
const addToCart = asyncHandler(async (req, res) => {
  const { productId, storeId, quantity = 1 } = req.body;
  const userId = req.user._id;

  // Validate required fields
  if (!storeId) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Store ID is required');
  }

  // Validate quantity
  if (quantity < 1) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Quantity must be at least 1');
  }

  // load the service only when needed keeping your memory usage low and avoiding circular dependencies
  const { performAtomicCartOperation } =
    await import('../services/cart.service.js');
  const cart = await performAtomicCartOperation(
    userId,
    productId,
    quantity,
    storeId,
    'add'
  );

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, cart, 'Item added to cart'));
});

/**
 * @desc    Update cart item quantity.
 * @route   PUT /api/v1/cart/update
 * @access  Protected
 *
 * @param   {string} req.body.productId - Product Object ID.
 * @param   {string} req.body.storeId - Store Object ID.
 * @param   {number} req.body.quantity - New quantity (0 to remove).
 * @returns {JSON} Updated cart object or removal message.
 */
const updateCartItem = asyncHandler(async (req, res) => {
  const { productId, storeId, quantity } = req.body;
  const userId = req.user._id;

  // Validate required fields
  if (!storeId) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Store ID is required');
  }

  // Validate quantity
  if (quantity < 0) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Quantity cannot be negative');
  }

  const { performAtomicCartOperation } =
    await import('../services/cart.service.js');
  const cart = await performAtomicCartOperation(
    userId,
    productId,
    quantity,
    storeId,
    'update'
  );

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        cart,
        quantity === 0 ? 'Item removed from cart' : 'Cart item updated'
      )
    );
});

/**
 * @desc    Remove item from cart.
 * @route   DELETE /api/v1/cart/remove/:productId
 * @access  Protected
 *
 * @param   {string} req.params.productId - Product Object ID to remove.
 * @returns {JSON} Updated cart object.
 */
const removeCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user._id;

  // Remove item from cart using $pull operator
  // why use pull and not our atomic function? because we just need to remove without checks
  const result = await Cart.updateOne(
    { user: userId },
    { $pull: { items: { product: productId } } }
  );

  if (result.modifiedCount === 0) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Item not found in cart');
  }

  // Get updated cart with populated refs
  const cart = await Cart.findOne({ user: userId })
    .populate({
      path: 'items.product',
      select: 'name price discountPrice currentPrice unit image',
    })
    .populate({
      path: 'items.inventory',
      select: 'price stock isAvailable',
    });

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, cart, 'Item removed from cart'));
});

/**
 * @desc    Get user's cart.
 * @route   GET /api/v1/cart
 * @access  Protected
 *
 * @returns {JSON} Cart object with warnings (if any price/stock changes).
 */
const getCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const { cart, warnings } = await cartService.getAndRepairCart(userId);

  const responseData = {
    ...cart.toObject(),
    warnings: warnings.length > 0 ? warnings : undefined,
  };

  const hasIssues = warnings.length > 0;
  const message = hasIssues
    ? 'Cart retrieved. Please review warnings before checkout.'
    : 'Cart retrieved successfully';

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, responseData, message));
});

/**
 * @desc    Clear all items from cart.
 * @route   POST /api/v1/cart/clear
 * @access  Protected
 *
 * @returns {JSON} Success message.
 */
const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Use the service logic
  await cartService.clearCart(userId);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, {}, 'Cart cleared successfully'));
});

/**
 * @desc Validate cart for checkout (middleware helper)
 * @returns {Object} Validation result
 */
const validateCartForCheckout = async (userId) => {
  const { validateCartForCheckout: serviceValidateCart } =
    await import('../services/cart.service.js');
  return serviceValidateCart(userId);
};

export {
  addToCart,
  updateCartItem,
  removeCartItem,
  getCart,
  clearCart,
  validateCartForCheckout,
};
