import mongoose from 'mongoose';

/**
 * Dark Store Schema
 * Represents physical store locations with geospatial capabilities
 */
const darkStoreSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Store name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Store name must be at most 100 characters'],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: function (coords) {
            // Validate [longitude, latitude] GeoJSON format
            return (
              coords.length === 2 &&
              coords[0] >= -180 &&
              coords[0] <= 180 &&
              coords[1] >= -90 &&
              coords[1] <= 90
            );
          },
          message:
            'Coordinates must be [longitude, latitude] with valid ranges',
        },
      },
    },
    serviceRadius: {
      type: Number,
      required: true,
      min: [0.1, 'Service radius must be at least 0.1 km'],
      max: [15, 'Service radius cannot exceed 15 km'],
      default: 5,
    },
    address: {
      type: String,
      required: [true, 'Store address is required'],
      trim: true,
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

// Index for active stores
darkStoreSchema.index({ isActive: 1 });

// Compound index for active store queries
// ESR (equality, sort, range): guideline for ordering fields in a MongoDB compound index to maximize performance.
// This index supports both geospatial sorting and isActive filtering.
darkStoreSchema.index({ isActive: 1, location: '2dsphere' });

darkStoreSchema.methods.toJSON = function () {
  const storeObject = this.toObject();
  delete storeObject.__v;
  return storeObject;
};

export const DarkStore = mongoose.model('DarkStore', darkStoreSchema);
