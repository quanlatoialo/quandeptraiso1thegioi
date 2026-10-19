'use strict';
const crypto = require('crypto');
const { Order, Offer, User, Dispute, Wallet } = require('../models');
const { withTransaction } = require('./tx');
const wallet = require('./walletService');
const { effectiveStatus } = require('./offerService');
const { notify, notifyAdmins, audit } = require('./notify');
const { E } = require('../utils/errors');
const { mulCents, feeCents, formatCents } = require('../utils/money');
const env = require('../config/env');

/**
 * Allowed order transitions: action -> allowed source states, target state and actor roles.
 * This table is the single source of truth (also rendered in docs/order-state.md).
 */
const TRANSITIONS = {
  pay: { from: ['pending_payment'], to: 'funded', roles: ['buyer'] },
  cancel_unpaid: { from: ['pending_payment'], to: 'cancelled', roles: ['buyer', 'seller', 'admin'] },
  cancel_funded: { from: ['funded'], to: 'refunded', roles: ['buyer', 'seller'] },
  cancel_in_progress: { from: ['in_progress'], to: 'refunded', roles: ['seller'] },
  start: { from: ['funded'], to: 'in_progress', roles: ['seller'] },
  deliver: { from: ['funded', 'in_progress'], to: 'awaiting_customer_confirmation', roles: ['seller'] },
  confirm: { from: ['awaiting_customer_confirmation'], to: 'completed', roles: ['buyer'] },
  dispute: { from: ['funded', 'in_progress', 'awaiting_customer_confirmation'], to: 'disputed', roles: ['buyer', 'seller'] },
  resolve_refund: { from: ['disputed'], to: 'refunded', roles: ['admin'] },
  resolve_release: { from: ['disputed'], to: 'completed', roles: ['admin'] },
};

