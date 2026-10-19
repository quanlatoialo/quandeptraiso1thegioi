'use strict';
/**
 * Payment adapter layer.
 *
 * Every provider implements:
 *   name: string
 *   isEnabled(): boolean
 *   createTopUp({ userId, amount, currency, idempotencyKey }) ->
 *       { status: 'succeeded' | 'pending', externalRef, redirectUrl? }
 *   verifyWebhook(rawBody, headers) -> { eventId, type, externalRef, userId, amount } (throws if signature invalid)
 *
 * Rules for real providers (not implemented in the MVP):
 *  - Credit the wallet ONLY from a verified webhook event (never from a browser redirect).
 *  - Use the provider event id / payment id as externalRef; the unique index
 *    (provider, externalRef) + idempotencyKey makes duplicate events harmless.
 */
const env = require('../../config/env');

const demoAdapter = {
  name: 'demo',
  isEnabled() {
    return env.ENABLE_DEMO_PAYMENTS;
  },
  async createTopUp({ userId, amount, idempotencyKey }) {
    // Simulated instant success. NO real money is moved.
    return { status: 'succeeded', externalRef: `demo_${userId}_${idempotencyKey}`, amount };
  },
  verifyWebhook() {
    throw new Error('Demo adapter has no webhooks');
  },
};

const providers = { demo: demoAdapter };

function getPaymentProvider() {
  const p = providers[env.PAYMENT_PROVIDER];
  if (!p || !p.isEnabled()) return null;
  return p;
}

module.exports = { getPaymentProvider, providers };
