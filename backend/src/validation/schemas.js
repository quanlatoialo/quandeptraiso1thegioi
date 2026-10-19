'use strict';
const { z } = require('zod');

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const idParam = z.object({ id: objectId });
const idempotencyKey = z.string().min(8).max(100).regex(/^[A-Za-z0-9_-]+$/, 'Invalid idempotency key');

const email = z.string().trim().toLowerCase().email().max(120);
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');
const displayName = z.string().trim().min(3).max(40).regex(/^[\p{L}\p{N} _.-]+$/u, 'Only letters, numbers, spaces, _ . - allowed');

const imageUrl = z
  .string()
  .max(300)
  .regex(/^(\/uploads\/[A-Za-z0-9._-]+|\/images\/[A-Za-z0-9._\/-]+)$/, 'Images must be uploaded through the platform');

const offerBase = {
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(5000),
  gameId: objectId,
  categoryId: objectId,
  region: z.string().trim().max(40).optional().default(''),
  images: z.array(imageUrl).max(5).optional().default([]),
  unitPrice: z.number().int('Price must be in cents (integer)').positive('Price must be greater than 0').max(100000000),
  minPerOrder: z.number().int().positive('Minimum per order must be a positive integer').max(1000000),
  deliveryTimeHours: z.number().int().min(1).max(24 * 60),
  durationDays: z.number().int().min(1).max(30, 'An offer can be listed for at most 30 days'),
};

const schemas = {
  objectId,
  idParam,
  idempotencyKey,
  register: z.object({ email, password, displayName }).strict(),
  login: z.object({ email, password: z.string().min(1).max(128) }).strict(),
  updateProfile: z
    .object({
      displayName: displayName.optional(),
      bio: z.string().max(500).optional(),
      country: z.string().regex(/^[A-Z]{2}$|^$/, 'Use ISO country code').optional(),
    })
    .strict(),
  changePassword: z.object({ currentPassword: z.string().min(1).max(128), newPassword: password }).strict(),

  offerListQuery: z.object({
    q: z.string().trim().max(80).optional(),
    game: z.string().trim().max(80).optional(), // slug
    type: z.enum(['account', 'item', 'boosting']).optional(),
    region: z.string().trim().max(40).optional(),
    category: objectId.optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    seller: objectId.optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc']).optional().default('newest'),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }),
  createOffer: z.object({ ...offerBase, stock: z.number().int().min(0).max(1000000), publish: z.boolean().optional().default(false) }).strict(),
  updateOffer: z
    .object({
      title: offerBase.title.optional(),
      description: offerBase.description.optional(),
      gameId: objectId.optional(),
      categoryId: objectId.optional(),
      region: z.string().trim().max(40).optional(),
      images: z.array(imageUrl).max(5).optional(),
      unitPrice: offerBase.unitPrice.optional(),
      minPerOrder: offerBase.minPerOrder.optional(),
      deliveryTimeHours: offerBase.deliveryTimeHours.optional(),
      durationDays: offerBase.durationDays.optional(),
    })
    .strict(),
  offerStatus: z
    .object({
      action: z.enum(['publish', 'pause', 'resume', 'renew']),
      durationDays: offerBase.durationDays.optional(),
    })
    .strict(),
  offerStock: z.object({ stock: z.number().int().min(0).max(1000000), expectedStock: z.number().int().min(0).optional() }).strict(),

  deposit: z
    .object({
      amount: z.number().int('Amount must be in cents').min(100, 'Minimum top-up is 1.00 EUR'),
      idempotencyKey,
    })
    .strict(),
  createOrder: z.object({ offerId: objectId, quantity: z.number().int().positive(), idempotencyKey: idempotencyKey.optional() }).strict(),
  orderListQuery: z.object({
    as: z.enum(['buyer', 'seller']).optional().default('buyer'),
    status: z.string().max(40).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }),
  deliver: z.object({ deliveryNote: z.string().trim().max(3000).optional().default('') }).strict(),
  cancel: z.object({ reason: z.string().trim().max(500).optional().default('') }).strict(),
  dispute: z.object({ reason: z.string().trim().min(10, 'Describe the problem (min 10 characters)').max(2000) }).strict(),
  message: z.object({ body: z.string().trim().min(1).max(2000) }).strict(),
  review: z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().max(1000).optional().default('') }).strict(),
  evidence: z.object({ text: z.string().trim().min(3).max(3000) }),

  application: z.object({ requestedRole: z.enum(['seller', 'booster']), message: z.string().trim().min(20).max(1000) }).strict(),

  // Admin
  reviewApplication: z.object({ decision: z.enum(['approve', 'reject']), note: z.string().trim().max(500).optional().default('') }).strict(),
  banUser: z.object({ reason: z.string().trim().min(5).max(500) }).strict(),
  setRoles: z.object({ roles: z.array(z.enum(['customer', 'seller', 'booster', 'admin'])).min(1) }).strict(),
  game: z
    .object({
      name: z.string().trim().min(2).max(80),
      slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/).max(80),
      description: z.string().max(1000).optional().default(''),
      imageUrl: z.union([imageUrl, z.literal('')]).optional().default(''),
      regions: z.array(z.string().trim().min(1).max(40)).max(30).optional().default([]),
      featured: z.boolean().optional().default(false),
      active: z.boolean().optional().default(true),
    })
    .strict(),
  category: z
    .object({
      game: objectId,
      type: z.enum(['account', 'item', 'boosting']),
      name: z.string().trim().min(2).max(60),
      slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/).max(60),
      unitLabel: z.string().trim().min(1).max(40),
      active: z.boolean().optional().default(true),
    })
    .strict(),
  moderateOffer: z.object({ removed: z.boolean(), reason: z.string().trim().max(500).optional().default('') }).strict(),
  resolveDispute: z
    .object({
      decision: z.enum(['refund_buyer', 'release_seller']),
      note: z.string().trim().min(5, 'Explain the decision').max(1000),
      restock: z.boolean().optional().default(false),
    })
    .strict(),
  adminListQuery: z.object({
    q: z.string().trim().max(80).optional(),
    status: z.string().max(40).optional(),
    type: z.string().max(40).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
};

module.exports = schemas;
