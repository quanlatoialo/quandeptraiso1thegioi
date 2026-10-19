'use strict';
const { Wallet, LedgerTransaction, EscrowRecord } = require('../models');
const { withTransaction } = require('./tx');
const { audit } = require('./notify');
const { E } = require('../utils/errors');
const { DEFAULT_CURRENCY } = require('../utils/money');

const acct = (walletId, bucket) => `wallet:${walletId}:${bucket}`;

/** Idempotent wallet creation (outside or inside a transaction). */
async function ensureWallet(userId, currency = DEFAULT_CURRENCY, session = null) {
  try {
    return await Wallet.findOneAndUpdate(
      { user: userId, currency },
      { $setOnInsert: { user: userId, currency, available: 0, held: 0 } },
      { upsert: true, new: true, session }
    );
  } catch (err) {
    if (err.code === 11000) return Wallet.findOne({ user: userId, currency }).session(session);
    throw err;
  }
}

async function getWalletSummary(userId, currency = DEFAULT_CURRENCY) {
  const wallet = await ensureWallet(userId, currency);
  // Seller pending income = escrow currently held for orders where the user is the seller.
  const [pending] = await EscrowRecord.aggregate([
    { $match: { seller: wallet.user, status: 'held', currency } },
    { $group: { _id: null, gross: { $sum: '$amount' }, fee: { $sum: '$fee' }, count: { $sum: 1 } } },
  ]);
  return {
    currency,
    available: wallet.available,
    held: wallet.held,
    pendingIncome: pending ? pending.gross - pending.fee : 0,
    pendingOrders: pending ? pending.count : 0,
    walletId: String(wallet._id),
  };
}

/**
 * Credit a confirmed deposit. Idempotent on idempotencyKey (and provider+externalRef).
 * Returns { ledger, duplicate }.
 */
async function creditDeposit({ userId, amount, idempotencyKey, provider, externalRef, ip }) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw E.badRequest('Invalid amount');
  await ensureWallet(userId);
  const existing = await LedgerTransaction.findOne({ idempotencyKey });
  if (existing) {
    if (String(existing.users[0]) !== String(userId)) throw E.conflict('IDEMPOTENCY_KEY_REUSED', 'Idempotency key already used');
    return { ledger: existing, duplicate: true };
  }
  try {
    const ledger = await withTransaction(async (session) => {
      const wallet = await Wallet.findOneAndUpdate(
        { user: userId, currency: DEFAULT_CURRENCY },
        { $inc: { available: amount } },
        { new: true, session }
      );
      const [tx] = await LedgerTransaction.create(
        [
          {
            type: 'deposit',
            amount,
            currency: DEFAULT_CURRENCY,
            users: [userId],
            idempotencyKey,
            provider,
            externalRef,
            memo: provider === 'demo' ? 'Demo top-up (no real money)' : 'Wallet top-up',
            createdBy: userId,
            entries: [
              { account: `external:${provider}`, amount: -amount },
              { account: acct(wallet._id, 'available'), wallet: wallet._id, user: userId, amount, balanceAfter: wallet.available },
            ],
          },
        ],
        { session }
      );
      await audit({ actor: userId, actorRole: 'customer', action: 'wallet.deposit', targetType: 'wallet', targetId: wallet._id, meta: { amount, provider, externalRef }, ip }, session);
      return tx;
    });
    return { ledger, duplicate: false };
  } catch (err) {
    if (err.code === 11000) {
      const dup = await LedgerTransaction.findOne({ idempotencyKey });
      if (dup) return { ledger: dup, duplicate: true };
    }
    throw err;
  }
}

/** Move buyer funds available -> held for an order. Must run inside a transaction. */
async function holdForOrder(session, order) {
  const wallet = await Wallet.findOneAndUpdate(
    { user: order.buyer, currency: order.currency, available: { $gte: order.total } },
    { $inc: { available: -order.total, held: order.total } },
    { new: true, session }
  );
  if (!wallet) {
    const w = await Wallet.findOne({ user: order.buyer, currency: order.currency }).session(session);
    throw E.payment('INSUFFICIENT_FUNDS', 'Insufficient wallet balance. Please top up your wallet.', {
      required: order.total,
      available: w ? w.available : 0,
    });
  }
  await LedgerTransaction.create(
    [
      {
        type: 'escrow_hold',
        amount: order.total,
        currency: order.currency,
        users: [order.buyer, order.seller],
        order: order._id,
        idempotencyKey: `order:${order._id}:hold`,
        memo: `Payment held in escrow for order ${order.orderNumber}`,
        createdBy: order.buyer,
        entries: [
          { account: acct(wallet._id, 'available'), wallet: wallet._id, user: order.buyer, amount: -order.total, balanceAfter: wallet.available },
          { account: acct(wallet._id, 'held'), wallet: wallet._id, user: order.buyer, amount: order.total, balanceAfter: wallet.held },
        ],
      },
    ],
    { session }
  );
  await EscrowRecord.create(
    [{ order: order._id, buyer: order.buyer, seller: order.seller, amount: order.total, fee: order.fee, currency: order.currency, status: 'held' }],
    { session }
  );
}

