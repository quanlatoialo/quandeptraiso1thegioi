'use strict';
const express = require('express');
const {
  User, SellerApplication, Game, Category, Offer, Order, Dispute, LedgerTransaction, AuditLog, EscrowRecord, Wallet, OrderMessage,
} = require('../models');
const S = require('../validation/schemas');
const { validate } = require('../middleware/common');
const { requireAdmin } = require('../middleware/auth');
const { withTransaction } = require('../services/tx');
const { notify, audit } = require('../services/notify');
const orderSvc = require('../services/orderService');
const { serializeOffer } = require('../services/offerService');
const { parsePagination, pageResult, escapeRegex } = require('../utils/pagination');
const { E } = require('../utils/errors');

const router = express.Router();
router.use(requireAdmin);

const ip = (req) => req.ip;

// ---------- Dashboard (real data) ----------
router.get('/stats', async (req, res) => {
  const now = new Date();
  const [users, merchants, activeOffers, ordersByStatus, openDisputes, pendingApps, escrowHeld, deposits, recentAudit] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ roles: { $in: ['seller', 'booster'] } }),
    Offer.countDocuments({ status: 'active', expiresAt: { $gt: now }, 'moderation.removed': { $ne: true } }),
    Order.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Dispute.countDocuments({ status: 'open' }),
    SellerApplication.countDocuments({ status: 'pending' }),
    EscrowRecord.aggregate([{ $match: { status: 'held' } }, { $group: { _id: null, total: { $sum: '$amount' }, n: { $sum: 1 } } }]),
    LedgerTransaction.aggregate([{ $match: { type: 'deposit' } }, { $group: { _id: null, total: { $sum: '$amount' }, n: { $sum: 1 } } }]),
    AuditLog.find().sort({ createdAt: -1 }).limit(8).populate('actor', 'displayName').lean(),
  ]);
  const walletTotals = await Wallet.aggregate([{ $group: { _id: null, available: { $sum: '$available' }, held: { $sum: '$held' } } }]);
  res.json({
    users,
    merchants,
    activeOffers,
    orders: Object.fromEntries(ordersByStatus.map((o) => [o._id, o.n])),
    openDisputes,
    pendingApplications: pendingApps,
    escrowHeld: escrowHeld[0] ? { total: escrowHeld[0].total, count: escrowHeld[0].n } : { total: 0, count: 0 },
    demoDeposits: deposits[0] ? { total: deposits[0].total, count: deposits[0].n } : { total: 0, count: 0 },
    walletTotals: walletTotals[0] ? { available: walletTotals[0].available, held: walletTotals[0].held } : { available: 0, held: 0 },
    recentAudit: recentAudit.map((a) => ({ id: String(a._id), action: a.action, actor: a.actor?.displayName || 'system', targetType: a.targetType, targetId: a.targetId, createdAt: a.createdAt })),
  });
});

// ---------- Users ----------
router.get('/users', validate({ query: S.adminListQuery }), async (req, res) => {
  const q = req.valid.query;
  const filter = {};
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    filter.$or = [{ email: rx }, { displayName: rx }];
  }
  if (q.status && ['active', 'banned'].includes(q.status)) filter.status = q.status;
  const pg = parsePagination(q, { defaultLimit: 20 });
  const [items, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(), User.countDocuments(filter)]);
  res.json(pageResult(items.map((u) => ({ id: String(u._id), email: u.email, displayName: u.displayName, roles: u.roles, status: u.status, banReason: u.banReason, bannedAt: u.bannedAt, createdAt: u.createdAt })), total, pg));
});

router.post('/users/:id/ban', validate({ params: S.idParam, body: S.banUser }), async (req, res) => {
  if (String(req.valid.params.id) === String(req.user._id)) throw E.badRequest('You cannot ban yourself');
  const user = await User.findById(req.valid.params.id);
  if (!user) throw E.notFound('User');
  user.status = 'banned';
  user.banReason = req.valid.body.reason;
  user.bannedAt = new Date();
  user.bannedBy = req.user._id;
  user.tokenVersion += 1;
  await user.save();
  await audit({ actor: req.user._id, actorRole: 'admin', action: 'user.ban', targetType: 'user', targetId: user._id, meta: { reason: req.valid.body.reason }, ip: ip(req) });
  res.json({ ok: true });
});

router.post('/users/:id/unban', validate({ params: S.idParam }), async (req, res) => {
  const user = await User.findById(req.valid.params.id);
  if (!user) throw E.notFound('User');
  user.status = 'active';
  user.banReason = null;
  user.bannedAt = null;
  await user.save();
  await audit({ actor: req.user._id, actorRole: 'admin', action: 'user.unban', targetType: 'user', targetId: user._id, ip: ip(req) });
  res.json({ ok: true });
});

