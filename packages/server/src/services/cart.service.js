import mongoose from 'mongoose';
import ApiError from '../utils/apiError.js';
import { HTTP_STATUS } from '../constants.js';
import { runInTransaction, withSession } from '../utils/transaction.js';

/**
 * Cart Service - Business Logic Layer
 * Handles complex cart validation and cleanup operations for Single-Store Hyperlocal Model
 */

/**
 * Validates cart items against current product availability and store-level inventory.
 * Performs batch fetching to avoid N+1 query problem.
 * LAZY FETCH STRATEGY: Fetches fresh data and attaches it to cart items.
 *
 * @param {Array} cartItems - Array of cart item objects with product, quantity, priceSnapshot, and inventory
 * @param {string} storeId - The store ID the cart is locked to
 * @returns {Promise<{validItems: Array, invalidItems: Array, priceChanges: Array}>} Validation results with fresh populated data
 */
export const validateCartItems = async (cartItems, storeId) => {
  const Product = mongoose.model('Product');
  const StoreInventory = mongoose.model('StoreInventory');

  const invalidItems = [];
  const validItems = [];
  const priceChanges = [];

  // Batch fetch all products (FRESH data)
  const productIds = cartItems.map((item) => item.product._id || item.product);
  const products = await Product.find({ _id: { $in: productIds } }).select(
    'name price discountPrice currentPrice unit image isAvailable'
  );

  const productMap = new Map();
  products.forEach((product) => {
    productMap.set(product._id.toString(), product);
  });

  // Batch fetch all inventory entries for this store (FRESH data)
  const inventoryEntries = await StoreInventory.find({
    storeId,
    productId: { $in: productIds },
  }).select('price stock isAvailable productId storeId');

  const inventoryMap = new Map();
  inventoryEntries.forEach((inv) => {
    inventoryMap.set(inv.productId.toString(), inv);
  });

  for (const item of cartItems) {
    const productIdStr = (item.product._id || item.product).toString();
    const product = productMap.get(productIdStr);
    const inventory = inventoryMap.get(productIdStr);

    if (!product) {
      invalidItems.push({
        productId: item.product._id || item.product,
        reason: 'Product not found',
        quantity: item.quantity,
      });
      continue;
    }

    if (!product.isAvailable) {
      invalidItems.push({
        productId: item.product._id || item.product,
        reason: 'Product unavailable',
        quantity: item.quantity,
      });
      continue;
    }

    if (
      !inventory ||
      !inventory.isAvailable ||
      inventory.stock < item.quantity
    ) {
      const availableStock = inventory?.stock || 0;
      invalidItems.push({
        productId: item.product._id || item.product,
        reason: `Insufficient stock at store. Available: ${availableStock}, Requested: ${item.quantity}`,
        quantity: item.quantity,
        available: availableStock,
      });
      continue;
    }

    // Triple-Fallback price check
    const currentPrice = inventory.price ?? product.currentPrice;
    if (Math.abs(currentPrice - item.priceSnapshot) > 0.01) {
      priceChanges.push({
        productId: item.product._id || item.product,
        productName: product.name,
        oldPrice: item.priceSnapshot,
        newPrice: currentPrice,
        difference: currentPrice - item.priceSnapshot,
        quantity: item.quantity,
      });
    }

    // LAZY FETCH: Attach fresh data to the item
    validItems.push({
      product: item.product._id || item.product,
      inventory: inventory._id,
      quantity: item.quantity,
      priceSnapshot: item.priceSnapshot,
      // Attach populated data for response
      _populatedProduct: product,
      _populatedInventory: inventory,
    });
  }

  return { validItems, invalidItems, priceChanges };
};

/**
 * Validates cart for checkout process
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Cart object with populated items if valid
 * @throws {ApiError} If cart is empty, has no store, items are invalid, or prices changed
 */
export const validateCartForCheckout = async (userId, session) => {
  const Cart = mongoose.model('Cart');

  // LAZY FETCH: Don't populate, let validateCartItems fetch fresh data
  // Use session for transactional consistency if provided
  const cart = await withSession(Cart.findOne({ user: userId }), session);

  if (!cart || cart.items.length === 0) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Cart is empty');
  }

  // Validate cart has a storeId
  if (!cart.storeId) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Cart has no associated store. Please add items first.'
    );
  }

  // Fetch fresh data during validation
  const { validItems, invalidItems, priceChanges } = await validateCartItems(
    cart.items,
    cart.storeId
  );

  if (invalidItems.length > 0) {
    cart.items = validItems.map((item) => ({
      product: item.product,
      inventory: item.inventory,
      quantity: item.quantity,
      priceSnapshot: item.priceSnapshot,
    }));
    await cart.save();
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Items unavailable. Please review your cart.',
      { invalidItems }
    );
  }

  if (priceChanges.length > 0) {
    const changeMap = new Map(
      priceChanges.map((pc) => [pc.productId.toString(), pc.newPrice])
    );

    cart.items = validItems.map((item) => {
      const newPrice = changeMap.get(item.product.toString());
      return {
        product: item.product,
        inventory: item.inventory,
        quantity: item.quantity,
        priceSnapshot: newPrice !== undefined ? newPrice : item.priceSnapshot,
      };
    });

    await cart.save();

    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Prices have changed. Please review the new total before proceeding.',
      { priceChanges }
    );
  }

  // Attach populated data from validation for response
  cart.items = validItems.map((item) => ({
    product: item._populatedProduct,
    inventory: item._populatedInventory,
    quantity: item.quantity,
    priceSnapshot: item.priceSnapshot,
  }));

  return cart;
};

