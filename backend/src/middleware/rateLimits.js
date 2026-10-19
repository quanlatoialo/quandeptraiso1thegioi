'use strict';
const rateLimit = require('express-rate-limit');
const env = require('../config/env');

function limiter({ windowMs, limit, message }) {
  if (env.RATE_LIMIT_DISABLED) return (req, res, next) => next();
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => (req.user ? `u:${req.user._id}` : rateLimit.ipKeyGenerator(req.ip)),
    handler: (req, res) =>
      res.status(429).json({ error: { code: 'RATE_LIMITED', message } }),
  });
}

module.exports = {
  authLimiter: limiter({ windowMs: 15 * 60 * 1000, limit: 20, message: 'Too many attempts, try again later.' }),
  sensitiveLimiter: limiter({ windowMs: 60 * 1000, limit: 30, message: 'Too many requests, slow down.' }),
  generalLimiter: limiter({ windowMs: 60 * 1000, limit: 600, message: 'Too many requests.' }),
};
