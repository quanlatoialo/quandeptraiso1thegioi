'use strict';
const { Offer, Game, Category } = require('../models');
const { MAX_DURATION_DAYS } = require('../models/Offer');
const { E } = require('../utils/errors');

const DAY_MS = 24 * 3600 * 1000;

function computeExpiry(from, durationDays) {
  const days = Math.min(MAX_DURATION_DAYS, Math.max(1, durationDays));
  return new Date(from.getTime() + days * DAY_MS);
}

/** Status as seen right now (expiry is enforced lazily, not only by the background job). */
function effectiveStatus(offer, now = new Date()) {
  if (['active', 'paused', 'sold_out'].includes(offer.status) && offer.expiresAt && offer.expiresAt <= now) {
    return 'expired';
  }
  return offer.status;
}

/** Background/lazy sweep: mark offers whose expiry passed as expired. Safe to run repeatedly. */
async function expireDueOffers(now = new Date()) {
  const r = await Offer.updateMany(
    { status: { $in: ['active', 'paused', 'sold_out'] }, expiresAt: { $lte: now } },
    { $set: { status: 'expired' } }
  );
  return r.modifiedCount || 0;
}

/** Validates game/category coherence and returns derived fields. */
async function resolveCatalog({ gameId, categoryId, region }) {
  const game = await Game.findOne({ _id: gameId, active: true });
  if (!game) throw E.badRequest('Game not found or inactive', undefined, 'INVALID_GAME');
  const category = await Category.findOne({ _id: categoryId, game: game._id, active: true });
  if (!category) throw E.badRequest('Category does not belong to this game', undefined, 'INVALID_CATEGORY');
  if (region && game.regions.length && !game.regions.includes(region)) {
    throw E.badRequest('Region is not available for this game', undefined, 'INVALID_REGION');
  }
  if (!region && game.regions.length) {
    throw E.badRequest('Region/server is required for this game', undefined, 'REGION_REQUIRED');
  }
  return { game, category };
}

function checkMerchantRoleForType(user, type) {
  if (type === 'boosting' && !user.roles.includes('booster')) {
    throw E.forbidden('Only approved Boosters can publish boosting offers', 'ROLE_REQUIRED');
  }
  if ((type === 'account' || type === 'item') && !user.roles.includes('seller')) {
    throw E.forbidden('Only approved Sellers can publish account or item offers', 'ROLE_REQUIRED');
  }
}

function checkQuantities({ type, stock, minPerOrder }) {
  if (type === 'account' && minPerOrder !== 1) {
    throw E.badRequest('Account offers are sold one per order (minPerOrder must be 1)', undefined, 'INVALID_MIN_PER_ORDER');
  }
  if (stock > 0 && minPerOrder > stock) {
    throw E.badRequest('Minimum per order cannot exceed stock', undefined, 'INVALID_MIN_PER_ORDER');
  }
}

async function createOffer(user, data) {
  const { game, category } = await resolveCatalog({ gameId: data.gameId, categoryId: data.categoryId, region: data.region });
  checkMerchantRoleForType(user, category.type);
  checkQuantities({ type: category.type, stock: data.stock, minPerOrder: data.minPerOrder });
  const now = new Date();
  const publish = data.publish === true;
  if (publish && data.stock < 1) throw E.badRequest('Stock must be at least 1 to publish', undefined, 'INVALID_STOCK');
  return Offer.create({
    seller: user._id,
    game: game._id,
    category: category._id,
    type: category.type,
    unitLabel: category.unitLabel,
    title: data.title,
    description: data.description,
    images: data.images || [],
    region: data.region || '',
    unitPrice: data.unitPrice,
    currency: 'EUR',
    stock: data.stock,
    minPerOrder: data.minPerOrder,
    deliveryTimeHours: data.deliveryTimeHours,
    durationDays: data.durationDays,
    status: publish ? 'active' : 'draft',
    publishedAt: publish ? now : null,
    expiresAt: publish ? computeExpiry(now, data.durationDays) : null,
  });
}

async function getOwnedOffer(user, offerId) {
  const offer = await Offer.findOne({ _id: offerId, seller: user._id });
  if (!offer) throw E.notFound('Offer');
  if (offer.moderation && offer.moderation.removed) {
    throw E.forbidden('This offer was removed by moderation', 'OFFER_REMOVED');
  }
  return offer;
}

async function updateOffer(user, offerId, data) {
  const offer = await getOwnedOffer(user, offerId);
  if (data.gameId || data.categoryId || data.region !== undefined) {
    const { game, category } = await resolveCatalog({
      gameId: data.gameId || offer.game,
      categoryId: data.categoryId || offer.category,
      region: data.region !== undefined ? data.region : offer.region,
    });
    checkMerchantRoleForType(user, category.type);
    offer.game = game._id;
    offer.category = category._id;
    offer.type = category.type;
    offer.unitLabel = category.unitLabel;
    if (data.region !== undefined) offer.region = data.region;
  }
  for (const k of ['title', 'description', 'images', 'unitPrice', 'minPerOrder', 'deliveryTimeHours', 'durationDays']) {
    if (data[k] !== undefined) offer[k] = data[k];
  }
  checkQuantities({ type: offer.type, stock: offer.stock, minPerOrder: offer.minPerOrder });
  await offer.save();
  return offer;
}

