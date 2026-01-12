import asyncHandler from '../utils/asyncHandler.js';
import { User } from '../models/index.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants.js';

/**
 * @desc Get current authenticated user profile
 * @route GET /api/v1/user/me
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  // req.user is already populated by verifyJWT middleware
  // toJSON method automatically removes sensitive fields as well as verifyJWT never attaches them
  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        req.user,
        'User profile retrieved successfully'
      )
    );
});

/**
 * @desc Add a new address to user profile
 * @route POST /api/v1/user/me/address
 */
const addAddress = asyncHandler(async (req, res) => {
  const { label, addressLine1, city, pincode, coordinates, isDefault } =
    req.body;
  const userId = req.user._id;

  // Get current user to check existing addresses
  // the reason we dont use req.user is to ensure we have the latest data from DB in case of concurrent requests

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found');
  }

  // Check address limit
  if (user.addresses.length >= 5) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Maximum 5 addresses allowed per user'
    );
  }

  // If this is the first address or explicitly set as default, make it default
  const shouldBeDefault = isDefault === true || user.addresses.length === 0;

  // If setting as default, unset any existing default address
  // db is the single source of truth, so we always query it
  // updateOne means only one document will be updated
  if (shouldBeDefault) {
    await User.updateOne(
      { _id: userId, 'addresses.isDefault': true },
      { $unset: { 'addresses.$.isDefault': 1 } }
    );
  }

  // Create new address object
  const newAddress = {
    label,
    addressLine1,
    city,
    pincode,
    ...(coordinates && { coordinates }),
    isDefault: shouldBeDefault,
  };

  // Add address to user
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $push: { addresses: newAddress } },
    { new: true }
  );

  return res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(
        HTTP_STATUS.CREATED,
        updatedUser.addresses[updatedUser.addresses.length - 1],
        'Address added successfully'
      )
    );
});

/**
 * @desc Update an existing address
 * @route PATCH /api/v1/user/me/address/:addressId
 */
const updateAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const { label, addressLine1, city, pincode, coordinates, isDefault } =
    req.body;
  const userId = req.user._id;

  // Build update object with only provided fields
  const updateFields = {};

  if (label !== undefined) updateFields['addresses.$.label'] = label;
  if (addressLine1 !== undefined)
    updateFields['addresses.$.addressLine1'] = addressLine1;
  if (city !== undefined) updateFields['addresses.$.city'] = city;
  if (pincode !== undefined) updateFields['addresses.$.pincode'] = pincode;
  if (coordinates !== undefined)
    updateFields['addresses.$.coordinates'] = coordinates;

  // Handle default address logic
  if (isDefault !== undefined) {
    if (isDefault) {
      // If setting as default, unset any existing default address
      await User.updateOne(
        { _id: userId, 'addresses.isDefault': true },
        { $unset: { 'addresses.$.isDefault': 1 } }
      );
    }
    updateFields['addresses.$.isDefault'] = isDefault;
  }

  // Only update if there are fields to update
  if (Object.keys(updateFields).length === 0) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'No valid fields provided for update'
    );
  }

  // Update the specific address using positional operator
  const updatedUser = await User.findOneAndUpdate(
    { _id: userId, 'addresses._id': addressId },
    { $set: updateFields },
    { new: true }
  );

  if (!updatedUser) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Address not found');
  }

  // Find the updated address
  const updatedAddress = updatedUser.addresses.find(
    (addr) => addr._id.toString() === addressId
  );

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        updatedAddress,
        'Address updated successfully'
      )
    );
});

/**
 * @desc Delete an address
 * @route DELETE /api/v1/user/me/address/:addressId
 */
const deleteAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const userId = req.user._id;

  // Find user and check if address exists and is default
  const user = await User.findById(userId);
  const addressToDelete = user.addresses.find(
    (addr) => addr._id.toString() === addressId
  );

  if (!addressToDelete) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Address not found');
  }

  const wasDefault = addressToDelete.isDefault;

  // Remove the address
  // $pull operator removes from an existing array all instances of a value or values that match a specified condition
  await User.findByIdAndUpdate(userId, {
    $pull: { addresses: { _id: addressId } },
  });

  // If deleted address was default and there are remaining addresses,
  // set the most recent one as default
  if (wasDefault) {
    const remainingUser = await User.findById(userId);
    if (remainingUser.addresses.length > 0) {
      // Set the last address (most recent) as default
      const lastAddressId =
        remainingUser.addresses[remainingUser.addresses.length - 1]._id;
      await User.findOneAndUpdate(
        { _id: userId, 'addresses._id': lastAddressId },
        { $set: { 'addresses.$.isDefault': true } }
      );
    }
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, {}, 'Address deleted successfully'));
});

/**
 * @desc Update user account details (partial update)
 * @route PATCH /api/v1/user/me
 */
const updateAccountDetails = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Build update object with only provided fields
  const updateData = {};

  if (req.body.name !== undefined) {
    updateData.name = req.body.name;
  }

  if (req.body.contactNumber !== undefined) {
    // Check contact number uniqueness if being updated
    if (req.body.contactNumber !== req.user.contactNumber) {
      const existingUser = await User.findOne({
        contactNumber: req.body.contactNumber,
      });
      if (existingUser) {
        throw new ApiError(
          HTTP_STATUS.CONFLICT,
          'Contact number already in use'
        );
      }
    }
    updateData.contactNumber = req.body.contactNumber;
  }

  // Only update if there are fields to update
  if (Object.keys(updateData).length === 0) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'No valid fields provided for update'
    );
  }

  // Update user
  const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
  });

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        updatedUser,
        'Account details updated successfully'
      )
    );
});

export {
  getCurrentUser,
  addAddress,
  updateAddress,
  deleteAddress,
  updateAccountDetails,
};
