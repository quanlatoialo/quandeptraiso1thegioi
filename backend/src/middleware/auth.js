'use strict';
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User } = require('../models');
const { E } = require('../utils/errors');

const SESSION_COOKIE = 'g2g_session';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: env.SESSION_TTL_HOURS * 3600 * 1000,
  };
}

function issueSession(res, user) {
  const token = jwt.sign({ sub: String(user._id), tv: user.tokenVersion }, env.JWT_SECRET, {
    expiresIn: `${env.SESSION_TTL_HOURS}h`,
  });
  res.cookie(SESSION_COOKIE, token, cookieOptions());
}

function clearSession(res) {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(SESSION_COOKIE, opts);
}

/** Loads req.user if a valid session cookie is present. Never throws for missing session. */
async function loadUser(req, res, next) {
  req.user = null;
  const token = req.cookies && req.cookies[SESSION_COOKIE];
  if (!token) return next();
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    clearSession(res);
    return next();
  }
  const user = await User.findById(payload.sub);
  if (!user || user.tokenVersion !== payload.tv) {
    clearSession(res);
    return next();
  }
  req.user = user;
  return next();
}

function requireAuth(req, res, next) {
  if (!req.user) return next(E.unauthorized());
  if (req.user.status === 'banned') {
    return next(E.forbidden(`Your account is suspended${req.user.banReason ? `: ${req.user.banReason}` : ''}`, 'ACCOUNT_BANNED'));
  }
  return next();
}

/** Require at least one of the given roles (checked server-side on every request). */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(E.unauthorized());
    if (req.user.status === 'banned') return next(E.forbidden('Your account is suspended', 'ACCOUNT_BANNED'));
    if (!roles.some((r) => req.user.roles.includes(r))) {
      return next(E.forbidden(`Requires role: ${roles.join(' or ')}`));
    }
    return next();
  };
}

const requireAdmin = requireRole('admin');
const requireMerchant = requireRole('seller', 'booster');

module.exports = {
  SESSION_COOKIE,
  issueSession,
  clearSession,
  loadUser,
  requireAuth,
  requireRole,
  requireAdmin,
  requireMerchant,
};
