'use strict';
const mongoose = require('mongoose');
const multer = require('multer');
const { ZodError } = require('zod');
const { AppError, E } = require('../utils/errors');
const env = require('../config/env');

/** Validate req.body / req.query / req.params with Zod schemas; results stored in req.valid. */
function validate(schemas) {
  return (req, res, next) => {
    req.valid = req.valid || {};
    try {
      for (const part of ['params', 'query', 'body']) {
        if (schemas[part]) req.valid[part] = schemas[part].parse(req[part] ?? {});
      }
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          E.validation(err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })))
        );
      }
      return next(err);
    }
  };
}

/** Reject Mongo operator injection in JSON bodies (keys starting with "$" or containing "."). */
function rejectMongoOperators(req, res, next) {
  const bad = (obj, depth = 0) => {
    if (depth > 10 || obj === null || typeof obj !== 'object') return false;
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) return true;
      if (bad(obj[key], depth + 1)) return true;
    }
    return false;
  };
  if (bad(req.body)) return next(E.badRequest('Illegal characters in request keys', undefined, 'ILLEGAL_INPUT'));
  return next();
}

function notFound(req, res, next) {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.path} not found`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = 500;
  let body = { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } };

  if (err instanceof AppError) {
    status = err.status;
    body = { error: { code: err.code, message: err.message, details: err.details } };
  } else if (err instanceof multer.MulterError) {
    status = 400;
    body = { error: { code: 'UPLOAD_ERROR', message: err.code === 'LIMIT_FILE_SIZE' ? 'File too large' : err.message } };
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    body = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid data',
        details: Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
      },
    };
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    body = { error: { code: 'INVALID_ID', message: 'Invalid identifier' } };
  } else if (err && err.code === 11000) {
    status = 409;
    body = { error: { code: 'DUPLICATE', message: 'Duplicate value', details: err.keyValue ? Object.keys(err.keyValue) : undefined } };
  } else if (err && err.type === 'entity.parse.failed') {
    status = 400;
    body = { error: { code: 'INVALID_JSON', message: 'Malformed JSON body' } };
  } else if (err && err.type === 'entity.too.large') {
    status = 413;
    body = { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' } };
  }

  if (status >= 500 && !env.isTest) {
    // Never log request bodies (may contain credentials or delivery secrets).
    console.error(`[error] ${req.method} ${req.originalUrl}:`, err && err.stack ? err.stack : err);
  }
  res.status(status).json(body);
}

module.exports = { validate, rejectMongoOperators, notFound, errorHandler };