router.put('/users/:id/roles', validate({ params: S.idParam, body: S.setRoles }), async (req, res) => {
  const roles = Array.from(new Set(['customer', ...req.valid.body.roles]));
  if (String(req.valid.params.id) === String(req.user._id) && !roles.includes('admin')) throw E.badRequest('You cannot remove your own admin role');
  const user = await User.findById(req.valid.params.id);
  if (!user) throw E.notFound('User');
  const before = user.roles;
  user.roles = roles;
  await user.save();
  await audit({ actor: req.user._id, actorRole: 'admin', action: 'user.roles', targetType: 'user', targetId: user._id, meta: { before, after: roles }, ip: ip(req) });
  res.json({ ok: true, roles });
});

// ---------- Seller / Booster applications ----------
router.get('/applications', async (req, res) => {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
  const items = await SellerApplication.find({ status }).sort({ createdAt: 1 }).populate('user', 'displayName email roles createdAt').lean();
  res.json({ items: items.map((a) => ({ id: String(a._id), user: a.user ? { id: String(a.user._id), displayName: a.user.displayName, email: a.user.email, roles: a.user.roles } : null, requestedRole: a.requestedRole, message: a.message, status: a.status, reviewNote: a.reviewNote, createdAt: a.createdAt, reviewedAt: a.reviewedAt })) });
});

router.post('/applications/:id/review', validate({ params: S.idParam, body: S.reviewApplication }), async (req, res) => {
  const { decision, note } = req.valid.body;
  await withTransaction(async (session) => {
    const app = await SellerApplication.findOneAndUpdate(
      { _id: req.valid.params.id, status: 'pending' },
      { $set: { status: decision === 'approve' ? 'approved' : 'rejected', reviewedBy: req.user._id, reviewNote: note, reviewedAt: new Date() } },
      { new: true, session }
    );
    if (!app) throw E.conflict('APPLICATION_NOT_PENDING', 'Application not found or already reviewed');
    if (decision === 'approve') await User.updateOne({ _id: app.user }, { $addToSet: { roles: app.requestedRole } }, { session });
    await notify(app.user, {
      type: 'application.reviewed',
      title: decision === 'approve' ? `You are now a ${app.requestedRole}!` : `Your ${app.requestedRole} application was rejected`,
      body: note || '',
      link: decision === 'approve' ? '/seller' : '/become-seller',
    }, session);
    await audit({ actor: req.user._id, actorRole: 'admin', action: `application.${decision}`, targetType: 'sellerApplication', targetId: app._id, meta: { role: app.requestedRole, note }, ip: ip(req) }, session);
  });
  res.json({ ok: true });
});

// ---------- Games & categories ----------
router.get('/games', async (req, res) => {
  const games = await Game.find().sort({ name: 1 }).lean();
  const cats = await Category.find().sort({ name: 1 }).lean();
  res.json({ items: games.map((g) => ({ ...g, id: String(g._id), categories: cats.filter((c) => String(c.game) === String(g._id)).map((c) => ({ ...c, id: String(c._id) })) })) });
});

router.post('/games', validate({ body: S.game }), async (req, res) => {
  const g = await Game.create(req.valid.body);
  await audit({ actor: req.user._id, actorRole: 'admin', action: 'game.create', targetType: 'game', targetId: g._id, meta: { name: g.name }, ip: ip(req) });
  res.status(201).json({ game: g });
});

router.put('/games/:id', validate({ params: S.idParam, body: S.game }), async (req, res) => {
  const g = await Game.findByIdAndUpdate(req.valid.params.id, { $set: req.valid.body }, { new: true, runValidators: true });
  if (!g) throw E.notFound('Game');
  await audit({ actor: req.user._id, actorRole: 'admin', action: 'game.update', targetType: 'game', targetId: g._id, meta: req.valid.body, ip: ip(req) });
  res.json({ game: g });
});

router.post('/categories', validate({ body: S.category }), async (req, res) => {
  if (!(await Game.exists({ _id: req.valid.body.game }))) throw E.badRequest('Game not found');
  const c = await Category.create(req.valid.body);
  await audit({ actor: req.user._id, actorRole: 'admin', action: 'category.create', targetType: 'category', targetId: c._id, meta: { name: c.name }, ip: ip(req) });
  res.status(201).json({ category: c });
});

router.put('/categories/:id', validate({ params: S.idParam, body: S.category }), async (req, res) => {
  const existing = await Category.findById(req.valid.params.id);
  if (!existing) throw E.notFound('Category');
  if (existing.type !== req.valid.body.type && (await Offer.exists({ category: existing._id }))) {
    throw E.conflict('CATEGORY_IN_USE', 'Cannot change the offer type of a category that already has offers');
  }
  Object.assign(existing, req.valid.body);
  await existing.save();
  await audit({ actor: req.user._id, actorRole: 'admin', action: 'category.update', targetType: 'category', targetId: existing._id, meta: req.valid.body, ip: ip(req) });
  res.json({ category: existing });
});

