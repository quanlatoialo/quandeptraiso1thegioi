'use strict';
require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';

function bool(v, def = false) {
  if (v === undefined || v === '') return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

const env = {
  NODE_ENV,
  isProd: NODE_ENV === 'production',
  isTest: NODE_ENV === 'test',
  PORT: Number(process.env.PORT || 4000),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/gamer2gamer?replicaSet=rs0',
  JWT_SECRET: process.env.JWT_SECRET || (NODE_ENV === 'production' ? '' : 'dev-only-insecure-secret-change-me'),
  SESSION_TTL_HOURS: Number(process.env.SESSION_TTL_HOURS || 24 * 7),
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  // Demo payment adapter is only allowed outside production unless explicitly forced for a demo deployment.
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || 'demo',
  ENABLE_DEMO_PAYMENTS: bool(process.env.ENABLE_DEMO_PAYMENTS, NODE_ENV !== 'production'),
  PLATFORM_FEE_BPS: Number(process.env.PLATFORM_FEE_BPS || 0), // basis points, 0 = no fee for MVP
  UPLOAD_DIR: process.env.UPLOAD_DIR || require('path').join(__dirname, '..', '..', 'uploads'),
  MAX_UPLOAD_BYTES: Number(process.env.MAX_UPLOAD_BYTES || 2 * 1024 * 1024),
  DEMO_DEPOSIT_MAX_CENTS: Number(process.env.DEMO_DEPOSIT_MAX_CENTS || 100000), // 1000 EUR per top-up
  RATE_LIMIT_DISABLED: bool(process.env.RATE_LIMIT_DISABLED, NODE_ENV === 'test'),
};

if (env.isProd && (!env.JWT_SECRET || env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET must be set (>= 32 chars) in production');
}

module.exports = env;
