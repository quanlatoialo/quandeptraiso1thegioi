'use strict';
const crypto = require('crypto');
const env = require('../config/env');
const { AppError } = require('../utils/errors');

const CSRF_COOKIE = 'g2g_csrf';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit cookie CSRF protection.
 * A readable cookie holds a random token; state-changing requests must echo it in a header.
 * Combined with SameSite=Lax session cookies.
 */
function csrf(req, res, next) {
  let token = req.cookies && req.cookies[CSRF_COOKIE];
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, token, { httpOnly: false, secure: env.isProd, sameSite: 'lax', path: '/' });
    req.cookies[CSRF_COOKIE] = token;
    req.csrfFresh = true;
  }
  req.csrfToken = token;
  if (SAFE_METHODS.has(req.method)) return next();
  const header = req.get(CSRF_HEADER);
  if (
    req.csrfFresh ||
    !header ||
    header.length !== token.length ||
    !crypto.timingSafeEqual(Buffer.from(header), Buffer.from(token))
  ) {
    return next(new AppError(403, 'CSRF_INVALID', 'Invalid or missing CSRF token. Refresh the page and try again.'));
  }
  return next();
}

module.exports = { csrf, CSRF_COOKIE, CSRF_HEADER };
