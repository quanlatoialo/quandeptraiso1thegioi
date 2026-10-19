'use strict';
const mongoose = require('mongoose');

/**
 * Run fn(session) inside a MongoDB multi-document transaction.
 * Requires a replica set / Atlas cluster. We intentionally do NOT fall back to
 * non-transactional writes: financial operations must be atomic.
 * session.withTransaction retries automatically on TransientTransactionError
 * (e.g. write conflicts caused by two concurrent purchases).
 */
async function withTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(
      async () => {
        result = await fn(session);
      },
      { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, readPreference: 'primary' }
    );
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { withTransaction };
