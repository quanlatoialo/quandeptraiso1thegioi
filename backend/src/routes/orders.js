'use strict';
const express = require('express');
const fs = require('fs');
const { Order, OrderMessage, Review, Dispute } = require('../models');
const S = require('../validation/schemas');
const { validate } = require('../middleware/common');
const { requireAuth } = require('../middleware/auth');
const { sensitiveLimiter } = require('../middleware/rateLimits');
const { memoryUpload, saveImage, privateFilePath } = require('../middleware/upload');
const svc = require('../services/orderService');
const { notify, notifyAdmins } = require('../services/notify');
const { withTransaction } = require('../services/tx');
const { parsePagination, pageResult } = require('../utils/pagination');
const { E } = require('../utils/errors');
const { ORDER_STATUSES } = require('../models');

const router = express.Router();
router.use(['/orders', '/disputes'], requireAuth);

const populateParties = (q) => q.populate('buyer', 'displayName').populate('seller', 'displayName');

async function loadSerialized(orderId, user) {
  const order = await populateParties(Order.findById(orderId));
  const role = svc.roleInOrder(order, user);
  return svc.serializeOrder(order, role);
}

router.post('/orders', sensitiveLimiter, validate({ body: S.createOrder }), async (req, res) => {
  const { order, duplicate } = await svc.createOrder({ buyer: req.user, ...req.valid.body });
  res.status(duplicate ? 200 : 201).json({ order: await loadSerialized(order._id, req.user), duplicate });
});

router.get('/orders', validate({ query: S.orderListQuery }), async (req, res) => {
  const q = req.valid.query;
  const filter = q.as === 'seller' ? { seller: req.user._id } : { buyer: req.user._id };
  if (q.status && ORDER_STATUSES.includes(q.status)) filter.status = q.status;
  if (q.status === 'open') filter.status = { $in: ['pending_payment', 'funded', 'in_progress', 'awaiting_customer_confirmation', 'disputed'] };
  const pg = parsePagination(q, { defaultLimit: 15 });
  const [items, total] = await Promise.all([
    populateParties(Order.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit)),
    Order.countDocuments(filter),
  ]);
  res.json(pageResult(items.map((o) => svc.serializeOrder(o, q.as)), total, pg));
});

router.get('/orders/:id', validate({ params: S.idParam }), async (req, res) => {
  const { order, role } = await svc.getAccessibleOrder(req.valid.params.id, req.user);
  await order.populate([{ path: 'buyer', select: 'displayName' }, { path: 'seller', select: 'displayName' }]);
  // Admins see delivery details only if the order is in a dispute they handle.
  const data = svc.serializeOrder(order, role);
  if (role === 'admin' && !order.dispute) data.delivery = { note: '[hidden – visible to admins only during disputes]', deliveredAt: order.delivery?.deliveredAt };
  res.json({ order: data });
});

const action = (fn) => async (req, res) => {
  await fn(req);
  res.json({ order: await loadSerialized(req.valid.params.id, req.user) });
};

router.post('/orders/:id/pay', sensitiveLimiter, validate({ params: S.idParam }), action((req) => svc.payOrder({ orderId: req.valid.params.id, user: req.user, ip: req.ip })));
router.post('/orders/:id/start', validate({ params: S.idParam }), action((req) => svc.startOrder({ orderId: req.valid.params.id, user: req.user })));
router.post('/orders/:id/deliver', validate({ params: S.idParam, body: S.deliver }), action((req) => svc.sellerConfirm({ orderId: req.valid.params.id, user: req.user, deliveryNote: req.valid.body.deliveryNote })));
router.post('/orders/:id/confirm', sensitiveLimiter, validate({ params: S.idParam }), action((req) => svc.buyerConfirm({ orderId: req.valid.params.id, user: req.user, ip: req.ip })));
router.post('/orders/:id/cancel', sensitiveLimiter, validate({ params: S.idParam, body: S.cancel }), action((req) => svc.cancelOrder({ orderId: req.valid.params.id, user: req.user, reason: req.valid.body.reason, ip: req.ip })));
router.post('/orders/:id/dispute', validate({ params: S.idParam, body: S.dispute }), action((req) => svc.openDispute({ orderId: req.valid.params.id, user: req.user, reason: req.valid.body.reason, ip: req.ip })));

// ---------- Messages ----------
async function messageAccess(orderId, user) {
  const { order, role } = await svc.getAccessibleOrder(orderId, user);
  // Admins may read/write only when handling a dispute on this order.
  if (role === 'admin' && !order.dispute) throw E.forbidden('Admins can read order chats only while handling a dispute', 'DISPUTE_REQUIRED');
  return { order, role };
}

router.get('/orders/:id/messages', validate({ params: S.idParam }), async (req, res) => {
  const { order } = await messageAccess(req.valid.params.id, req.user);
  const filter = { order: order._id };
  if (typeof req.query.after === 'string' && !Number.isNaN(Date.parse(req.query.after))) filter.createdAt = { $gt: new Date(req.query.after) };
  const msgs = await OrderMessage.find(filter).sort({ createdAt: 1 }).limit(500).populate('sender', 'displayName').lean();
  await OrderMessage.updateMany({ order: order._id, readBy: { $ne: req.user._id } }, { $addToSet: { readBy: req.user._id } });
  res.json({
    items: msgs.map((m) => ({ id: String(m._id), body: m.body, senderRole: m.senderRole, sender: m.sender ? { id: String(m.sender._id), displayName: m.sender.displayName } : null, createdAt: m.createdAt })),
  });
});

