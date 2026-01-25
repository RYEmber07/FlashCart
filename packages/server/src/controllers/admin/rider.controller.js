import asyncHandler from '../../utils/asyncHandler.js';
import { Rider } from '../../models/rider.model.js'; // Import directly to avoid circular deps if any
import { DarkStore } from '../../models/darkStore.model.js';
import ApiError from '../../utils/apiError.js';
import ApiResponse from '../../utils/apiResponse.js';
import { HTTP_STATUS } from '../../constants.js';
import {
  getPaginationOptions,
  getPaginationMetadata,
} from '../../utils/pagination.js';

/**
 * @desc    Create a new rider (Admin)
 * @route   POST /api/v1/admin/riders
 * @access  Admin
 */
const createRider = asyncHandler(async (req, res) => {
  const { name, phone, password, storeId } = req.body;

  const existingRider = await Rider.findOne({ phone });
  if (existingRider) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      'Rider with this phone number already exists'
    );
  }

  // Validate Store if provided
  if (storeId) {
    const store = await DarkStore.findById(storeId);
    if (!store) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Assigned store not found');
    }
  }

  const rider = await Rider.create({
    name,
    phone,
    password,
    store: storeId || null,
    status: 'offline',
  });

  // Populate store name for response
  await rider.populate('store', 'name address');

  return res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(HTTP_STATUS.CREATED, rider, 'Rider created successfully')
    );
});

/**
 * @desc    Get all riders (Admin)
 * @route   GET /api/v1/admin/riders
 * @access  Admin
 */
const getAllRiders = asyncHandler(async (req, res) => {
  const { storeId, status, search } = req.query;

  const query = { isActive: true };

  if (storeId) query.store = storeId;
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const { skip, limit, page } = getPaginationOptions(req.query);

  const riders = await Rider.find(query)
    .populate('store', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalRiders = await Rider.countDocuments(query);
  const pagination = getPaginationMetadata(totalRiders, limit, page);

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        { riders, pagination },
        'Riders retrieved successfully'
      )
    );
});

/**
 * @desc    Get rider by ID (Admin)
 * @route   GET /api/v1/admin/riders/:id
 * @access  Admin
 */
const getRiderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const rider = await Rider.findById(id)
    .populate('store', 'name address')
    .populate('currentOrder', 'orderNumber status');

  if (!rider) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Rider not found');
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        rider,
        'Rider details retrieved successfully'
      )
    );
});

/**
 * @desc    Update rider details (Admin)
 * @route   PUT /api/v1/admin/riders/:id
 * @access  Admin
 */
const updateRider = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, phone, storeId, isActive } = req.body;

  const rider = await Rider.findById(id);

  if (!rider) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Rider not found');
  }

  if (name) rider.name = name;
  if (isActive !== undefined) rider.isActive = isActive;

  if (phone && phone !== rider.phone) {
    const duplicate = await Rider.findOne({ phone });
    if (duplicate) {
      throw new ApiError(HTTP_STATUS.CONFLICT, 'Phone number already in use');
    }
    rider.phone = phone;
  }

  if (storeId) {
    const store = await DarkStore.findById(storeId);
    if (!store) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Store not found');
    }
    rider.store = storeId;
  }

  await rider.save();
  await rider.populate('store', 'name');

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, rider, 'Rider updated successfully'));
});

/**
 * @desc    Delete (Deactivate) rider (Admin)
 * @route   DELETE /api/v1/admin/riders/:id
 * @access  Admin
 */
const deleteRider = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const rider = await Rider.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  if (!rider) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Rider not found');
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, {}, 'Rider deactivated successfully')
    );
});

export { createRider, getAllRiders, getRiderById, updateRider, deleteRider };
