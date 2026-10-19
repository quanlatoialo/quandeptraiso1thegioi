'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const S = require('../validation/schemas');
const { validate } = require('../middleware/common');
const { issueSession, clearSession, requireAuth } = require('../middleware/auth');
const { authLimiter, sensitiveLimiter } = require('../middleware/rateLimits');
const { ensureWallet } = require('../services/walletService');
const { audit } = require('../services/notify');
const { E } = require('../utils/errors');

const router = express.Router();
const BCRYPT_ROUNDS = 12;
// Pre-computed hash used to keep login timing similar for unknown emails.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-1', 10);

router.get('/csrf', (req, res) => {
  res.json({ csrfToken: req.csrfToken });
});

router.post('/register', authLimiter, validate({ body: S.register }), async (req, res) => {
  const { email, password, displayName } = req.valid.body;
  if (await User.exists({ email })) throw E.conflict('EMAIL_TAKEN', 'An account with this email already exists');
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  let user;
  try {
    user = await User.create({ email, passwordHash, displayName, roles: ['customer'] });
  } catch (err) {
    if (err.code === 11000) throw E.conflict('EMAIL_TAKEN', 'An account with this email already exists');
    throw err;
  }
  await ensureWallet(user._id);
  issueSession(res, user);
  res.status(201).json({ user: user.toSelf() });
});

router.post('/login', authLimiter, validate({ body: S.login }), async (req, res) => {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) throw E.unauthorized('Invalid email or password');
  if (user.status === 'banned') {
    throw E.forbidden(`Your account is suspended${user.banReason ? `: ${user.banReason}` : ''}`, 'ACCOUNT_BANNED');
  }
  issueSession(res, user);
  res.json({ user: user.toSelf() });
});

router.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  res.json({ user: req.user ? req.user.toSelf() : null });
});

router.patch('/me', requireAuth, validate({ body: S.updateProfile }), async (req, res) => {
  Object.assign(req.user, req.valid.body);
  await req.user.save();
  res.json({ user: req.user.toSelf() });
});

router.post('/change-password', requireAuth, sensitiveLimiter, validate({ body: S.changePassword }), async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  const ok = await bcrypt.compare(req.valid.body.currentPassword, user.passwordHash);
  if (!ok) throw E.badRequest('Current password is incorrect', undefined, 'WRONG_PASSWORD');
  user.passwordHash = await bcrypt.hash(req.valid.body.newPassword, BCRYPT_ROUNDS);
  user.tokenVersion += 1; // invalidate other sessions
  await user.save();
  await audit({ actor: user._id, action: 'user.change_password', targetType: 'user', targetId: user._id, ip: req.ip });
  issueSession(res, user);
  res.json({ ok: true });
});

module.exports = router;
