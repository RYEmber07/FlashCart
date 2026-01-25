import asyncHandler from '../../utils/asyncHandler.js';
import { DarkStore } from '../../models/darkStore.model.js';
import ApiError from '../../utils/apiError.js';
import ApiResponse from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants.js';
import {
  getPaginationOptions,
  getPaginationMetadata,
} from '../../utils/pagination.js';

/**
 * @desc    Create a new dark store (Admin)
 * @route   POST /api/v1/admin/stores
 * @access  Admin
 */
const createStore = asyncHandler(async (req, res) => {
  const { name, address, latitude, longitude, serviceRadius } = req.body;

  // Check for existing store name
  const existingStore = await DarkStore.findOne({ name });
  if (existingStore) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      'Store with this name already exists'
    );
  }

  const store = await DarkStore.create({
    name,
    address,
    location: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
    serviceRadius: serviceRadius || 5,
  });

  return res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(
        HTTP_STATUS.CREATED,
        store,
        'Dark store created successfully'
      )
    );
});

/**
 * @desc    Get all dark stores (Admin)
 * @route   GET /api/v1/admin/stores
 * @access  Admin
 */
const getAllStores = asyncHandler(async (req, res) => {
  const { skip, limit, page } = getPaginationOptions(req.query);

  const stores = await DarkStore.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalStores = await DarkStore.countDocuments();
  const pagination = getPaginationMetadata(totalStores, limit, page);

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        { stores, pagination },
        'Stores retrieved successfully'
      )
    );
});

/**
 * @desc    Get store by ID (Admin)
 * @route   GET /api/v1/admin/stores/:id
 * @access  Admin
 */
const getStoreById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const store = await DarkStore.findById(id);

  if (!store) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Store not found');
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        store,
        'Store details retrieved successfully'
      )
    );
});

/**
 * @desc    Update store details/location (Admin)
 * @route   PUT /api/v1/admin/stores/:id
 * @access  Admin
 */
const updateStore = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, address, latitude, longitude, serviceRadius, isActive } =
    req.body;

  const store = await DarkStore.findById(id);

  if (!store) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Store not found');
  }

  if (name && name !== store.name) {
    const duplicate = await DarkStore.findOne({ name });
    if (duplicate) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        'Store with this name already exists'
      );
    }
    store.name = name;
  }

  if (address) store.address = address;
  if (serviceRadius) store.serviceRadius = serviceRadius;
  if (isActive !== undefined) store.isActive = isActive;

  if (latitude !== undefined && longitude !== undefined) {
    store.location = {
      type: 'Point',
      coordinates: [longitude, latitude],
    };
  }

  await store.save();

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, store, 'Store updated successfully'));
});

export { createStore, getAllStores, getStoreById, updateStore };