/** Set absolute stock. Uses a conditional update so concurrent purchases are not overwritten blindly. */
async function setStock(user, offerId, { stock, expectedStock }) {
  const offer = await getOwnedOffer(user, offerId);
  checkQuantities({ type: offer.type, stock, minPerOrder: offer.minPerOrder });
  const filter = { _id: offer._id, seller: user._id };
  if (expectedStock !== undefined) filter.stock = expectedStock;
  const now = new Date();
  const update = { $set: { stock } };
  const updated = await Offer.findOneAndUpdate(filter, update, { new: true });
  if (!updated) throw E.conflict('STOCK_CHANGED', 'Stock changed since you loaded it (a purchase may have happened). Reload and try again.');
  // Keep status coherent with stock.
  if (stock === 0 && updated.status === 'active') {
    updated.status = 'sold_out';
    await updated.save();
  } else if (stock > 0 && updated.status === 'sold_out' && updated.expiresAt && updated.expiresAt > now) {
    updated.status = 'active';
    await updated.save();
  }
  return updated;
}

async function changeStatus(user, offerId, action, { durationDays } = {}) {
  const offer = await getOwnedOffer(user, offerId);
  const now = new Date();
  const status = effectiveStatus(offer, now);
  switch (action) {
    case 'publish': {
      if (status !== 'draft') throw E.conflict('INVALID_OFFER_STATE', 'Only drafts can be published');
      if (offer.stock < 1) throw E.badRequest('Stock must be at least 1 to publish', undefined, 'INVALID_STOCK');
      const days = durationDays || offer.durationDays;
      offer.durationDays = days;
      offer.status = 'active';
      offer.publishedAt = now;
      offer.expiresAt = computeExpiry(now, days);
      break;
    }
    case 'pause':
      if (status !== 'active' && status !== 'sold_out') throw E.conflict('INVALID_OFFER_STATE', 'Only active offers can be paused');
      offer.status = 'paused';
      break;
    case 'resume':
      if (status !== 'paused') throw E.conflict('INVALID_OFFER_STATE', status === 'expired' ? 'Offer expired – renew it instead' : 'Only paused offers can be resumed');
      offer.status = offer.stock > 0 ? 'active' : 'sold_out';
      break;
    case 'renew': {
      // Renew / re-list: new period of at most 30 days counted from now.
      if (!['active', 'paused', 'expired', 'sold_out'].includes(status)) throw E.conflict('INVALID_OFFER_STATE', 'This offer cannot be renewed');
      const days = durationDays || offer.durationDays;
      offer.durationDays = days;
      offer.publishedAt = now;
      offer.expiresAt = computeExpiry(now, days);
      offer.status = offer.stock > 0 ? 'active' : 'sold_out';
      break;
    }
    default:
      throw E.badRequest('Unknown action');
  }
  await offer.save();
  return offer;
}

function serializeOffer(offer, { includeSeller = true } = {}) {
  const o = offer.toObject ? offer.toObject() : offer;
  const status = effectiveStatus(o);
  return {
    id: String(o._id),
    title: o.title,
    description: o.description,
    type: o.type,
    images: o.images,
    region: o.region,
    unitLabel: o.unitLabel,
    unitPrice: o.unitPrice,
    currency: o.currency,
    stock: o.stock,
    minPerOrder: o.minPerOrder,
    deliveryTimeHours: o.deliveryTimeHours,
    durationDays: o.durationDays,
    status,
    publishedAt: o.publishedAt,
    expiresAt: o.expiresAt,
    soldCount: o.soldCount,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    removed: !!(o.moderation && o.moderation.removed),
    moderationReason: o.moderation && o.moderation.removed ? o.moderation.reason : undefined,
    game: o.game && o.game.name ? { id: String(o.game._id), name: o.game.name, slug: o.game.slug, imageUrl: o.game.imageUrl } : { id: String(o.game) },
    category: o.category && o.category.name ? { id: String(o.category._id), name: o.category.name, slug: o.category.slug } : { id: String(o.category) },
    seller:
      includeSeller && o.seller && o.seller.displayName
        ? { id: String(o.seller._id), displayName: o.seller.displayName, country: o.seller.country, memberSince: o.seller.createdAt }
        : { id: String(o.seller && o.seller._id ? o.seller._id : o.seller) },
  };
}

module.exports = {
  computeExpiry,
  effectiveStatus,
  expireDueOffers,
  createOffer,
  updateOffer,
  setStock,
  changeStatus,
  serializeOffer,
  getOwnedOffer,
  DAY_MS,
};
