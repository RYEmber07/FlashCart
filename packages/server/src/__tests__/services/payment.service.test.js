import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { HTTP_STATUS, ORDER_STATUS } from '../../constants.js';
import ApiError from '../../utils/apiError.js';

const createPaymentIntentMock = jest.fn();

await jest.unstable_mockModule('stripe', () => ({
  default: class Stripe {
    constructor() {
      return {
        paymentIntents: {
          create: createPaymentIntentMock,
        },
      };
    }
  },
}));

const { Order } = await import('../../models/order.model.js');
const { createPaymentIntent } = await import('../../services/payment.service.js');

const buildOrder = async (overrides = {}) => {
  return await Order.create({
    user: new mongoose.Types.ObjectId(),
    storeId: new mongoose.Types.ObjectId(),
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
        product: new mongoose.Types.ObjectId(),
        name: 'Test Product',
        quantity: 1,
        price: 199,
        unit: '1 pc',
        image: 'https://example.com/product.png',
      },
    ],
    itemsPrice: 199,
    deliveryFee: 20,
    totalAmount: 219,
    deliveryDistance: 2,
    status: ORDER_STATUS.PENDING_PAYMENT,
    ...overrides,
  });
};

describe('payment.service createPaymentIntent', () => {
  beforeEach(async () => {
    createPaymentIntentMock.mockReset();
    await Order.deleteMany({});
  });

  it('creates a payment intent and stores the Stripe payment intent id', async () => {
    const order = await buildOrder();
    createPaymentIntentMock.mockResolvedValue({
      id: 'pi_123',
      client_secret: 'secret_123',
    });

    const result = await createPaymentIntent(order._id);
    const updatedOrder = await Order.findById(order._id);

    expect(result).toEqual({
      clientSecret: 'secret_123',
      paymentIntentId: 'pi_123',
    });
    expect(createPaymentIntentMock).toHaveBeenCalledWith({
      amount: 21900,
      currency: 'inr',
      metadata: {
        orderId: order._id.toString(),
        userId: order.user.toString(),
      },
    });
    expect(updatedOrder.paymentIntentId).toBe('pi_123');
  });

  it('rejects missing orders', async () => {
    await expect(
      createPaymentIntent(new mongoose.Types.ObjectId())
    ).rejects.toMatchObject({
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: 'Order not found',
    });
  });

  it('rejects orders that are not awaiting payment', async () => {
    const order = await buildOrder({ status: ORDER_STATUS.CONFIRMED });

    await expect(createPaymentIntent(order._id)).rejects.toMatchObject({
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: 'Order is not in pending payment status',
    });
  });

  it('translates Stripe failures into ApiError', async () => {
    const order = await buildOrder();
    createPaymentIntentMock.mockRejectedValue(new Error('Stripe unavailable'));

    const error = await createPaymentIntent(order._id).catch(
      (caughtError) => caughtError
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      message: 'Failed to initiate payment with Stripe',
    });
  });
});
