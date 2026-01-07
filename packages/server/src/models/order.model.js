import mongoose from 'mongoose';
import { ORDER_STATUS, ORDER_STATUS_LIST } from '../constants.js';
import { generateOrderNumber } from '../utils/orderId.js';

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      uppercase: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DarkStore',
      required: true,
    },
    deliveryAddress: {
      addressLine1: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
      },
      pincode: {
        type: String,
        required: true,
        trim: true,
      },
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number],
          required: true,
        },
      },
    },
    items: [orderItemSchema],
    itemsPrice: {
      type: Number,
      required: true,
      min: [0, 'Items price cannot be negative'],
    },
    deliveryFee: {
      type: Number,
      required: true,
      min: [0, 'Delivery fee cannot be negative'],
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
    },
    status: {
      type: String,
      enum: ORDER_STATUS_LIST,
      default: ORDER_STATUS.PENDING_PAYMENT,
      required: true,
    },
    paymentIntentId: {
      type: String,
      trim: true,
    },
    deliveryDistance: {
      type: Number,
      required: true,
      min: [0, 'Delivery distance cannot be negative'],
    },
    assignedRider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rider',
      default: null,
    },
    estimatedDeliveryTime: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user order history (newest first)
orderSchema.index({ user: 1, createdAt: -1 });

// Index for admin order filtering by status
orderSchema.index({ status: 1 });

// Geospatial index for location-based queries (orders near a location)
orderSchema.index({ 'deliveryAddress.location': '2dsphere' });

// Index for rider's active orders
orderSchema.index({ assignedRider: 1, status: 1 });

// Auto-generate orderNumber if not provided
orderSchema.pre('save', async function () {
  if (!this.orderNumber) {
    this.orderNumber = generateOrderNumber();
  }
});

// Clean JSON output
orderSchema.methods.toJSON = function () {
  const orderObject = this.toObject();
  delete orderObject.__v;
  return orderObject;
};

export const Order = mongoose.model('Order', orderSchema);