/** Release escrow to seller. Exactly-once guaranteed by conditional escrow update + unique ledger key. */
async function releaseEscrow(session, order, { resolution, actorId }) {
  const escrow = await EscrowRecord.findOneAndUpdate(
    { order: order._id, status: 'held' },
    { $set: { status: 'released', releasedAt: new Date(), resolution } },
    { new: true, session }
  );
  if (!escrow) throw E.conflict('ESCROW_NOT_HELD', 'Funds for this order are no longer held (already released or refunded)');
  const buyerWallet = await Wallet.findOneAndUpdate(
    { user: order.buyer, currency: escrow.currency, held: { $gte: escrow.amount } },
    { $inc: { held: -escrow.amount } },
    { new: true, session }
  );
  if (!buyerWallet) throw E.conflict('LEDGER_INCONSISTENT', 'Buyer held balance is inconsistent');
  const net = escrow.amount - escrow.fee;
  const sellerWallet = await Wallet.findOneAndUpdate(
    { user: order.seller, currency: escrow.currency },
    { $inc: { available: net } },
    { new: true, session, upsert: true }
  );
  const entries = [
    { account: acct(buyerWallet._id, 'held'), wallet: buyerWallet._id, user: order.buyer, amount: -escrow.amount, balanceAfter: buyerWallet.held },
    { account: acct(sellerWallet._id, 'available'), wallet: sellerWallet._id, user: order.seller, amount: net, balanceAfter: sellerWallet.available },
  ];
  if (escrow.fee > 0) entries.push({ account: 'platform:fees', amount: escrow.fee });
  await LedgerTransaction.create(
    [
      {
        type: 'escrow_release',
        amount: escrow.amount,
        currency: escrow.currency,
        users: [order.buyer, order.seller],
        order: order._id,
        idempotencyKey: `order:${order._id}:release`,
        memo: `${resolution === 'admin_dispute' ? 'Dispute resolved: released' : 'Released'} to seller for order ${order.orderNumber}`,
        createdBy: actorId,
        entries,
      },
    ],
    { session }
  );
  return escrow;
}

/** Refund escrow to buyer. Exactly-once guaranteed the same way as release. */
async function refundEscrow(session, order, { resolution, actorId }) {
  const escrow = await EscrowRecord.findOneAndUpdate(
    { order: order._id, status: 'held' },
    { $set: { status: 'refunded', refundedAt: new Date(), resolution } },
    { new: true, session }
  );
  if (!escrow) throw E.conflict('ESCROW_NOT_HELD', 'Funds for this order are no longer held (already released or refunded)');
  const wallet = await Wallet.findOneAndUpdate(
    { user: order.buyer, currency: escrow.currency, held: { $gte: escrow.amount } },
    { $inc: { held: -escrow.amount, available: escrow.amount } },
    { new: true, session }
  );
  if (!wallet) throw E.conflict('LEDGER_INCONSISTENT', 'Buyer held balance is inconsistent');
  await LedgerTransaction.create(
    [
      {
        type: 'escrow_refund',
        amount: escrow.amount,
        currency: escrow.currency,
        users: [order.buyer, order.seller],
        order: order._id,
        idempotencyKey: `order:${order._id}:refund`,
        memo: `Refunded to buyer for order ${order.orderNumber}`,
        createdBy: actorId,
        entries: [
          { account: acct(wallet._id, 'held'), wallet: wallet._id, user: order.buyer, amount: -escrow.amount, balanceAfter: wallet.held },
          { account: acct(wallet._id, 'available'), wallet: wallet._id, user: order.buyer, amount: escrow.amount, balanceAfter: wallet.available },
        ],
      },
    ],
    { session }
  );
  return escrow;
}

module.exports = { ensureWallet, getWalletSummary, creditDeposit, holdForOrder, releaseEscrow, refundEscrow };
