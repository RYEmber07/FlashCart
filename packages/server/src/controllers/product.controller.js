import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import { Product } from '../models/index.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants.js';
import {
  getPaginationOptions,
  getPaginationMetadata,
} from '../utils/pagination.js';

/**
 * @desc    Get all available products with advanced filtering.
 *          If latitude/longitude provided, returns products available at nearest store.
 * @route   GET /api/v1/product
 * @access  Public
 *
 * @param   {number} [req.query.latitude] - User's latitude for location-based filtering.
 * @param   {number} [req.query.longitude] - User's longitude for location-based filtering.
 * @param   {string} [req.query.category] - Filter by category ID.
 * @param   {string} [req.query.search] - Full-text search term.
 * @param   {number} [req.query.minPrice] - Minimum price filter.
 * @param   {number} [req.query.maxPrice] - Maximum price filter.
 * @param   {string} [req.query.sort] - Sort order (price_asc, price_desc, newest, oldest).
 * @param   {number} [req.query.page] - Page number for pagination.
 * @returns {JSON} Paginated list of products with store-specific stock info.
 */
const getAllProducts = asyncHandler(async (req, res) => {
  const { category, search, minPrice, maxPrice, sort, latitude, longitude } =
    req.query;

  // Pagination
  const { skip, limit, page } = getPaginationOptions(req.query);

  // Location-based Store lookup
  let nearestStore = null;
  if (latitude && longitude) {
    const { findNearestStore } = await import('../services/store.service.js');
    nearestStore = await findNearestStore(longitude, latitude);

    if (!nearestStore) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(
          new ApiResponse(
            HTTP_STATUS.NOT_FOUND,
            null,
            'We do not deliver to your location yet'
          )
        );
    }
  }

  // Filtering Conditions
  const matchConditions = { isAvailable: true };

  if (category) {
    matchConditions.category = new mongoose.Types.ObjectId(category);
  }

  if (search) {
    const sanitizedSearch = search
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    matchConditions.$text = { $search: sanitizedSearch };
  }

  if (minPrice || maxPrice) {
    matchConditions.currentPrice = {};
    if (minPrice) matchConditions.currentPrice.$gte = parseFloat(minPrice);
    if (maxPrice) matchConditions.currentPrice.$lte = parseFloat(maxPrice);
  }

  // Sorting
  let sortOption = { createdAt: -1 };
  if (sort) {
    switch (sort) {
      case 'price_asc':
        sortOption = { currentPrice: 1 };
        break;
      case 'price_desc':
        sortOption = { currentPrice: -1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }
  }

  // Aggregation Pipeline
  const pipeline = [{ $match: matchConditions }];

  // Join with Store Inventory if location provided
  if (nearestStore) {
    pipeline.push({
      $lookup: {
        from: 'storeinventories',
        let: { productId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$productId', '$$productId'] },
                  { $eq: ['$storeId', nearestStore._id] },
                  { $eq: ['$isAvailable', true] },
                  { $gt: ['$stock', 0] },
                ],
              },
            },
          },
        ],
        as: 'storeInventory',
      },
    });

    // Only show products available at this store
    pipeline.push({ $match: { 'storeInventory.0': { $exists: true } } });

    // Add stock info to response
    pipeline.push({
      $addFields: {
        stock: { $arrayElemAt: ['$storeInventory.stock', 0] },
        storePrice: {
          $ifNull: [
            { $arrayElemAt: ['$storeInventory.price', 0] },
            '$currentPrice',
          ],
        },
      },
    });

    // Remove storeInventory array from response
    pipeline.push({ $project: { storeInventory: 0 } });
  }

  // Populate Category
  pipeline.push({
    $lookup: {
      from: 'categories',
      localField: 'category',
      foreignField: '_id',
      as: 'categoryData',
    },
  });

  pipeline.push({
    $addFields: {
      category: { $arrayElemAt: ['$categoryData', 0] },
    },
  });

  pipeline.push({ $project: { categoryData: 0, __v: 0 } });

  // Count total documents for pagination
  const countPipeline = [...pipeline, { $count: 'total' }];
  const countResult = await Product.aggregate(countPipeline);
  const totalProducts = countResult[0]?.total || 0;

  // Apply Sort and Pagination
  pipeline.push({ $sort: sortOption });
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limit });

  // Execute Aggregation
  const products = await Product.aggregate(pipeline);

  const pagination = getPaginationMetadata(totalProducts, limit, page);

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      {
        products,
        pagination,
        ...(nearestStore && {
          store: {
            _id: nearestStore._id,
            name: nearestStore.name,
            distance: nearestStore.distance,
          },
        }),
      },
      'Products retrieved successfully'
    )
  );
});

/**
 * @desc    Get a single product by ID.
 * @route   GET /api/v1/products/:id
 * @access  Public
 *
 * @param   {string} req.params.id - Product Object ID.
 * @returns {JSON} Product details.
 */
const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Filter by isAvailable directly in the query for better security/speed
  const product = await Product.findOne({ _id: id, isAvailable: true })
    .populate('category', 'name slug image')
    .select(
      'name description price discountPrice unit image category isAvailable currentPrice'
    )
    .lean();

  if (!product) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      'Product not found or currently unavailable'
    );
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, product, 'Product retrieved successfully')
    );
});

/**
 * @desc    Get a single product by slug.
 * @route   GET /api/v1/product/s/:slug
 * @access  Public
 *
 * @param   {string} req.params.slug - Product slug.
 * @returns {JSON} Product details.
 */
const getProductBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const product = await Product.findOne({ slug, isAvailable: true })
    .populate('category', 'name slug image')
    .select(
      'name slug description price discountPrice unit image category isAvailable currentPrice'
    )
    .lean();

  if (!product) {
    throw new ApiError(
      HTTP_STATUS.NOT_FOUND,
      'Product not found or currently unavailable'
    );
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, product, 'Product retrieved successfully')
    );
});

export { getAllProducts, getProductById, getProductBySlug };
