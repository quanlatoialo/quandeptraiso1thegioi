'use strict';
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const ORDER_STATUSES = [
  'pending_payment',
  'funded',
  'in_progress',
  'awaiting_customer_confirmation',
  'completed',
  'disputed',
  'cancelled',
  'refunded',
];

const historySchema = new mongoose.Schema(
  {
    from: { type: String, default: null },
    to: { type: String, required: true },
    by: { type: ObjectId, ref: 'User', default: null },
    role: { type: String, default: null }, // buyer | seller | admin | system
    note: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true },
    buyer: { type: ObjectId, ref: 'User', required: true },
    seller: { type: ObjectId, ref: 'User', required: true },
    offer: { type: ObjectId, ref: 'Offer', required: true },
    // Snapshot of the offer at the moment the order was placed.
    offerSnapshot: {
      title: String,
      type: { type: String },
      gameName: String,
      gameSlug: String,
      categoryName: String,
      region: String,
      unitLabel: String,
      unitPrice: Number,
      currency: String,
      deliveryTimeHours: Number,
      image: String,
      minPerOrder: Number,
    },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 1 },
    fee: { type: Number, default: 0, min: 0 },
    feeBps: { type: Number, default: 0 },
    total: { type: Number, required: true, min: 1 },
    currency: { type: String, enum: ['EUR'], default: 'EUR' },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending_payment' },
    paidAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    sellerConfirmedAt: { type: Date, default: null },
    buyerConfirmedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    cancelReason: { type: String, default: '' },
    stockRestored: { type: Boolean, default: false },
    // Controlled hand-over area: visible only to buyer, seller and admins handling a dispute.
    delivery: {
      note: { type: String, default: '' },
      deliveredAt: { type: Date, default: null },
    },
    dispute: { type: ObjectId, ref: 'Dispute', default: null },
    statusBeforeDispute: { type: String, default: null },
    reviewed: { type: Boolean, default: false },
    idempotencyKey: { type: String, default: null },
    history: { type: [historySchema], default: [] },
  },
  { timestamps: true, collection: 'orders' }
);
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ seller: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index(
  { buyer: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

// ---------- Order messages ----------
const orderMessageSchema = new mongoose.Schema(
  {
    order: { type: ObjectId, ref: 'Order', required: true },
    sender: { type: ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['buyer', 'seller', 'admin', 'system'], required: true },
    body: { type: String, required: true, maxlength: 2000 },
    readBy: [{ type: ObjectId, ref: 'User' }],
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'orderMessages' }
);
orderMessageSchema.index({ order: 1, createdAt: 1 });

// ---------- Disputes ----------
const evidenceSchema = new mongoose.Schema(
  {
    author: { type: ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['buyer', 'seller', 'admin'], required: true },
    text: { type: String, required: true, maxlength: 3000 },
    attachments: { type: [String], default: [] }, // private file names
    at: { type: Date, default: Date.now },
  },
  { _id: true }
);

const disputeSchema = new mongoose.Schema(
  {
    order: { type: ObjectId, ref: 'Order', required: true },
    buyer: { type: ObjectId, ref: 'User', required: true },
    seller: { type: ObjectId, ref: 'User', required: true },
    openedBy: { type: ObjectId, ref: 'User', required: true },
    openedByRole: { type: String, enum: ['buyer', 'seller'], required: true },
    reason: { type: String, required: true, maxlength: 2000 },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
    evidence: { type: [evidenceSchema], default: [] },
    resolution: {
      decision: { type: String, enum: ['refund_buyer', 'release_seller', null], default: null },
      note: { type: String, default: '' },
      restock: { type: Boolean, default: false },
      by: { type: ObjectId, ref: 'User', default: null },
      at: { type: Date, default: null },
    },
  },
  { timestamps: true, collection: 'disputes' }
);
disputeSchema.index({ order: 1 }, { unique: true, partialFilterExpression: { status: 'open' } });
disputeSchema.index({ status: 1, createdAt: -1 });

// ---------- Reviews ----------
const reviewSchema = new mongoose.Schema(
  {
    order: { type: ObjectId, ref: 'Order', required: true },
    offer: { type: ObjectId, ref: 'Offer', required: true },
    seller: { type: ObjectId, ref: 'User', required: true },
    buyer: { type: ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true, collection: 'reviews' }
);
reviewSchema.index({ order: 1 }, { unique: true });
reviewSchema.index({ seller: 1, createdAt: -1 });

// ---------- Notifications ----------
const notificationSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    link: { type: String, default: '' },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'notifications' }
);
notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });

// ---------- Audit logs ----------
const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: ObjectId, ref: 'User', default: null },
    actorRole: { type: String, default: null },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: String, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'auditLogs' }
);
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

module.exports = {
  Order: mongoose.model('Order', orderSchema),
  OrderMessage: mongoose.model('OrderMessage', orderMessageSchema),
  Dispute: mongoose.model('Dispute', disputeSchema),
  Review: mongoose.model('Review', reviewSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  AuditLog: mongoose.model('AuditLog', auditLogSchema),
  ORDER_STATUSES,
};
