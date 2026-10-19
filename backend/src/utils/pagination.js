'use strict';

function parsePagination(query, { defaultLimit = 12, maxLimit = 50 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

function pageResult(items, total, { page, limit }) {
  return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { parsePagination, pageResult, escapeRegex };
