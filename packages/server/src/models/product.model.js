import mongoose from 'mongoose';
import slugify from 'slugify';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [100, 'Product name must be at most 100 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
      maxlength: [1000, 'Description must be at most 1000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
    },
    discountPrice: {
      type: Number,
      min: [0, 'Discount price cannot be negative'],
      validate: {
        validator: function (value) {
          return !value || value <= this.price;
        },
        message:
          'Discount price ({VALUE}) cannot be higher than the original price',
      },
    },
    currentPrice: {
      type: Number,
    },
    unit: {
      type: String,
      required: [true, 'Product unit is required'],
      trim: true,
      maxlength: [20, 'Unit must be at most 20 characters'],
    },
    image: {
      type: String,
      required: [true, 'Product image is required'],
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Product category is required'],
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

// Text search index
productSchema.index({ name: 'text', description: 'text' });

// Compound indexes for filtering
productSchema.index({ category: 1, isAvailable: 1 });
productSchema.index({ category: 1, currentPrice: 1 });
productSchema.index({ currentPrice: 1 });
productSchema.index({ isAvailable: 1 });

// Auto-generate currentPrice and slug
productSchema.pre('save', async function () {
  // Calculate current price
  this.currentPrice = this.discountPrice ?? this.price;
  // Generate slug from name
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
});

// Clean JSON output
productSchema.methods.toJSON = function () {
  const productObject = this.toObject();
  delete productObject.__v;
  return productObject;
};

export const Product = mongoose.model('Product', productSchema);