function newOrderNumber() {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  return `G2G-${ymd}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/** Determine the caller's relationship to an order. Admin access to private data is limited by caller. */
function roleInOrder(order, user) {
  const uid = String(user._id);
  if (String(order.buyer._id || order.buyer) === uid) return 'buyer';
  if (String(order.seller._id || order.seller) === uid) return 'seller';
  if (user.roles.includes('admin')) return 'admin';
  return null;
}

/** Load an order the user may access; outsiders get 404 to avoid leaking existence. */
async function getAccessibleOrder(orderId, user, session = null) {
  const order = await Order.findById(orderId).session(session);
  if (!order) throw E.notFound('Order');
  const role = roleInOrder(order, user);
  if (!role) throw E.notFound('Order');
  return { order, role };
}

function assertAllowed(action, order, role) {
  const t = TRANSITIONS[action];
  if (!t.roles.includes(role)) throw E.forbidden(`As ${role} you cannot perform "${action}" on this order`);
  if (!t.from.includes(order.status)) {
    throw E.conflict('INVALID_ORDER_STATE', `Cannot ${action.replace('_', ' ')} an order in status "${order.status}"`);
  }
  return t;
}

/** Atomic conditional state change; fails if another request changed the status first. */
async function transition(session, order, action, { by, role, note = '', set = {} }) {
  const t = TRANSITIONS[action];
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: { $in: t.from } },
    {
      $set: { status: t.to, ...set },
      $push: { history: { from: order.status, to: t.to, by, role, note, at: new Date() } },
    },
    { new: true, session }
  );
  if (!updated) throw E.conflict('ORDER_STATE_CHANGED', 'The order was modified by another action. Reload and try again.');
  return updated;
}

/** Put purchased quantity back into stock where it makes sense. */
async function restock(session, order) {
  const offer = await Offer.findOneAndUpdate(
    { _id: order.offer },
    { $inc: { stock: order.quantity, soldCount: -order.quantity } },
    { new: true, session }
  );
  if (offer && offer.status === 'sold_out' && offer.stock > 0 && offer.expiresAt && offer.expiresAt > new Date()) {
    await Offer.updateOne({ _id: offer._id, status: 'sold_out' }, { $set: { status: 'active' } }, { session });
  }
}

// ---------------------------------------------------------------------------

async function createOrder({ buyer, offerId, quantity, idempotencyKey }) {
  if (idempotencyKey) {
    const existing = await Order.findOne({ buyer: buyer._id, idempotencyKey });
    if (existing) return { order: existing, duplicate: true };
  }
  const offer = await Offer.findById(offerId).populate('game', 'name slug').populate('category', 'name');
  if (!offer || (offer.moderation && offer.moderation.removed)) throw E.notFound('Offer');
  if (String(offer.seller) === String(buyer._id)) {
    throw E.forbidden('You cannot buy your own offer', 'OWN_OFFER');
  }
  const status = effectiveStatus(offer);
  if (status === 'expired') throw E.conflict('OFFER_EXPIRED', 'This offer has expired');
  if (status === 'paused' || status === 'draft') throw E.conflict('OFFER_UNAVAILABLE', 'This offer is not available for purchase');
  if (status === 'sold_out' || offer.stock < 1) throw E.conflict('OUT_OF_STOCK', 'This offer is sold out');
  if (offer.type === 'account' && quantity !== 1) throw E.badRequest('Account offers are sold one per order', undefined, 'INVALID_QUANTITY');
  if (quantity < offer.minPerOrder) {
    throw E.badRequest(`Minimum order quantity is ${offer.minPerOrder}`, { minPerOrder: offer.minPerOrder }, 'BELOW_MIN_QUANTITY');
  }
  if (quantity > offer.stock) {
    throw E.conflict('INSUFFICIENT_STOCK', `Only ${offer.stock} available`, { stock: offer.stock });
  }
  const seller = await User.findById(offer.seller).select('status');
  if (!seller || seller.status !== 'active') throw E.conflict('SELLER_UNAVAILABLE', 'The seller is currently unavailable');

  // Amounts are always recomputed on the server from trusted data.
  const subtotal = mulCents(offer.unitPrice, quantity);
  const feeBps = env.PLATFORM_FEE_BPS;
  const fee = feeCents(subtotal, feeBps); // commission deducted from seller on release
  const total = subtotal;

  try {
    const order = await Order.create({
      orderNumber: newOrderNumber(),
      buyer: buyer._id,
      seller: offer.seller,
      offer: offer._id,
      offerSnapshot: {
        title: offer.title,
        type: offer.type,
        gameName: offer.game.name,
        gameSlug: offer.game.slug,
        categoryName: offer.category.name,
        region: offer.region,
        unitLabel: offer.unitLabel,
        unitPrice: offer.unitPrice,
        currency: offer.currency,
        deliveryTimeHours: offer.deliveryTimeHours,
        image: offer.images[0] || '',
        minPerOrder: offer.minPerOrder,
      },
      quantity,
      subtotal,
      fee,
      feeBps,
      total,
      currency: offer.currency,
      status: 'pending_payment',
      idempotencyKey: idempotencyKey || null,
      history: [{ from: null, to: 'pending_payment', by: buyer._id, role: 'buyer', note: 'Order created' }],
    });
    return { order, duplicate: false };
  } catch (err) {
    if (err.code === 11000 && idempotencyKey) {
      const existing = await Order.findOne({ buyer: buyer._id, idempotencyKey });
      if (existing) return { order: existing, duplicate: true };
    }
    throw err;
  }
}

/**
 * Pay an order from wallet balance and hold the money in escrow.
 * Single transaction: stock decrement + wallet debit + ledger + escrow + order status.
 * Idempotent: paying an already-funded order returns it unchanged.
 */
async function payOrder({ orderId, user, ip }) {
  const pre = await getAccessibleOrder(orderId, user);
  if (pre.role === 'buyer' && pre.order.paidAt) return { order: pre.order, duplicate: true };
  assertAllowed('pay', pre.order, pre.role);
  await wallet.ensureWallet(pre.order.buyer);
  await wallet.ensureWallet(pre.order.seller);

  const order = await withTransaction(async (session) => {
    const order = await Order.findById(orderId).session(session);
    if (order.paidAt) return order; // concurrent duplicate already succeeded
    assertAllowed('pay', order, 'buyer');
    const now = new Date();
    const offer = await Offer.findOneAndUpdate(
      {
        _id: order.offer,
        status: 'active',
        'moderation.removed': { $ne: true },
        expiresAt: { $gt: now },
        stock: { $gte: order.quantity },
        unitPrice: order.offerSnapshot.unitPrice,
      },
      { $inc: { stock: -order.quantity, soldCount: order.quantity } },
      { new: true, session }
    );
    if (!offer) {
      const cur = await Offer.findById(order.offer).session(session);
      if (!cur || cur.moderation?.removed) throw E.conflict('OFFER_UNAVAILABLE', 'This offer is no longer available');
      const st = effectiveStatus(cur, now);
      if (st === 'expired') throw E.conflict('OFFER_EXPIRED', 'This offer has expired');
      if (st !== 'active' && st !== 'sold_out') throw E.conflict('OFFER_UNAVAILABLE', 'This offer is not available for purchase');
      if (cur.unitPrice !== order.offerSnapshot.unitPrice) throw E.conflict('PRICE_CHANGED', 'The price changed since you placed the order. Cancel and order again.');
      throw E.conflict('INSUFFICIENT_STOCK', `Only ${cur.stock} available`, { stock: cur.stock });
    }
    if (offer.stock === 0) {
      await Offer.updateOne({ _id: offer._id }, { $set: { status: 'sold_out' } }, { session });
    }
    await wallet.holdForOrder(session, order);
    const updated = await transition(session, order, 'pay', {
      by: user._id,
      role: 'buyer',
      note: `Paid ${formatCents(order.total, order.currency)} from wallet, held in escrow`,
      set: { paidAt: now },
    });
    await notify(order.seller, {
      type: 'order.new',
      title: `New order ${order.orderNumber}`,
      body: `${order.quantity} × ${order.offerSnapshot.title} – payment is held in escrow.`,
      link: `/orders/${order._id}`,
    }, session);
    await audit({ actor: user._id, actorRole: 'buyer', action: 'order.pay', targetType: 'order', targetId: order._id, meta: { total: order.total }, ip }, session);
    return updated;
  });
  return { order, duplicate: false };
}

async function startOrder({ orderId, user }) {
  return withTransaction(async (session) => {
    const { order, role } = await getAccessibleOrder(orderId, user, session);
    assertAllowed('start', order, role);
    const updated = await transition(session, order, 'start', { by: user._id, role, set: { startedAt: new Date() }, note: 'Seller started working on the order' });
    await notify(order.buyer, { type: 'order.started', title: `Order ${order.orderNumber} in progress`, body: 'The seller has started processing your order.', link: `/orders/${order._id}` }, session);
    return updated;
  });
}

/** Seller/Booster confirms their part is done (does NOT release funds). */
async function sellerConfirm({ orderId, user, deliveryNote }) {
  return withTransaction(async (session) => {
    const { order, role } = await getAccessibleOrder(orderId, user, session);
    if (role === 'seller' && order.sellerConfirmedAt) return order; // idempotent
    assertAllowed('deliver', order, role);
    const now = new Date();
    const updated = await transition(session, order, 'deliver', {
      by: user._id,
      role,
      note: 'Seller confirmed delivery / completion',
      set: { sellerConfirmedAt: now, 'delivery.note': deliveryNote || '', 'delivery.deliveredAt': now, startedAt: order.startedAt || now },
    });
    await notify(order.buyer, {
      type: 'order.delivered',
      title: `Order ${order.orderNumber} delivered`,
      body: 'The seller marked the order as delivered. Please check and confirm receipt.',
      link: `/orders/${order._id}`,
    }, session);
    return updated;
  });
}

/**
 * Customer confirms receipt. Funds are released only when BOTH confirmations exist
 * and the order is not disputed (enforced by the transition table + checks below).
 */
async function buyerConfirm({ orderId, user, ip }) {
  return withTransaction(async (session) => {
    const { order, role } = await getAccessibleOrder(orderId, user, session);
    if (role === 'buyer' && order.status === 'completed') return order; // idempotent
    assertAllowed('confirm', order, role);
    if (!order.sellerConfirmedAt) throw E.conflict('SELLER_NOT_CONFIRMED', 'The seller has not confirmed completion yet');
    if (order.dispute && order.status === 'disputed') throw E.conflict('ORDER_DISPUTED', 'Order is under dispute');
    const now = new Date();
    const updated = await transition(session, order, 'confirm', {
      by: user._id,
      role,
      note: 'Customer confirmed receipt – funds released to seller',
      set: { buyerConfirmedAt: now, completedAt: now },
    });
    await wallet.releaseEscrow(session, updated, { resolution: 'normal', actorId: user._id });
    await notify(order.seller, {
      type: 'order.completed',
      title: `Order ${order.orderNumber} completed`,
      body: `${formatCents(order.total - order.fee, order.currency)} was credited to your wallet.`,
      link: `/orders/${order._id}`,
    }, session);
    await audit({ actor: user._id, actorRole: 'buyer', action: 'escrow.release', targetType: 'order', targetId: order._id, meta: { amount: order.total, fee: order.fee }, ip }, session);
    return updated;
  });
}

async function cancelOrder({ orderId, user, reason, ip }) {
  return withTransaction(async (session) => {
    const { order, role } = await getAccessibleOrder(orderId, user, session);
    let action;
    if (order.status === 'pending_payment') action = 'cancel_unpaid';
    else if (order.status === 'funded') action = 'cancel_funded';
    else if (order.status === 'in_progress') action = 'cancel_in_progress';
    else throw E.conflict('INVALID_ORDER_STATE', `Orders in status "${order.status}" cannot be cancelled${order.status === 'awaiting_customer_confirmation' ? ' – open a dispute instead' : ''}`);
    if (action === 'cancel_in_progress' && role === 'buyer') {
      throw E.forbidden('The seller already started this order. Contact the seller or open a dispute.', 'CANCEL_NOT_ALLOWED');
    }
    assertAllowed(action, order, role);
    const now = new Date();
    const set = { cancelReason: reason || '', cancelledAt: now };
    if (action !== 'cancel_unpaid') {
      set.refundedAt = now;
      set.stockRestored = true; // not delivered yet – quantity goes back to stock
    }
    const updated = await transition(session, order, action, { by: user._id, role, note: reason ? `Cancelled: ${reason}` : 'Cancelled', set });
    if (action !== 'cancel_unpaid') {
      await wallet.refundEscrow(session, updated, { resolution: 'cancellation', actorId: user._id });
      await restock(session, updated);
      await audit({ actor: user._id, actorRole: role, action: 'escrow.refund', targetType: 'order', targetId: order._id, meta: { amount: order.total, reason: 'cancellation' }, ip }, session);
    }
    const other = role === 'buyer' ? order.seller : order.buyer;
    await notify(other, {
      type: 'order.cancelled',
      title: `Order ${order.orderNumber} cancelled`,
      body: action === 'cancel_unpaid' ? 'The unpaid order was cancelled.' : 'The order was cancelled and the payment refunded to the buyer.',
      link: `/orders/${order._id}`,
    }, session);
    if (role === 'admin') {
      await notify(order.buyer, { type: 'order.cancelled', title: `Order ${order.orderNumber} cancelled by admin`, body: reason || '', link: `/orders/${order._id}` }, session);
    }
    return updated;
  });
}

async function openDispute({ orderId, user, reason, ip }) {
  return withTransaction(async (session) => {
    const { order, role } = await getAccessibleOrder(orderId, user, session);
    assertAllowed('dispute', order, role);
    const [dispute] = await Dispute.create(
      [{ order: order._id, buyer: order.buyer, seller: order.seller, openedBy: user._id, openedByRole: role, reason, evidence: [{ author: user._id, role, text: reason }] }],
      { session }
    );
    const updated = await transition(session, order, 'dispute', {
      by: user._id,
      role,
      note: 'Dispute opened – funds remain held',
      set: { dispute: dispute._id, statusBeforeDispute: order.status },
    });
    const other = role === 'buyer' ? order.seller : order.buyer;
    const payload = { type: 'dispute.opened', title: `Dispute opened on ${order.orderNumber}`, body: reason.slice(0, 140), link: `/orders/${order._id}` };
    await notify(other, payload, session);
    await notifyAdmins({ ...payload, link: `/admin/disputes/${dispute._id}` }, session);
    await audit({ actor: user._id, actorRole: role, action: 'dispute.open', targetType: 'order', targetId: order._id, meta: { disputeId: String(dispute._id) }, ip }, session);
    return { order: updated, dispute };
  });
}

/**
 * Admin dispute resolution – an exception path separate from the normal two-sided confirmation.
 * decision: 'refund_buyer' | 'release_seller' (full amount only in this version).
 */
async function resolveDispute({ disputeId, admin, decision, note, restock: wantRestock, ip }) {
  return withTransaction(async (session) => {
    const dispute = await Dispute.findOneAndUpdate(
      { _id: disputeId, status: 'open' },
      { $set: { status: 'resolved', resolution: { decision, note, restock: false, by: admin._id, at: new Date() } } },
      { new: true, session }
    );
    if (!dispute) {
      const exists = await Dispute.exists({ _id: disputeId }).session(session);
      if (!exists) throw E.notFound('Dispute');
      throw E.conflict('DISPUTE_ALREADY_RESOLVED', 'This dispute has already been resolved');
    }
    const order = await Order.findById(dispute.order).session(session);
    const now = new Date();
    let updated;
    if (decision === 'refund_buyer') {
      // Only restock when nothing was handed over yet; delivered accounts are never re-listed.
      const canRestock = !order.delivery?.deliveredAt && !order.sellerConfirmedAt;
      if (wantRestock && !canRestock) {
        throw E.badRequest('Stock cannot be restored: the seller already delivered this order', undefined, 'RESTOCK_NOT_ALLOWED');
      }
      updated = await transition(session, order, 'resolve_refund', {
        by: admin._id,
        role: 'admin',
        note: `Dispute resolved – refunded to buyer. ${note}`,
        set: { refundedAt: now, stockRestored: !!wantRestock },
      });
      await wallet.refundEscrow(session, updated, { resolution: 'admin_dispute', actorId: admin._id });
      if (wantRestock) {
        await restock(session, updated);
        await Dispute.updateOne({ _id: dispute._id }, { $set: { 'resolution.restock': true } }, { session });
      }
    } else {
      updated = await transition(session, order, 'resolve_release', {
        by: admin._id,
        role: 'admin',
        note: `Dispute resolved – released to seller. ${note}`,
        set: { completedAt: now },
      });
      await wallet.releaseEscrow(session, updated, { resolution: 'admin_dispute', actorId: admin._id });
    }
    const body = `Decision: ${decision === 'refund_buyer' ? 'full refund to buyer' : 'full payment released to seller'}. ${note}`;
    for (const uid of [order.buyer, order.seller]) {
      await notify(uid, { type: 'dispute.resolved', title: `Dispute on ${order.orderNumber} resolved`, body, link: `/orders/${order._id}` }, session);
    }
    await audit({ actor: admin._id, actorRole: 'admin', action: `dispute.resolve.${decision}`, targetType: 'dispute', targetId: dispute._id, meta: { orderId: String(order._id), amount: order.total, note, restock: !!wantRestock }, ip }, session);
    return { dispute, order: updated };
  });
}

/** Serialize an order for a given viewer role. Delivery details only for parties/admin. */
function serializeOrder(order, role) {
  const o = order.toObject ? order.toObject() : order;
  const person = (p) => (p && p.displayName ? { id: String(p._id), displayName: p.displayName } : { id: String(p) });
  return {
    id: String(o._id),
    orderNumber: o.orderNumber,
    viewerRole: role,
    buyer: person(o.buyer),
    seller: person(o.seller),
    offerId: String(o.offer && o.offer._id ? o.offer._id : o.offer),
    offerSnapshot: o.offerSnapshot,
    quantity: o.quantity,
    subtotal: o.subtotal,
    fee: o.fee,
    total: o.total,
    sellerReceives: o.total - o.fee,
    currency: o.currency,
    status: o.status,
    paidAt: o.paidAt,
    startedAt: o.startedAt,
    sellerConfirmedAt: o.sellerConfirmedAt,
    buyerConfirmedAt: o.buyerConfirmedAt,
    completedAt: o.completedAt,
    cancelledAt: o.cancelledAt,
    refundedAt: o.refundedAt,
    cancelReason: o.cancelReason,
    stockRestored: o.stockRestored,
    delivery: role ? o.delivery : undefined,
    disputeId: o.dispute ? String(o.dispute._id || o.dispute) : null,
    reviewed: o.reviewed,
    history: o.history,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    allowedActions: role ? allowedActionsFor(o, role) : [],
  };
}

function allowedActionsFor(o, role) {
  const acts = [];
  for (const [name, t] of Object.entries(TRANSITIONS)) {
    if (!t.roles.includes(role) || !t.from.includes(o.status)) continue;
    if (name === 'resolve_refund' || name === 'resolve_release') continue; // via dispute screen
    if (name === 'confirm' && !o.sellerConfirmedAt) continue;
    acts.push(name);
  }
  if (role === 'buyer' && o.status === 'completed' && !o.reviewed) acts.push('review');
  return acts;
}

module.exports = {
  TRANSITIONS,
  roleInOrder,
  getAccessibleOrder,
  createOrder,
  payOrder,
  startOrder,
  sellerConfirm,
  buyerConfirm,
  cancelOrder,
  openDispute,
  resolveDispute,
  serializeOrder,
  Wallet,
};
