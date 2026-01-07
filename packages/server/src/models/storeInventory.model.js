import mongoose from 'mongoose';

/**
 * Store Inventory Schema
 * Junction model mapping products to specific stores with local stock and pricing
 */
const storeInventorySchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DarkStore',
      required: [true, 'Store ID is required'],
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    stock: {
      type: Number,
      required: true,
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    price: {
      type: Number,
      min: [0, 'Price cannot be negative'],
      // Overrides global product price if set
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index to prevent duplicate store-product mappings
storeInventorySchema.index({ storeId: 1, productId: 1 }, { unique: true });

// Index for store-specific queries
storeInventorySchema.index({ storeId: 1, isAvailable: 1 });

// Index for product availability across stores
storeInventorySchema.index({ productId: 1, isAvailable: 1 });

storeInventorySchema.methods.toJSON = function () {
  const inventoryObject = this.toObject();
  delete inventoryObject.__v;
  return inventoryObject;
};

export const StoreInventory = mongoose.model('StoreInventory', storeInventorySchema);
