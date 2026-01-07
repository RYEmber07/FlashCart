import mongoose from 'mongoose';

/**
 * Cart Item Schema
 * Each item references both the Product and its specific StoreInventory entry
 */
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    inventory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StoreInventory',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    // Fallback price captured when item was added (safety net)
    priceSnapshot: {
      type: Number,
      required: true,
      min: [0, 'Price snapshot cannot be negative'],
    },
  },
  { _id: false }
);

/**
 * Cart Schema - Single-Store Hyperlocal Model
 * Each cart is "locked" to exactly one DarkStore
 */
const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DarkStore',
      // set when first item is added
    },
    items: [cartItemSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
// Compound index for user + store lookups (critical for hyperlocal queries)
cartSchema.index({ user: 1, storeId: 1 });

// Ensure virtual fields are serialized
cartSchema.set('toObject', { virtuals: true });
cartSchema.set('toJSON', { virtuals: true });

/**
 * Triple-Fallback Virtual for Total Bill Calculation
 * Priority: inventory.price then product.currentPrice then priceSnapshot
 */
cartSchema.virtual('totalBill').get(function () {
  return this.items.reduce((total, item) => {
    const priceToUse =
      item.inventory?.price ?? item.product?.currentPrice ?? item.priceSnapshot;
    return total + priceToUse * item.quantity;
  }, 0);
});

// Virtual for total items count
cartSchema.virtual('totalItems').get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Method to validate cart items against current stock
cartSchema.methods.validateCartItems = async function () {
  const { validateCartItems } = await import('../services/cart.service.js');
  return validateCartItems(this.items, this.storeId);
};

// Method to clean invalid items from cart
cartSchema.methods.cleanInvalidItems = async function () {
  const { validItems } = await this.validateCartItems();
  this.items = validItems;
  return this.save();
};

// Clean output: Remove internal fields
cartSchema.methods.toJSON = function () {
  const cartObject = this.toObject();
  delete cartObject.__v;
  return cartObject;
};

// auto-unlock cart when empty
// If items array is empty, we remove the storeId lock so the user can switch stores.
cartSchema.pre('save', async function () {
  if (this.items.length === 0) {
    this.storeId = undefined; // Unset the field, removes the field from the document
  }
});

export const Cart = mongoose.model('Cart', cartSchema);
