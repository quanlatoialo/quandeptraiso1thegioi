'use strict';
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

// ---------- Seller / Booster applications ----------
const sellerApplicationSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    requestedRole: { type: String, enum: ['seller', 'booster'], required: true },
    message: { type: String, required: true, maxlength: 1000 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: ObjectId, ref: 'User', default: null },
    reviewNote: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'sellerApplications' }
);
sellerApplicationSchema.index({ status: 1, createdAt: -1 });
// Only one pending application per user+role.
sellerApplicationSchema.index(
  { user: 1, requestedRole: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

// ---------- Games ----------
const gameSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, default: '', maxlength: 1000 },
    imageUrl: { type: String, default: '' },
    regions: { type: [String], default: [] },
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'games' }
);
gameSchema.index({ slug: 1 }, { unique: true });
gameSchema.index({ name: 'text' });

// ---------- Categories (per game & offer type) ----------
const OFFER_TYPES = ['account', 'item', 'boosting'];
const categorySchema = new mongoose.Schema(
  {
    game: { type: ObjectId, ref: 'Game', required: true },
    type: { type: String, enum: OFFER_TYPES, required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, lowercase: true, trim: true },
    // What one unit of stock means, e.g. "account", "1,000 gold", "1 rank division".
    unitLabel: { type: String, required: true, maxlength: 40 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'categories' }
);
categorySchema.index({ game: 1, slug: 1 }, { unique: true });

module.exports = {
  SellerApplication: mongoose.model('SellerApplication', sellerApplicationSchema),
  Game: mongoose.model('Game', gameSchema),
  Category: mongoose.model('Category', categorySchema),
  OFFER_TYPES,
};
