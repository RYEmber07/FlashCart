import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';

// Address sub-document schema
const addressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      enum: ['Home', 'Office', 'Other'],
      default: 'Home',
    },
    addressLine1: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Address line 1 must be at most 200 characters'],
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'City must be at most 50 characters'],
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{6}$/, 'Pincode must be exactly 6 digits'],
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      validate: {
        validator: function (v) {
          return v.length === 2;
        },
        message: 'Coordinates must be [longitude, latitude]',
      },
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: true,
  }
);

// Session sub-document schema for multi-device login
const sessionSchema = new mongoose.Schema(
  {
    refreshToken: {
      type: String,
      required: true,
    },
    deviceInfo: {
      type: String, // User agent string
      default: 'Unknown Device',
    },
    ipAddress: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  }
);

// User schema
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name must be at most 50 characters'],
    },
    // contactNumber is the primary identifier
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      unique: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit contact number'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Do not include password in responses if not explicitly requested
      validate: {
        validator: function (v) {
          // Regex: Min 8 chars, 1 Uppercase, 1 Lowercase, 1 Number
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(v);
        },
        message:
          'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.',
      },
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    sessions: [sessionSchema],
    addresses: [addressSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes
// contactNumber index is automatically created by unique: true
userSchema.index({ isDeleted: 1 });

// Pre-save hook to hash password
userSchema.pre('save', async function () {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return;

  // Hash password with cost of 12
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to check password
userSchema.methods.isPasswordCorrect = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate access token
userSchema.methods.generateAccessToken = function () {
  return generateAccessToken(this._id, this.role);
};

// Instance method to generate refresh token
userSchema.methods.generateRefreshToken = function () {
  return generateRefreshToken(this._id, this.role);
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.sessions;
  delete userObject.__v;
  return userObject;
};

export const User = mongoose.model('User', userSchema);