// ---------- Offers moderation ----------
router.get('/offers', validate({ query: S.adminListQuery }), async (req, res) => {
  const q = req.valid.query;
  const filter = {};
  if (q.status && ['draft', 'active', 'paused', 'expired', 'sold_out'].includes(q.status)) filter.status = q.status;
  if (q.status === 'removed') filter['moderation.removed'] = true;
  if (q.type && ['account', 'item', 'boosting'].includes(q.type)) filter.type = q.type;
  if (q.q) filter.title = new RegExp(escapeRegex(q.q), 'i');
  const pg = parsePagination(q, { defaultLimit: 20 });
  const [items, total] = await Promise.all([
    Offer.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).populate('game', 'name slug imageUrl').populate('category', 'name slug').populate('seller', 'displayName country createdAt').lean(),
    Offer.countDocuments(filter),
  ]);
  res.json(pageResult(items.map((o) => serializeOffer(o)), total, pg));
});

router.post('/offers/:id/moderate', validate({ params: S.idParam, body: S.moderateOffer }), async (req, res) => {
  const { removed, reason } = req.valid.body;
  const offer = await Offer.findById(req.valid.params.id);
  if (!offer) throw E.notFound('Offer');
  offer.moderation = { removed, reason: removed ? reason : '', by: req.user._id, at: new Date() };
  if (removed && offer.status === 'active') offer.status = 'paused';
  await offer.save();
  await notify(offer.seller, { type: 'offer.moderated', title: removed ? 'Your offer was removed by moderation' : 'Your offer was restored', body: `${offer.title}${reason ? ` – ${reason}` : ''}`, link: '/seller/offers' });
  await audit({ actor: req.user._id, actorRole: 'admin', action: removed ? 'offer.remove' : 'offer.restore', targetType: 'offer', targetId: offer._id, meta: { reason }, ip: ip(req) });
  res.json({ ok: true });
});

// ---------- Orders ----------
router.get('/orders', validate({ query: S.adminListQuery }), async (req, res) => {
  const q = req.valid.query;
  const filter = {};
  if (q.status) filter.status = q.status;
  if (q.q) filter.orderNumber = new RegExp(escapeRegex(q.q), 'i');
  const pg = parsePagination(q, { defaultLimit: 20 });
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).populate('buyer', 'displayName').populate('seller', 'displayName'),
    Order.countDocuments(filter),
  ]);
  res.json(pageResult(items.map((o) => { const s = orderSvc.serializeOrder(o, 'admin'); delete s.delivery; return s; }), total, pg));
});

router.post('/orders/:id/cancel', validate({ params: S.idParam, body: S.cancel }), async (req, res) => {
  await orderSvc.cancelOrder({ orderId: req.valid.params.id, user: req.user, reason: req.valid.body.reason, ip: ip(req) });
  await audit({ actor: req.user._id, actorRole: 'admin', action: 'order.cancel', targetType: 'order', targetId: req.valid.params.id, meta: { reason: req.valid.body.reason }, ip: ip(req) });
  res.json({ ok: true });
});

// ---------- Disputes ----------
router.get('/disputes', async (req, res) => {
  const status = ['open', 'resolved'].includes(req.query.status) ? req.query.status : 'open';
  const items = await Dispute.find({ status }).sort({ createdAt: status === 'open' ? 1 : -1 }).limit(100).populate('buyer', 'displayName').populate('seller', 'displayName').populate('order', 'orderNumber total currency offerSnapshot.title').lean();
  res.json({
    items: items.map((d) => ({ id: String(d._id), status: d.status, reason: d.reason, openedByRole: d.openedByRole, buyer: d.buyer?.displayName, seller: d.seller?.displayName, order: d.order ? { id: String(d.order._id), orderNumber: d.order.orderNumber, total: d.order.total, currency: d.order.currency, title: d.order.offerSnapshot?.title } : null, resolution: d.resolution, createdAt: d.createdAt })),
  });
});

