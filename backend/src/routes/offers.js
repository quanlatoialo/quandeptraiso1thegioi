'use strict';
const express = require('express');
const { Offer, Game } = require('../models');
const S = require('../validation/schemas');
const { validate } = require('../middleware/common');
const { requireAuth, requireMerchant, requireRole } = require('../middleware/auth');
const { memoryUpload, saveImage } = require('../middleware/upload');
const { sensitiveLimiter } = require('../middleware/rateLimits');
const svc = require('../services/offerService');
const { parsePagination, pageResult, escapeRegex } = require('../utils/pagination');
const { E } = require('../utils/errors');

const router = express.Router();

const populateOffer = (q) => q.populate('game', 'name slug imageUrl').populate('category', 'name slug').populate('seller', 'displayName country createdAt status');

// ---------- Public listing ----------
router.get('/offers', validate({ query: S.offerListQuery }), async (req, res) => {
  const q = req.valid.query;
  const now = new Date();
  const filter = { status: 'active', expiresAt: { $gt: now }, stock: { $gt: 0 }, 'moderation.removed': { $ne: true } };
  if (q.type) filter.type = q.type;
  if (q.region) filter.region = q.region;
  if (q.category) filter.category = q.category;
  if (q.seller) filter.seller = q.seller;
  if (q.game) {
    const game = await Game.findOne({ slug: String(q.game).toLowerCase() }).select('_id');
    if (!game) return res.json(pageResult([], 0, parsePagination(q)));
    filter.game = game._id;
  }
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    filter.unitPrice = {};
    if (q.minPrice !== undefined) filter.unitPrice.$gte = q.minPrice;
    if (q.maxPrice !== undefined) filter.unitPrice.$lte = q.maxPrice;
  }
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    const games = await Game.find({ name: rx }).select('_id');
    filter.$or = [{ title: rx }, { game: { $in: games.map((g) => g._id) } }];
  }
  const sort = q.sort === 'price_asc' ? { unitPrice: 1, _id: 1 } : q.sort === 'price_desc' ? { unitPrice: -1, _id: 1 } : { publishedAt: -1, _id: -1 };
  const pg = parsePagination(q);
  const [items, total] = await Promise.all([
    populateOffer(Offer.find(filter).sort(sort).skip(pg.skip).limit(pg.limit)).lean(),
    Offer.countDocuments(filter),
  ]);
  res.json(pageResult(items.filter((o) => o.seller && o.seller.status === 'active').map((o) => svc.serializeOffer(o)), total, pg));
});

// ---------- Merchant: own offers ----------
router.get('/me/offers', requireMerchant, async (req, res) => {
  await svc.expireDueOffers();
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const filter = { seller: req.user._id };
  if (status && ['draft', 'active', 'paused', 'expired', 'sold_out'].includes(status)) filter.status = status;
  const offers = await populateOffer(Offer.find(filter).sort({ createdAt: -1 })).lean();
  res.json({ items: offers.map((o) => svc.serializeOffer(o)) });
});

router.get('/offers/:id', validate({ params: S.idParam }), async (req, res) => {
  const offer = await populateOffer(Offer.findById(req.valid.params.id)).lean();
  if (!offer) throw E.notFound('Offer');
  const isOwner = req.user && String(offer.seller._id) === String(req.user._id);
  const isAdmin = req.user && req.user.roles.includes('admin');
  // Drafts and moderated offers are only visible to their owner and admins.
  if ((offer.status === 'draft' || offer.moderation?.removed || offer.seller.status !== 'active') && !isOwner && !isAdmin) {
    throw E.notFound('Offer');
  }
  res.json({ offer: svc.serializeOffer(offer), isOwner: !!isOwner });
});

router.post('/offers', requireMerchant, validate({ body: S.createOffer }), async (req, res) => {
  const offer = await svc.createOffer(req.user, req.valid.body);
  res.status(201).json({ offer: svc.serializeOffer(offer) });
});

router.patch('/offers/:id', requireMerchant, validate({ params: S.idParam, body: S.updateOffer }), async (req, res) => {
  const offer = await svc.updateOffer(req.user, req.valid.params.id, req.valid.body);
  res.json({ offer: svc.serializeOffer(offer) });
});

router.post('/offers/:id/status', requireMerchant, validate({ params: S.idParam, body: S.offerStatus }), async (req, res) => {
  const offer = await svc.changeStatus(req.user, req.valid.params.id, req.valid.body.action, req.valid.body);
  res.json({ offer: svc.serializeOffer(offer) });
});

router.patch('/offers/:id/stock', requireMerchant, validate({ params: S.idParam, body: S.offerStock }), async (req, res) => {
  const offer = await svc.setStock(req.user, req.valid.params.id, req.valid.body);
  res.json({ offer: svc.serializeOffer(offer) });
});

// ---------- Image upload (merchants and admins) ----------
router.post('/uploads/image', requireAuth, requireRole('seller', 'booster', 'admin'), sensitiveLimiter, memoryUpload.single('file'), (req, res) => {
  const name = saveImage(req.file, 'public');
  res.status(201).json({ url: `/uploads/${name}` });
});

module.exports = router;