/**
 * Performs atomic cart operations with single-store constraint
 * @param {string} userId - User ID
 * @param {string} productId - Product ID
 * @param {number} quantity - Quantity to add/update (must be non-negative)
 * @param {string} storeId - Store ID for inventory lookup
 * @param {string} operation - 'add' or 'update'
 * @returns {Promise<Object>} Updated cart with populated product and inventory data
 * @throws {ApiError} If validation fails, stock insufficient, or store conflict
 */
export const performAtomicCartOperation = async (
  userId,
  productId,
  quantity,
  storeId,
  operation = 'add'
) => {
  // Input validation
  if (quantity < 0) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Quantity must be a positive number'
    );
  }

  if (!storeId) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Store ID is required for cart operations'
    );
  }

  return await runInTransaction(async (session) => {
    const Product = mongoose.model('Product');
    const Cart = mongoose.model('Cart');
    const StoreInventory = mongoose.model('StoreInventory');

    // Validate product exists and is available
    const product = await withSession(Product.findById(productId), session);
    if (!product) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found');
    }

    if (!product.isAvailable) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        'Product is currently unavailable'
      );
    }

    // Query store-specific inventory
    const storeInventory = await withSession(
      StoreInventory.findOne({
        storeId,
        productId,
        isAvailable: true,
      }),
      session
    );

    if (!storeInventory) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        'Product not available at this store'
      );
    }

    // Find or create cart
    let cart = await withSession(Cart.findOne({ user: userId }), session);
    if (!cart) {
      cart = new Cart({ user: userId, storeId, items: [] });
    }

    // SINGLE-STORE CONSTRAINT: 409 Conflict if cart has items from different store
    if (
      cart.storeId &&
      cart.items.length > 0 &&
      cart.storeId.toString() !== storeId
    ) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        `Cart contains items from another store`
      );
    }

    // Lock cart to store if empty
    if (!cart.storeId || cart.items.length === 0) {
      cart.storeId = storeId;
    }

    // Find existing item (match product)
    const existingItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    let finalQuantity;

    if (operation === 'add') {
      finalQuantity =
        existingItemIndex > -1
          ? cart.items[existingItemIndex].quantity + quantity
          : quantity;
    } else {
      finalQuantity = quantity;
    }

    // Validate final quantity against store-specific stock
    if (finalQuantity > storeInventory.stock) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Only ${storeInventory.stock} items available at this store`
      );
    }

    const priceToUse = storeInventory.price ?? product.currentPrice;

    // Update or add item
    if (existingItemIndex > -1) {
      if (finalQuantity === 0) {
        cart.items.splice(existingItemIndex, 1);
      } else {
        cart.items[existingItemIndex].quantity = finalQuantity;
        cart.items[existingItemIndex].priceSnapshot = priceToUse;
        cart.items[existingItemIndex].inventory = storeInventory._id;
      }
    } else if (finalQuantity > 0) {
      cart.items.push({
        product: productId,
        inventory: storeInventory._id,
        quantity: finalQuantity,
        priceSnapshot: priceToUse,
      });
    }

    // Save cart
    await cart.save({ session });

    // Populate for response
    await cart.populate([
      {
        path: 'items.product',
        select: 'name price discountPrice currentPrice unit image isAvailable',
      },
      {
        path: 'items.inventory',
        select: 'price stock isAvailable',
      },
    ]);

    return cart;
  });
};

/**
 * Gets user's cart and auto-repairs invalid items with warnings
 * @param {string} userId - User ID
 * @param {Object} [session] - Optional Mongoose session for transactions
 * @returns {Promise<{cart: Object, warnings: Array}>} Cart object and array of warning messages
 */
export const getAndRepairCart = async (userId, session = null) => {
  const Cart = mongoose.model('Cart');

  let cart = await Cart.findOne({ user: userId }).session(session);

  // If no cart exists or cart is empty, return early (no validation needed)
  if (!cart || cart.items.length === 0) {
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }
    return { cart, warnings: [] };
  }

  // Validate cart items for stock and price issues
  const { validItems, invalidItems, priceChanges } = await validateCartItems(
    cart.items,
    cart.storeId
  );

  const warnings = [];

  // Handle invalid items (auto-repair)
  if (invalidItems.length > 0) {
    cart.items = validItems.map((item) => ({
      product: item.product,
      inventory: item.inventory,
      quantity: item.quantity,
      priceSnapshot: item.priceSnapshot,
    }));
    await cart.save({ session });

    warnings.push({
      type: 'INVALID_ITEMS_REMOVED',
      message: `${invalidItems.length} item(s) were removed from your cart due to stock changes`,
      details: invalidItems,
    });
  }

  // Attach fresh populated data from validation
  cart.items = validItems.map((item) => ({
    product: item._populatedProduct,
    inventory: item._populatedInventory,
    quantity: item.quantity,
    priceSnapshot: item.priceSnapshot,
  }));

  // Handle price changes (warning only)
  if (priceChanges.length > 0) {
    warnings.push({
      type: 'PRICE_CHANGES_DETECTED',
      message: `${priceChanges.length} item(s) have price changes. Please review before checkout.`,
      details: priceChanges,
    });
  }

  return { cart, warnings };
};

/**
 * Clears user's cart by deleting it entirely (Pro-tip: cleaner DB)
 * A fresh cart will be created when user starts shopping again
 * @param {string} userId - User ID
 * @param {Object} [session] - Optional mongoose session for transaction
 * @returns {Promise<void>}
 */
export const clearCart = async (userId, session = null) => {
  const Cart = mongoose.model('Cart');

  if (session) {
    await Cart.deleteOne({ user: userId }).session(session);
  } else {
    await Cart.deleteOne({ user: userId });
  }
};
