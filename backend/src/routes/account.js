'use strict';
const express = require('express');
const { Notification, SellerApplication, Order, Offer, EscrowRecord, LedgerTransaction } = require('../models');
const S = require('../validation/schemas');
const { validate } = require('../middleware/common');
const { requireAuth, requireMerchant } = require('../middleware/auth');
const { notifyAdmins } = require('../services/notify');
const { getWalletSummary } = require('../services/walletService');
const { expireDueOffers } = require('../services/offerService');
const { E } = require('../utils/errors');

const router = express.Router();
router.use(['/notifications', '/seller-applications', '/merchant', '/dashboard'], requireAuth);

// ---------- Notifications (polling) ----------
router.get('/notifications', async (req, res) => {
  const items = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean();
  const unread = await Notification.countDocuments({ user: req.user._id, readAt: null });
  res.json({ unread, items: items.map((n) => ({ id: String(n._id), type: n.type, title: n.title, body: n.body, link: n.link, readAt: n.readAt, createdAt: n.createdAt })) });
});

router.get('/notifications/unread-count', async (req, res) => {
  res.json({ unread: await Notification.countDocuments({ user: req.user._id, readAt: null }) });
});

router.post('/notifications/read-all', async (req, res) => {
  await Notification.updateMany({ user: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
  res.json({ ok: true });
});

router.post('/notifications/:id/read', validate({ params: S.idParam }), async (req, res) => {
  await Notification.updateOne({ _id: req.valid.params.id, user: req.user._id }, { $set: { readAt: new Date() } });
  res.json({ ok: true });
});

// ---------- Seller / Booster applications ----------
router.get('/seller-applications/mine', async (req, res) => {
  const apps = await SellerApplication.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({ items: apps.map((a) => ({ id: String(a._id), requestedRole: a.requestedRole, message: a.message, status: a.status, reviewNote: a.reviewNote, createdAt: a.createdAt, reviewedAt: a.reviewedAt })) });
});

router.post('/seller-applications', validate({ body: S.application }), async (req, res) => {
  const { requestedRole, message } = req.valid.body;
  if (req.user.roles.includes(requestedRole)) throw E.conflict('ALREADY_HAS_ROLE', `You are already a ${requestedRole}`);
  try {
    const app = await SellerApplication.create({ user: req.user._id, requestedRole, message });
    await notifyAdmins({ type: 'application.new', title: `New ${requestedRole} application`, body: `${req.user.displayName} applied to become a ${requestedRole}.`, link: '/admin/applications' });
    res.status(201).json({ application: { id: String(app._id), status: app.status, requestedRole } });
  } catch (err) {
    if (err.code === 11000) throw E.conflict('APPLICATION_PENDING', 'You already have a pending application for this role');
    throw err;
  }
});

// ---------- Customer dashboard ----------
router.get('/dashboard', async (req, res) => {
  const [wallet, openOrders, completedOrders, recent] = await Promise.all([
    getWalletSummary(req.user._id),
    Order.countDocuments({ buyer: req.user._id, status: { $in: ['pending_payment', 'funded', 'in_progress', 'awaiting_customer_confirmation', 'disputed'] } }),
    Order.countDocuments({ buyer: req.user._id, status: 'completed' }),
    Order.find({ buyer: req.user._id }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);
  const awaitingMe = await Order.countDocuments({ buyer: req.user._id, status: 'awaiting_customer_confirmation' });
  res.json({
    wallet,
    stats: { openOrders, completedOrders, awaitingConfirmation: awaitingMe },
    recentOrders: recent.map((o) => ({ id: String(o._id), orderNumber: o.orderNumber, title: o.offerSnapshot.title, status: o.status, total: o.total, currency: o.currency, createdAt: o.createdAt })),
  });
});

// ---------- Merchant dashboard & earnings ----------
router.get('/merchant/dashboard', requireMerchant, async (req, res) => {
  await expireDueOffers();
  const uid = req.user._id;
  const [wallet, offerCounts, orderCounts, recent] = await Promise.all([
    getWalletSummary(uid),
    Offer.aggregate([{ $match: { seller: uid } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { seller: uid } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Order.find({ seller: uid, status: { $ne: 'pending_payment' } }).sort({ createdAt: -1 }).limit(6).populate('buyer', 'displayName').lean(),
  ]);
  res.json({
    wallet,
    offers: Object.fromEntries(offerCounts.map((c) => [c._id, c.n])),
    orders: Object.fromEntries(orderCounts.map((c) => [c._id, c.n])),
    recentOrders: recent.map((o) => ({ id: String(o._id), orderNumber: o.orderNumber, title: o.offerSnapshot.title, buyer: o.buyer?.displayName, status: o.status, total: o.total, currency: o.currency, createdAt: o.createdAt })),
  });
});

router.get('/merchant/earnings', requireMerchant, async (req, res) => {
  const uid = req.user._id;
  const [wallet, released, held, history] = await Promise.all([
    getWalletSummary(uid),
    EscrowRecord.aggregate([{ $match: { seller: uid, status: 'released' } }, { $group: { _id: null, gross: { $sum: '$amount' }, fee: { $sum: '$fee' }, n: { $sum: 1 } } }]),
    EscrowRecord.find({ seller: uid, status: 'held' }).sort({ createdAt: -1 }).populate('order', 'orderNumber status offerSnapshot.title').lean(),
    LedgerTransaction.find({ users: uid, type: 'escrow_release', 'entries.user': uid }).sort({ createdAt: -1 }).limit(50).populate('order', 'orderNumber').lean(),
  ]);
  res.json({
    wallet,
    totals: released[0] ? { gross: released[0].gross, fees: released[0].fee, net: released[0].gross - released[0].fee, orders: released[0].n } : { gross: 0, fees: 0, net: 0, orders: 0 },
    pending: held.map((e) => ({ id: String(e._id), net: e.amount - e.fee, amount: e.amount, fee: e.fee, order: e.order ? { id: String(e.order._id), orderNumber: e.order.orderNumber, status: e.order.status, title: e.order.offerSnapshot?.title } : null, since: e.createdAt })),
    released: history
      .filter((t) => t.entries.some((e) => String(e.user) === String(uid) && e.account.endsWith(':available') && e.amount > 0))
      .map((t) => ({
        id: String(t._id),
        amount: t.entries.find((e) => String(e.user) === String(uid) && e.account.endsWith(':available')).amount,
        order: t.order ? { id: String(t.order._id), orderNumber: t.order.orderNumber } : null,
        memo: t.memo,
        createdAt: t.createdAt,
      })),
    payoutsSupported: false,
  });
});

module.exports = router;
