import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const constructEventMock = jest.fn();
const confirmOrderPaymentMock = jest.fn();
const handlePaymentFailureMock = jest.fn();
const emitMock = jest.fn();
const toMock = jest.fn(() => ({ emit: emitMock }));
const getIOMock = jest.fn(() => ({ to: toMock }));

await jest.unstable_mockModule('stripe', () => ({
  default: class Stripe {
    constructor() {
      return {
        webhooks: {
          constructEvent: constructEventMock,
        },
      };
    }
  },
}));

await jest.unstable_mockModule('../../services/order.service.js', () => ({
  confirmOrderPayment: confirmOrderPaymentMock,
  handlePaymentFailure: handlePaymentFailureMock,
}));

await jest.unstable_mockModule('../../utils/socket.js', () => ({
  getIO: getIOMock,
}));

const { handleStripeWebhook } = await import(
  '../../controllers/webhook.controller.js'
);

const createRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('webhook.controller handleStripeWebhook', () => {
  beforeEach(() => {
    constructEventMock.mockReset();
    confirmOrderPaymentMock.mockReset();
    handlePaymentFailureMock.mockReset();
    emitMock.mockReset();
    toMock.mockReset();
    toMock.mockImplementation(() => ({ emit: emitMock }));
    getIOMock.mockReset();
    getIOMock.mockImplementation(() => ({ to: toMock }));
  });

  it('returns 400 when Stripe signature verification fails', async () => {
    const req = {
      headers: {
        'stripe-signature': 'bad-signature',
      },
      body: Buffer.from('payload'),
    };
    const res = createRes();
    const next = jest.fn();

    constructEventMock.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    await handleStripeWebhook(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Webhook Error: Invalid signature');
    expect(next).not.toHaveBeenCalled();
  });

  it('confirms the order and emits a payment success event', async () => {
    const req = {
      headers: {
        'stripe-signature': 'sig',
      },
      body: Buffer.from('payload'),
    };
    const res = createRes();
    const next = jest.fn();

    constructEventMock.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_success',
          metadata: { orderId: 'order_123' },
        },
      },
    });

    await handleStripeWebhook(req, res, next);

    expect(confirmOrderPaymentMock).toHaveBeenCalledWith(
      'order_123',
      'pi_success'
    );
    expect(toMock).toHaveBeenCalledWith('order_123');
    expect(emitMock).toHaveBeenCalledWith('payment_status', {
      status: 'CONFIRMED',
      message: 'Payment received successfully',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('marks the order failed and emits a payment failure event', async () => {
    const req = {
      headers: {
        'stripe-signature': 'sig',
      },
      body: Buffer.from('payload'),
    };
    const res = createRes();
    const next = jest.fn();

    constructEventMock.mockReturnValue({
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          metadata: { orderId: 'order_456' },
        },
      },
    });

    await handleStripeWebhook(req, res, next);

    expect(handlePaymentFailureMock).toHaveBeenCalledWith('order_456');
    expect(toMock).toHaveBeenCalledWith('order_456');
    expect(emitMock).toHaveBeenCalledWith('payment_status', {
      status: 'FAILED',
      message: 'Payment failed',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
    expect(next).not.toHaveBeenCalled();
  });
});
