'use strict';
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;
const { OFFER_TYPES } = require('./catalog');

const OFFER_STATUSES = ['draft', 'active', 'paused', 'expired', 'sold_out'];
const MAX_DURATION_DAYS = 30;

const offerSchema = new mongoose.Schema(
  {
    seller: { type: ObjectId, ref: 'User', required: true },
    game: { type: ObjectId, ref: 'Game', required: true },
    category: { type: ObjectId, ref: 'Category', required: true },
    type: { type: String, enum: OFFER_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 5000 },
    images: { type: [String], default: [] },
    region: { type: String, default: '' },
    unitLabel: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 1, validate: Number.isSafeInteger }, // minor units
    currency: { type: String, enum: ['EUR'], default: 'EUR' },
    stock: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    minPerOrder: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    deliveryTimeHours: { type: Number, required: true, min: 1, max: 24 * 60 },
    durationDays: { type: Number, required: true, min: 1, max: MAX_DURATION_DAYS },
    status: { type: String, enum: OFFER_STATUSES, default: 'draft' },
    publishedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    soldCount: { type: Number, default: 0 },
    // Admin moderation: a removed offer can never be bought or re-activated by the owner.
    moderation: {
      removed: { type: Boolean, default: false },
      reason: { type: String, default: '' },
      by: { type: ObjectId, ref: 'User', default: null },
      at: { type: Date, default: null },
    },
  },
  { timestamps: true, collection: 'offers' }
);

offerSchema.index({ status: 1, expiresAt: 1 });
offerSchema.index({ game: 1, type: 1, status: 1, publishedAt: -1 });
offerSchema.index({ seller: 1, createdAt: -1 });
offerSchema.index({ unitPrice: 1 });
offerSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Offer', offerSchema);
module.exports.OFFER_STATUSES = OFFER_STATUSES;
module.exports.MAX_DURATION_DAYS = MAX_DURATION_DAYS;