router.get('/disputes/:id', validate({ params: S.idParam }), async (req, res) => {
  const d = await Dispute.findById(req.valid.params.id).populate('evidence.author', 'displayName').lean();
  if (!d) throw E.notFound('Dispute');
  const order = await Order.findById(d.order).populate('buyer', 'displayName').populate('seller', 'displayName');
  const messages = await OrderMessage.find({ order: d.order }).sort({ createdAt: 1 }).populate('sender', 'displayName').lean();
  const ledger = await LedgerTransaction.find({ order: d.order }).sort({ createdAt: 1 }).lean();
  await audit({ actor: req.user._id, actorRole: 'admin', action: 'dispute.view', targetType: 'dispute', targetId: d._id, ip: ip(req) });
  res.json({
    dispute: {
      id: String(d._id),
      status: d.status,
      reason: d.reason,
      openedByRole: d.openedByRole,
      createdAt: d.createdAt,
      resolution: d.resolution,
      evidence: d.evidence.map((e) => ({ id: String(e._id), role: e.role, author: e.author?.displayName, text: e.text, attachments: e.attachments.map((a) => `/api/disputes/${d._id}/files/${a}`), at: e.at })),
    },
    order: orderSvc.serializeOrder(order, 'admin'),
    canRestock: !order.delivery?.deliveredAt && !order.sellerConfirmedAt,
    messages: messages.map((m) => ({ id: String(m._id), body: m.body, senderRole: m.senderRole, sender: m.sender?.displayName, createdAt: m.createdAt })),
    ledger: ledger.map((t) => ({ id: String(t._id), type: t.type, amount: t.amount, memo: t.memo, createdAt: t.createdAt })),
  });
});

router.post('/disputes/:id/resolve', validate({ params: S.idParam, body: S.resolveDispute }), async (req, res) => {
  const { decision, note, restock } = req.valid.body;
  const result = await orderSvc.resolveDispute({ disputeId: req.valid.params.id, admin: req.user, decision, note, restock, ip: ip(req) });
  res.json({ ok: true, orderStatus: result.order.status });
});

// ---------- Ledger / wallet transactions ----------
router.get('/ledger', validate({ query: S.adminListQuery }), async (req, res) => {
  const q = req.valid.query;
  const filter = {};
  if (q.type && ['deposit', 'escrow_hold', 'escrow_release', 'escrow_refund'].includes(q.type)) filter.type = q.type;
  const pg = parsePagination(q, { defaultLimit: 25 });
  const [items, total] = await Promise.all([
    LedgerTransaction.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).populate('users', 'displayName').populate('order', 'orderNumber').lean(),
    LedgerTransaction.countDocuments(filter),
  ]);
  res.json(pageResult(items.map((t) => ({
    id: String(t._id),
    type: t.type,
    amount: t.amount,
    currency: t.currency,
    users: (t.users || []).map((u) => u?.displayName),
    order: t.order ? { id: String(t.order._id), orderNumber: t.order.orderNumber } : null,
    entries: t.entries.map((e) => ({ account: e.account, amount: e.amount })),
    balanced: t.entries.reduce((s, e) => s + e.amount, 0) === 0,
    memo: t.memo,
    provider: t.provider,
    idempotencyKey: t.idempotencyKey,
    createdAt: t.createdAt,
  })), total, pg));
});

/** Reconciliation: wallet balances must equal the sum of ledger entries per wallet bucket. */
router.get('/ledger/reconcile', async (req, res) => {
  const sums = await LedgerTransaction.aggregate([
    { $unwind: '$entries' },
    { $match: { 'entries.wallet': { $ne: null } } },
    { $group: { _id: '$entries.account', total: { $sum: '$entries.amount' } } },
  ]);
  const byAccount = Object.fromEntries(sums.map((s) => [s._id, s.total]));
  const wallets = await Wallet.find().populate('user', 'displayName').lean();
  const mismatches = [];
  for (const w of wallets) {
    const a = byAccount[`wallet:${w._id}:available`] || 0;
    const h = byAccount[`wallet:${w._id}:held`] || 0;
    if (a !== w.available || h !== w.held) mismatches.push({ wallet: String(w._id), user: w.user?.displayName, available: w.available, ledgerAvailable: a, held: w.held, ledgerHeld: h });
  }
  const escrowHeld = await EscrowRecord.aggregate([{ $match: { status: 'held' } }, { $group: { _id: null, t: { $sum: '$amount' } } }]);
  const totalHeld = wallets.reduce((s, w) => s + w.held, 0);
  res.json({ walletsChecked: wallets.length, mismatches, escrowHeld: escrowHeld[0]?.t || 0, walletsHeld: totalHeld, escrowMatchesWallets: (escrowHeld[0]?.t || 0) === totalHeld });
});

// ---------- Audit logs ----------
router.get('/audit-logs', validate({ query: S.adminListQuery }), async (req, res) => {
  const q = req.valid.query;
  const filter = {};
  if (q.q) filter.action = new RegExp(escapeRegex(q.q), 'i');
  const pg = parsePagination(q, { defaultLimit: 30 });
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).populate('actor', 'displayName email').lean(),
    AuditLog.countDocuments(filter),
  ]);
  res.json(pageResult(items.map((a) => ({ id: String(a._id), action: a.action, actor: a.actor ? a.actor.displayName : 'system', actorRole: a.actorRole, targetType: a.targetType, targetId: a.targetId, meta: a.meta, ip: a.ip, createdAt: a.createdAt })), total, pg));
});

module.exports = router;
