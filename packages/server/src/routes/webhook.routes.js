import express from 'express';
import { handleStripeWebhook } from '../controllers/webhook.controller.js';

const router = express.Router();

/**
 * @route POST /api/v1/webhooks/stripe
 * @desc Handle Stripe Webhook Events
 * @access Public (Signature Verified)
 */
router.post('/stripe', handleStripeWebhook);

export default router;
