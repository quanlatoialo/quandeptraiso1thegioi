'use strict';

class AppError extends Error {
  /**
   * @param {number} status HTTP status
   * @param {string} code machine-readable error code
   * @param {string} message human-readable message
   * @param {object} [details]
   */
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const E = {
  badRequest: (msg = 'Bad request', details, code = 'BAD_REQUEST') => new AppError(400, code, msg, details),
  validation: (details) => new AppError(400, 'VALIDATION_ERROR', 'Invalid input', details),
  unauthorized: (msg = 'Authentication required') => new AppError(401, 'UNAUTHENTICATED', msg),
  forbidden: (msg = 'You do not have permission to perform this action', code = 'FORBIDDEN') =>
    new AppError(403, code, msg),
  notFound: (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found`),
  conflict: (code, msg, details) => new AppError(409, code, msg, details),
  payment: (code, msg, details) => new AppError(402, code, msg, details),
  unprocessable: (code, msg, details) => new AppError(422, code, msg, details),
};

module.exports = { AppError, E };
