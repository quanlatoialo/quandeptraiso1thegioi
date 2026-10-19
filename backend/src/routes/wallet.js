'use strict';
const express = require('express');
const { LedgerTransaction, EscrowRecord } = require('../models');
const S = require('../validation/schemas');
const { validate } = require('../middleware/common');
const { requireAuth } = require('../middleware/auth');
const { sensitiveLimiter } = require('../middleware/rateLimits');
const walletSvc = require('../services/walletService');
const { getPaymentProvider } = require('../services/payments');
const env = require('../config/env');
const { parsePagination, pageResult } = require('../utils/pagination');
const { AppError, E } = require('../utils/errors');

const router = express.Router();
router.use('/wallet', requireAuth);

router.get('/wallet', async (req, res) => {
  const summary = await walletSvc.getWalletSummary(req.user._id);
  const provider = getPaymentProvider();
  res.json({
    wallet: summary,
    payments: {
      provider: provider ? provider.name : null,
      demo: provider ? provider.name === 'demo' : false,
      enabled: !!provider,
      maxDemoDeposit: env.DEMO_DEPOSIT_MAX_CENTS,
      payoutsSupported: false,
    },
  });
});

/** Ledger history for the current user (only transactions where they are a party). */
router.get('/wallet/transactions', async (req, res) => {
  const pg = parsePagination(req.query, { defaultLimit: 20 });
  const filter = { users: req.user._id };
  if (typeof req.query.type === 'string' && ['deposit', 'escrow_hold', 'escrow_release', 'escrow_refund'].includes(req.query.type)) {
    filter.type = req.query.type;
  }
  const [items, total] = await Promise.all([
    LedgerTransaction.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).populate('order', 'orderNumber').lean(),
    LedgerTransaction.countDocuments(filter),
  ]);
  const uid = String(req.user._id);
  res.json(
    pageResult(
      items.map((t) => {
        // Net effect on THIS user's available and held balances.
        const mine = t.entries.filter((e) => e.user && String(e.user) === uid);
        const availableDelta = mine.filter((e) => e.account.endsWith(':available')).reduce((s, e) => s + e.amount, 0);
        const heldDelta = mine.filter((e) => e.account.endsWith(':held')).reduce((s, e) => s + e.amount, 0);
        return {
          id: String(t._id),
          type: t.type,
          amount: t.amount,
          currency: t.currency,
          availableDelta,
          heldDelta,
          memo: t.memo,
          provider: t.provider,
          order: t.order ? { id: String(t.order._id), orderNumber: t.order.orderNumber } : null,
          createdAt: t.createdAt,
        };
      }),
      total,
      pg
    )
  );
});

/** Escrow currently held for my sales = pending income (not yet in my wallet). */
router.get('/wallet/pending', async (req, res) => {
  const items = await EscrowRecord.find({ seller: req.user._id, status: 'held' }).sort({ createdAt: -1 }).populate('order', 'orderNumber status offerSnapshot.title').lean();
  res.json({
    items: items.map((e) => ({
      id: String(e._id),
      amount: e.amount,
      fee: e.fee,
      net: e.amount - e.fee,
      currency: e.currency,
      order: e.order ? { id: String(e.order._id), orderNumber: e.order.orderNumber, status: e.order.status, title: e.order.offerSnapshot?.title } : null,
      since: e.createdAt,
    })),
  });
});

/** Top-up via the configured payment adapter. In the MVP this is the DEMO adapter (no real money). */
router.post('/wallet/deposits', sensitiveLimiter, validate({ body: S.deposit }), async (req, res) => {
  const provider = getPaymentProvider();
  if (!provider) throw new AppError(503, 'PAYMENTS_UNAVAILABLE', 'Top-ups are not available in this environment');
  const { amount, idempotencyKey } = req.valid.body;
  if (provider.name === 'demo' && amount > env.DEMO_DEPOSIT_MAX_CENTS) {
    throw E.badRequest(`Demo top-ups are limited to ${(env.DEMO_DEPOSIT_MAX_CENTS / 100).toFixed(2)} EUR`, undefined, 'AMOUNT_TOO_LARGE');
  }
  const result = await provider.createTopUp({ userId: String(req.user._id), amount, currency: 'EUR', idempotencyKey });
  if (result.status !== 'succeeded') {
    // Real providers: wallet will be credited by the verified webhook, never by the redirect.
    return res.status(202).json({ status: 'pending', redirectUrl: result.redirectUrl || null });
  }
  const { ledger, duplicate } = await walletSvc.creditDeposit({
    userId: req.user._id,
    amount,
    idempotencyKey: `deposit:${req.user._id}:${idempotencyKey}`,
    provider: provider.name,
    externalRef: result.externalRef,
    ip: req.ip,
  });
  const summary = await walletSvc.getWalletSummary(req.user._id);
  res.status(duplicate ? 200 : 201).json({ status: 'succeeded', duplicate, transactionId: String(ledger._id), wallet: summary });
});

module.exports = router;
