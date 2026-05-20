import mongoose from 'mongoose';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { ORDER_STATUS, RIDER_STATUS } from '../../constants.js';
import {
  Category,
  DarkStore,
  Order,
  Product,
  Rider,
  StoreInventory,
  User,
} from '../../models/index.js';
import { confirmOrderPayment } from '../../services/order.service.js';

const createOrderFixture = async ({ stock = 5, quantity = 2 } = {}) => {
  const user = await User.create({
    name: 'Order Test User',
    contactNumber: `9${Math.floor(Math.random() * 1_000_000_000)
      .toString()
      .padStart(9, '0')}`,
    password: 'OrderTestPass123',
  });

  const category = await Category.create({
    name: `Order Test Category ${new mongoose.Types.ObjectId()}`,
    image: 'https://example.com/category.png',
    description: 'Test category',
  });

  const store = await DarkStore.create({
    name: `Order Test Store ${new mongoose.Types.ObjectId()}`,
    address: '123 Test Street',
    location: {
      type: 'Point',
      coordinates: [77.04, 28.41],
    },
    serviceRadius: 10,
  });

  const product = await Product.create({
    name: `Order Test Product ${new mongoose.Types.ObjectId()}`,
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

  const rider = await Rider.create({
    name: 'Ready Rider',
    phone: `8${Math.floor(Math.random() * 1_000_000_000)
      .toString()
      .padStart(9, '0')}`,
    password: 'RiderPass123',
    status: RIDER_STATUS.AVAILABLE,
    store: store._id,
  });

  const order = await Order.create({
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

describe('order.service confirmOrderPayment', () => {
  beforeEach(async () => {
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

  it('confirms the order, deducts stock, and assigns a rider', async () => {
    const { order, rider, product, store } = await createOrderFixture({
      stock: 5,
      quantity: 2,
    });

    const updatedOrder = await confirmOrderPayment(order._id, 'pi_success');
    const updatedInventory = await StoreInventory.findOne({
      storeId: store._id,
      productId: product._id,
    });
    const updatedRider = await Rider.findById(rider._id);

    expect(updatedOrder.status).toBe(ORDER_STATUS.OUT_FOR_DELIVERY);
    expect(updatedOrder.paymentIntentId).toBe('pi_success');
    expect(updatedOrder.assignedRider.toString()).toBe(rider._id.toString());
    expect(updatedInventory.stock).toBe(3);
    expect(updatedRider.status).toBe(RIDER_STATUS.BUSY);
    expect(updatedRider.currentOrder.toString()).toBe(order._id.toString());
  });

  it('marks the order failed and rolls stock back when inventory is insufficient', async () => {
    const { order, product, store, rider } = await createOrderFixture({
      stock: 1,
      quantity: 2,
    });

    const failedOrder = await confirmOrderPayment(order._id, 'pi_insufficient');
    const updatedInventory = await StoreInventory.findOne({
      storeId: store._id,
      productId: product._id,
    });
    const updatedRider = await Rider.findById(rider._id);

    expect(failedOrder.status).toBe(ORDER_STATUS.FAILED);
    expect(failedOrder.paymentIntentId).toBe('pi_insufficient');
    expect(updatedInventory.stock).toBe(1);
    expect(updatedRider.status).toBe(RIDER_STATUS.AVAILABLE);
    expect(updatedRider.currentOrder).toBeNull();
  });
});
