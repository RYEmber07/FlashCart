import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ORDER_STATUS, HTTP_STATUS } from '../../constants.js';
import ApiError from '../../utils/apiError.js';

// Mock rider service dynamically when needed by tests

const createOrderFixture = async ({
  stock = 5,
  quantity = 2,
  withRider = true,
} = {}) => {
  const { User, Category, DarkStore, Product, StoreInventory } =
    await import('../../models/index.js');

  const user = await User.create({
    name: 'Extra Order Test User',
    contactNumber: `9${Math.floor(Math.random() * 1_000_000_000)
      .toString()
      .padStart(9, '0')}`,
    password: 'OrderTestPass123',
  });

  const category = await Category.create({
    name: `Extra Order Test Category ${new mongoose.Types.ObjectId()}`,
    image: 'https://example.com/category.png',
    description: 'Test category',
  });

  const store = await DarkStore.create({
    name: `Extra Order Test Store ${new mongoose.Types.ObjectId()}`,
    address: '123 Test Street',
    location: {
      type: 'Point',
      coordinates: [77.04, 28.41],
    },
    serviceRadius: 10,
  });

  const product = await Product.create({
    name: `Extra Order Test Product ${new mongoose.Types.ObjectId()}`,
    description: 'A product used for order confirmation tests',
    price: 50,
    unit: '1 pc',
    image: 'https://example.com/product.png',
    category: category._id,
  });

  await StoreInventory.create({
    storeId: store._id,
    productId: product._id,
    stock,
    price: 50,
  });

  let rider = null;
  if (withRider) {
    const { Rider: RiderModel } = await import('../../models/index.js');
    rider = await RiderModel.create({
      name: 'Extra Ready Rider',
      phone: `8${Math.floor(Math.random() * 1_000_000_000)
        .toString()
        .padStart(9, '0')}`,
      password: 'RiderPass123',
      status: 'available',
      store: store._id,
    });
  }

  const { Order: OrderModel } = await import('../../models/order.model.js');

  const order = await OrderModel.create({
    user: user._id,
    storeId: store._id,
    deliveryAddress: {
      addressLine1: '123 Test Street',
      city: 'Gurugram',
      pincode: '122001',
      location: {
        type: 'Point',
        coordinates: [77.0425, 28.4089],
      },
    },
    items: [
      {
        product: product._id,
        name: product.name,
        quantity,
        price: 50,
        unit: product.unit,
        image: product.image,
      },
    ],
    itemsPrice: quantity * 50,
    deliveryFee: 20,
    deliveryDistance: 2.5,
    totalAmount: quantity * 50 + 20,
    status: ORDER_STATUS.PENDING_PAYMENT,
  });

  return { order, rider, product, store };
};

describe('order.service extra branches', () => {
  beforeEach(async () => {
    const { User, Category, Product, DarkStore, StoreInventory, Rider } =
      await import('../../models/index.js');
    const { Order } = await import('../../models/order.model.js');

    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      DarkStore.deleteMany({}),
      StoreInventory.deleteMany({}),
      Rider.deleteMany({}),
      Order.deleteMany({}),
    ]);
  });

  it('returns early when order is not pending payment (idempotency)', async () => {
    const { Order: OrderModel } = await import('../../models/order.model.js');
    const order = await OrderModel.create({
      user: new mongoose.Types.ObjectId(),
      storeId: new mongoose.Types.ObjectId(),
      deliveryAddress: {
        addressLine1: 'Line',
        city: 'City',
        pincode: '000000',
        location: { type: 'Point', coordinates: [77, 28] },
      },
      items: [],
      itemsPrice: 0,
      deliveryFee: 0,
      deliveryDistance: 0,
      totalAmount: 0,
      status: ORDER_STATUS.CONFIRMED,
    });

    const { confirmOrderPayment } =
      await import('../../services/order.service.js');

    const result = await confirmOrderPayment(order._id, 'pi_dup');
    expect(result.status).toBe(ORDER_STATUS.CONFIRMED);
    expect(result.paymentIntentId).toBeUndefined();
  });

  it('sets order to CONFIRMED when no riders are available', async () => {
    const { order } = await createOrderFixture({
      stock: 5,
      quantity: 1,
      withRider: false,
    });

    const { confirmOrderPayment } =
      await import('../../services/order.service.js');

    const updated = await confirmOrderPayment(order._id, 'pi_norider');
    expect(updated.status).toBe(ORDER_STATUS.CONFIRMED);
    expect(updated.paymentIntentId).toBe('pi_norider');
  });

  it('falls back to CONFIRMED when rider assignment conflicts', async () => {
    const { order } = await createOrderFixture({
      stock: 5,
      quantity: 1,
      withRider: true,
    });

    const conflictError = new ApiError(HTTP_STATUS.CONFLICT, 'Rider conflict');

    // Mock rider.service to return the available rider but throw on assign
    await jest.unstable_mockModule('../../services/rider.service.js', () => ({
      findAvailableRider: async (storeId) => {
        const { Rider: RiderModel } = await import('../../models/index.js');
        return RiderModel.findOne({ store: storeId, status: 'AVAILABLE' });
      },
      assignRiderToOrder: async () => {
        throw conflictError;
      },
    }));

    const { confirmOrderPayment } =
      await import('../../services/order.service.js');

    const updated = await confirmOrderPayment(order._id, 'pi_conflict');
    // When assignment conflicts, code sets status = CONFIRMED
    expect(updated.status).toBe(ORDER_STATUS.CONFIRMED);
    expect(updated.paymentIntentId).toBe('pi_conflict');
  });

  it('handlePaymentFailure: marks pending orders as FAILED, skips confirmed ones, and throws on missing', async () => {
    const { Order: OrderModel } = await import('../../models/order.model.js');
    const { handlePaymentFailure } =
      await import('../../services/order.service.js');

    // Pending -> FAILED
    const pending = await OrderModel.create({
      user: new mongoose.Types.ObjectId(),
      storeId: new mongoose.Types.ObjectId(),
      deliveryAddress: {
        addressLine1: 'L',
        city: 'C',
        pincode: '000',
        location: { type: 'Point', coordinates: [77, 28] },
      },
      items: [],
      itemsPrice: 0,
      deliveryFee: 0,
      deliveryDistance: 0,
      totalAmount: 0,
      status: ORDER_STATUS.PENDING_PAYMENT,
    });

    const failed = await handlePaymentFailure(pending._id);
    expect(failed.status).toBe(ORDER_STATUS.FAILED);

    // Confirmed -> stays confirmed
    const confirmed = await OrderModel.create({
      user: new mongoose.Types.ObjectId(),
      storeId: new mongoose.Types.ObjectId(),
      deliveryAddress: {
        addressLine1: 'L',
        city: 'C',
        pincode: '000',
        location: { type: 'Point', coordinates: [77, 28] },
      },
      items: [],
      itemsPrice: 0,
      deliveryFee: 0,
      deliveryDistance: 0,
      totalAmount: 0,
      status: ORDER_STATUS.CONFIRMED,
    });

    const unchanged = await handlePaymentFailure(confirmed._id);
    expect(unchanged.status).toBe(ORDER_STATUS.CONFIRMED);

    // Missing -> throws
    await expect(
      handlePaymentFailure(new mongoose.Types.ObjectId())
    ).rejects.toMatchObject({
      statusCode: HTTP_STATUS.NOT_FOUND,
    });
  });
});
