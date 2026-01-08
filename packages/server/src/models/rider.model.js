import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';

/**
 * Rider Schema
 * Represents delivery riders with status-based availability
 */
const riderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Rider name is required'],
      trim: true,
      maxlength: [100, 'Name must be at most 100 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      validate: {
        validator: function (phone) {
          // Basic phone validation (10 digits)
          return /^[0-9]{10}$/.test(phone);
        },
        message: 'Phone number must be 10 digits',
      },
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
      validate: {
        validator: function (v) {
          // Min 8 chars, 1 Uppercase, 1 Lowercase, 1 Number
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(v);
        },
        message:
          'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.',
      },
    },
    status: {
      type: String,
      enum: ['available', 'busy', 'offline'],
      default: 'offline',
      required: true,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DarkStore',
      default: null,
    },
    currentOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Partial unique index for phone (only active riders)
// Allows phone reuse when rider is soft-deleted
riderSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
  }
);

// Index for filtering available riders
riderSchema.index({ status: 1, isActive: 1 });

// Pre-save hook to hash password
riderSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to check password
riderSchema.methods.isPasswordCorrect = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate access token
riderSchema.methods.generateAccessToken = function () {
  return generateAccessToken(this._id, 'rider');
};

// Instance method to generate refresh token
riderSchema.methods.generateRefreshToken = function () {
  return generateRefreshToken(this._id, 'rider');
};

// Clean JSON output
riderSchema.methods.toJSON = function () {
  const riderObject = this.toObject();
  delete riderObject.password;
  delete riderObject.refreshToken;
  delete riderObject.__v;
  return riderObject;
};

export const Rider = mongoose.model('Rider', riderSchema);
