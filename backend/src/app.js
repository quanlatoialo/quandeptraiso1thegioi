'use strict';
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const path = require('path');
const env = require('./config/env');
const { csrf } = require('./middleware/csrf');
const { loadUser } = require('./middleware/auth');
const { generalLimiter } = require('./middleware/rateLimits');
const { rejectMongoOperators, notFound, errorHandler } = require('./middleware/common');
const { PUBLIC_DIR } = require('./middleware/upload');

// Routers
const authRoutes = require('./routes/auth');
const publicRoutes = require('./routes/public');
const offerRoutes = require('./routes/offers');
const walletRoutes = require('./routes/wallet');
const orderRoutes = require('./routes/orders');
const accountRoutes = require('./routes/account');
const adminRoutes = require('./routes/admin');

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false, // Served as an API / behind Next.js proxy
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());
app.use(rejectMongoOperators);

// Serve uploaded public images
app.use('/uploads', express.static(PUBLIC_DIR, { maxAge: '7d', immutable: true }));

// CSRF & Session loader for all API endpoints
app.use('/api', csrf);
app.use('/api', loadUser);
app.use('/api', generalLimiter);

// Mount modular routes
app.use('/api/auth', authRoutes);
app.use('/api', publicRoutes);
app.use('/api', offerRoutes);
app.use('/api', walletRoutes);
app.use('/api', orderRoutes);
app.use('/api', accountRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
    demoPayments: env.ENABLE_DEMO_PAYMENTS,
  });
});

app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
