'use strict';
const express = require('express');
const { Game, Category, Offer, User, Review, Order } = require('../models');
const S = require('../validation/schemas');
const { validate } = require('../middleware/common');
const { E } = require('../utils/errors');
const { serializeOffer } = require('../services/offerService');

const router = express.Router();

// ---------- Games (public) ----------
router.get('/games', async (req, res) => {
  const games = await Game.find({ active: true }).sort({ featured: -1, name: 1 }).lean();
  const now = new Date();
  const counts = await Offer.aggregate([
    { $match: { status: 'active', expiresAt: { $gt: now }, 'moderation.removed': { $ne: true } } },
    { $group: { _id: '$game', n: { $sum: 1 } } },
  ]);
  const byGame = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  res.json({
    items: games.map((g) => ({
      id: String(g._id),
      name: g.name,
      slug: g.slug,
      description: g.description,
      imageUrl: g.imageUrl,
      regions: g.regions,
      featured: g.featured,
      activeOffers: byGame[String(g._id)] || 0,
    })),
  });
});

router.get('/games/:slug', async (req, res) => {
  const slug = String(req.params.slug).toLowerCase();
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) throw E.notFound('Game');
  const game = await Game.findOne({ slug, active: true }).lean();
  if (!game) throw E.notFound('Game');
  const categories = await Category.find({ game: game._id, active: true }).sort({ type: 1, name: 1 }).lean();
  res.json({
    game: { id: String(game._id), name: game.name, slug: game.slug, description: game.description, imageUrl: game.imageUrl, regions: game.regions },
    categories: categories.map((c) => ({ id: String(c._id), name: c.name, slug: c.slug, type: c.type, unitLabel: c.unitLabel })),
  });
});

// Catalog for offer forms: all active games with categories.
router.get('/catalog', async (req, res) => {
  const [games, cats] = await Promise.all([
    Game.find({ active: true }).sort({ name: 1 }).lean(),
    Category.find({ active: true }).sort({ name: 1 }).lean(),
  ]);
  res.json({
    games: games.map((g) => ({
      id: String(g._id),
      name: g.name,
      slug: g.slug,
      regions: g.regions,
      categories: cats
        .filter((c) => String(c.game) === String(g._id))
        .map((c) => ({ id: String(c._id), name: c.name, type: c.type, unitLabel: c.unitLabel })),
    })),
  });
});

// ---------- Public seller profile ----------
router.get('/users/:id', validate({ params: S.idParam }), async (req, res) => {
  const user = await User.findById(req.valid.params.id);
  if (!user || user.status !== 'active') throw E.notFound('User');
  const now = new Date();
  const [offers, reviews, completed, ratingAgg] = await Promise.all([
    Offer.find({ seller: user._id, status: 'active', expiresAt: { $gt: now }, 'moderation.removed': { $ne: true } })
      .sort({ publishedAt: -1 })
      .limit(24)
      .populate('game', 'name slug imageUrl')
      .populate('category', 'name slug')
      .lean(),
    Review.find({ seller: user._id }).sort({ createdAt: -1 }).limit(10).populate('buyer', 'displayName').lean(),
    Order.countDocuments({ seller: user._id, status: 'completed' }),
    Review.aggregate([{ $match: { seller: user._id } }, { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]),
  ]);
  res.json({
    user: user.toPublic(),
    stats: {
      completedOrders: completed,
      reviewCount: ratingAgg[0] ? ratingAgg[0].n : 0,
      averageRating: ratingAgg[0] ? Math.round(ratingAgg[0].avg * 10) / 10 : null,
    },
    offers: offers.map((o) => serializeOffer({ ...o, seller: user }, { includeSeller: false })),
    reviews: reviews.map((r) => ({
      id: String(r._id),
      rating: r.rating,
      comment: r.comment,
      buyer: r.buyer ? r.buyer.displayName : 'Deleted user',
      createdAt: r.createdAt,
    })),
  });
});

module.exports = router;
