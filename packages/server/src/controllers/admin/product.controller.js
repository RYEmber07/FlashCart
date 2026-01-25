import asyncHandler from '../../utils/asyncHandler.js';
import { Product, Category } from '../../models/index.js';
import ApiError from '../../utils/apiError.js';
import ApiResponse from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants.js';

/**
 * @desc    Create a new product.
 * @route   POST /api/v1/admin/products
 * @access  Admin
 */
const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, discountPrice, unit, category, image } =
    req.body;

  // 1. Check for Duplicate Name
  const existingProduct = await Product.findOne({ name });
  if (existingProduct) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      'Product with this name already exists'
    );
  }

  // 2. Verify Category exists
  const categoryExists = await Category.findById(category);
  if (!categoryExists) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      'The specified category does not exist'
    );
  }

  // 3. Create the Product
  const product = new Product({
    name,
    description,
    price,
    discountPrice,
    unit,
    category,
    image,
  });

  await product.save();

  await product.populate('category', 'name slug');

  return res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(
        HTTP_STATUS.CREATED,
        product,
        'Product created successfully'
      )
    );
});

/**
 * @desc    Update product stock at a specific store (Admin only).
 *          Updates StoreInventory.stock instead of global Product.quantity.
 * @route   PUT /api/v1/admin/products/:id/stock
 * @access  Admin
 */
const updateStock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { storeId, stock } = req.body;

  // Verify product exists
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found');
  }

  // Verify store exists
  const { DarkStore } = await import('../../models/darkStore.model.js');
  const store = await DarkStore.findById(storeId);
  if (!store) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Store not found');
  }

  // Upsert inventory entry
  const { StoreInventory } =
    await import('../../models/storeInventory.model.js');
  const inventory = await StoreInventory.findOneAndUpdate(
    { storeId, productId: id },
    {
      stock,
      isAvailable: stock > 0,
      ...(req.body.price !== undefined ? { price: req.body.price } : {}),
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    }
  );

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      {
        inventory,
        product: { _id: product._id, name: product.name },
        store: { _id: store._id, name: store.name },
      },
      'Store inventory updated successfully'
    )
  );
});

/**
 * @desc    Update global product details (Admin)
 * @route   PUT /api/v1/admin/products/:id
 */
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    price,
    discountPrice,
    unit,
    category,
    image,
    isActive,
  } = req.body;

  const product = await Product.findById(id);
  if (!product) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found');

  if (name && name !== product.name) {
    const duplicate = await Product.findOne({ name });
    if (duplicate)
      throw new ApiError(HTTP_STATUS.CONFLICT, 'Product name already exists');
    product.name = name;
  }

  if (category) {
    const catExists = await Category.findById(category);
    if (!catExists)
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Category not found');
    product.category = category;
  }

  if (description) product.description = description;
  if (price !== undefined) product.price = price;
  if (discountPrice !== undefined) product.discountPrice = discountPrice;
  if (unit) product.unit = unit;
  if (image) product.image = image;
  if (isActive !== undefined) product.isAvailable = isActive;

  await product.save();

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, product, 'Product updated successfully')
    );
});

/**
 * @desc    Soft delete product (set isAvailable false)
 * @route   DELETE /api/v1/admin/products/:id
 */
const softDeleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findByIdAndUpdate(
    id,
    { isAvailable: false },
    { new: true }
  );
  if (!product) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found');

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, {}, 'Product deactivated successfully')
    );
});

/**
 * @desc    Remove product from specific store
 * @route   DELETE /api/v1/admin/products/:id/store/:storeId
 */
const removeProductFromStore = asyncHandler(async (req, res) => {
  const { id, storeId } = req.params;
  const { StoreInventory } =
    await import('../../models/storeInventory.model.js');

  const result = await StoreInventory.findOneAndDelete({
    storeId,
    productId: id,
  });
  if (!result)
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Inventory record not found');

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, {}, 'Product removed from store'));
});

/**
 * @desc    Update store-specific price only
 * @route   PUT /api/v1/admin/products/:id/store/:storeId
 */
const updateStorePrice = asyncHandler(async (req, res) => {
  const { id, storeId } = req.params;
  const { price } = req.body;

  if (price === undefined || price < 0) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Valid price is required');
  }

  const { StoreInventory } =
    await import('../../models/storeInventory.model.js');

  // Only update if record exists
  const inventory = await StoreInventory.findOneAndUpdate(
    { storeId, productId: id },
    { price },
    { new: true }
  );

  if (!inventory) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      'Product not available in this store. Use stock update to add it.'
    );
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        inventory,
        'Store price updated successfully'
      )
    );
});

/**
 * @desc    Get all products (Admin view with pagination)
 * @route   GET /api/v1/admin/products
 */
const getAllProducts = asyncHandler(async (req, res) => {
  const { getPaginationOptions, getPaginationMetadata } =
    await import('../../utils/pagination.js');

  const { page, limit, skip } = getPaginationOptions(req.query);
  const { search, category, isActive } = req.query;

  const query = {};
  if (isActive !== undefined) query.isAvailable = isActive === 'true';
  if (category) query.category = category;
  if (search) query.$text = { $search: search };

  const products = await Product.find(query)
    .populate('category', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Product.countDocuments(query);
  const pagination = getPaginationMetadata(total, limit, page);

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        { products, pagination },
        'Products retrieved successfully'
      )
    );
});

export {
  createProduct,
  updateStock,
  updateProduct,
  softDeleteProduct,
  removeProductFromStore,
  updateStorePrice,
  getAllProducts,
};