router.post('/orders/:id/messages', sensitiveLimiter, validate({ params: S.idParam, body: S.message }), async (req, res) => {
  const { order, role } = await messageAccess(req.valid.params.id, req.user);
  const msg = await OrderMessage.create({ order: order._id, sender: req.user._id, senderRole: role, body: req.valid.body.body, readBy: [req.user._id] });
  const recipients = [order.buyer, order.seller].filter((u) => String(u) !== String(req.user._id));
  for (const uid of recipients) {
    await notify(uid, { type: 'order.message', title: `New message on ${order.orderNumber}`, body: req.valid.body.body.slice(0, 120), link: `/orders/${order._id}` });
  }
  res.status(201).json({ message: { id: String(msg._id), body: msg.body, senderRole: role, sender: { id: String(req.user._id), displayName: req.user.displayName }, createdAt: msg.createdAt } });
});

// ---------- Review (buyer, once, completed only) ----------
router.post('/orders/:id/review', validate({ params: S.idParam, body: S.review }), async (req, res) => {
  const review = await withTransaction(async (session) => {
    const { order, role } = await svc.getAccessibleOrder(req.valid.params.id, req.user, session);
    if (role !== 'buyer') throw E.forbidden('Only the customer can review this order');
    if (order.status !== 'completed') throw E.conflict('ORDER_NOT_COMPLETED', 'You can review only completed orders');
    const upd = await Order.updateOne({ _id: order._id, reviewed: false }, { $set: { reviewed: true } }, { session });
    if (!upd.modifiedCount) throw E.conflict('ALREADY_REVIEWED', 'You already reviewed this order');
    const [r] = await Review.create([{ order: order._id, offer: order.offer, seller: order.seller, buyer: order.buyer, ...req.valid.body }], { session });
    await notify(order.seller, { type: 'review.new', title: `New ${req.valid.body.rating}-star review`, body: req.valid.body.comment.slice(0, 120), link: `/sellers/${order.seller}` }, session);
    return r;
  });
  res.status(201).json({ review: { id: String(review._id), rating: review.rating, comment: review.comment } });
});

// ---------- Disputes (parties + admin) ----------
async function disputeAccess(disputeId, user) {
  const dispute = await Dispute.findById(disputeId).populate('evidence.author', 'displayName');
  if (!dispute) throw E.notFound('Dispute');
  const uid = String(user._id);
  const role = String(dispute.buyer) === uid ? 'buyer' : String(dispute.seller) === uid ? 'seller' : user.roles.includes('admin') ? 'admin' : null;
  if (!role) throw E.notFound('Dispute');
  return { dispute, role };
}

function serializeDispute(d) {
  return {
    id: String(d._id),
    orderId: String(d.order),
    status: d.status,
    reason: d.reason,
    openedByRole: d.openedByRole,
    createdAt: d.createdAt,
    resolution: d.resolution,
    evidence: d.evidence.map((e) => ({
      id: String(e._id),
      role: e.role,
      author: e.author && e.author.displayName ? e.author.displayName : null,
      text: e.text,
      attachments: e.attachments.map((a) => `/api/disputes/${d._id}/files/${a}`),
      at: e.at,
    })),
  };
}

router.get('/disputes/:id', validate({ params: S.idParam }), async (req, res) => {
  const { dispute, role } = await disputeAccess(req.valid.params.id, req.user);
  res.json({ dispute: serializeDispute(dispute), viewerRole: role });
});

router.post('/disputes/:id/evidence', sensitiveLimiter, memoryUpload.single('file'), validate({ params: S.idParam, body: S.evidence }), async (req, res) => {
  const { dispute, role } = await disputeAccess(req.valid.params.id, req.user);
  if (dispute.status !== 'open') throw E.conflict('DISPUTE_CLOSED', 'This dispute is already resolved');
  const attachments = req.file ? [saveImage(req.file, 'private')] : [];
  await Dispute.updateOne({ _id: dispute._id, status: 'open' }, { $push: { evidence: { author: req.user._id, role, text: req.valid.body.text, attachments } } });
  const others = [dispute.buyer, dispute.seller].filter((u) => String(u) !== String(req.user._id));
  for (const uid of others) await notify(uid, { type: 'dispute.evidence', title: 'New dispute evidence', body: req.valid.body.text.slice(0, 120), link: `/orders/${dispute.order}` });
  if (role !== 'admin') await notifyAdmins({ type: 'dispute.evidence', title: 'New dispute evidence', body: req.valid.body.text.slice(0, 120), link: `/admin/disputes/${dispute._id}` });
  const fresh = await disputeAccess(dispute._id, req.user);
  res.status(201).json({ dispute: serializeDispute(fresh.dispute) });
});

// Private evidence files: only parties of the dispute and admins.
router.get('/disputes/:id/files/:name', validate({ params: S.idParam.extend({ name: require('zod').z.string().max(80) }) }), async (req, res) => {
  const { dispute } = await disputeAccess(req.valid.params.id, req.user);
  const name = req.valid.params.name;
  const allowed = dispute.evidence.some((e) => e.attachments.includes(name));
  const p = privateFilePath(name);
  if (!allowed || !p || !fs.existsSync(p)) throw E.notFound('File');
  res.set('Cache-Control', 'private, no-store');
  res.sendFile(p);
});

module.exports = router;
