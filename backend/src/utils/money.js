'use strict';

const SUPPORTED_CURRENCIES = ['EUR'];
const DEFAULT_CURRENCY = 'EUR';

/** Ensure value is a safe non-negative integer amount in minor units (cents). */
function assertCents(v, name = 'amount') {
  if (!Number.isSafeInteger(v) || v < 0) {
    throw new Error(`${name} must be a non-negative safe integer (minor units)`);
  }
  return v;
}

/** Multiply integer cents by integer quantity with overflow check. */
function mulCents(unitCents, qty) {
  assertCents(unitCents, 'unitPrice');
  if (!Number.isSafeInteger(qty) || qty <= 0) throw new Error('quantity must be a positive integer');
  const r = unitCents * qty;
  if (!Number.isSafeInteger(r)) throw new Error('amount overflow');
  return r;
}

/** Fee in basis points, rounded down (integer math only). */
function feeCents(amount, bps) {
  assertCents(amount);
  if (!bps) return 0;
  return Math.floor((amount * bps) / 10000);
}

function formatCents(cents, currency = DEFAULT_CURRENCY) {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

module.exports = { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY, assertCents, mulCents, feeCents, formatCents };
