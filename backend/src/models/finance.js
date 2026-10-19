'use strict';
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

// ---------- Wallet: one per user per currency ----------
// available = money the user can spend.
// held      = buyer money currently locked in escrow for their own purchases.
// Seller "pending income" is NOT stored here (it is derived from held escrow records)
// so that the same money is never counted twice.
const walletSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    currency: { type: String, enum: ['EUR'], default: 'EUR' },
    available: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
    held: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
  },
  { timestamps: true, collection: 'wallets' }
);
walletSchema.index({ user: 1, currency: 1 }, { unique: true });

// ---------- Double-entry ledger ----------
// Each transaction contains entries whose amounts sum to zero.
// Accounts:
//   wallet:<walletId>:available | wallet:<walletId>:held
//   external:demo_payment (money entering the system from the demo adapter)
//   platform:fees
const ledgerEntrySchema = new mongoose.Schema(
  {
    account: { type: String, required: true },
    wallet: { type: ObjectId, ref: 'Wallet', default: null },
    user: { type: ObjectId, ref: 'User', default: null },
    amount: { type: Number, required: true, validate: Number.isSafeInteger }, // signed, minor units
    balanceAfter: { type: Number, default: null },
  },
  { _id: false }
);

const LEDGER_TYPES = ['deposit', 'escrow_hold', 'escrow_release', 'escrow_refund'];
const ledgerTransactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: LEDGER_TYPES, required: true },
    currency: { type: String, enum: ['EUR'], default: 'EUR' },
    amount: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    entries: { type: [ledgerEntrySchema], validate: (v) => v.length >= 2 },
    users: [{ type: ObjectId, ref: 'User' }], // users involved – for history queries
    order: { type: ObjectId, ref: 'Order', default: null },
    // Unique key guaranteeing a financial effect can only happen once.
    idempotencyKey: { type: String, required: true },
    externalRef: { type: String, default: null }, // payment provider reference
    provider: { type: String, default: null },
    memo: { type: String, default: '' },
    createdBy: { type: ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'ledgerTransactions' }
);
ledgerTransactionSchema.index({ idempotencyKey: 1 }, { unique: true });
ledgerTransactionSchema.index(
  { provider: 1, externalRef: 1 },
  { unique: true, partialFilterExpression: { externalRef: { $type: 'string' } } }
);
ledgerTransactionSchema.index({ users: 1, createdAt: -1 });
ledgerTransactionSchema.index({ order: 1 });
ledgerTransactionSchema.pre('validate', function checkBalanced() {
  const sum = (this.entries || []).reduce((s, e) => s + e.amount, 0);
  if (sum !== 0) throw new Error('Ledger transaction is not balanced');
});

// ---------- Escrow: one per order ----------
const escrowSchema = new mongoose.Schema(
  {
    order: { type: ObjectId, ref: 'Order', required: true },
    buyer: { type: ObjectId, ref: 'User', required: true },
    seller: { type: ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1 },
    fee: { type: Number, default: 0, min: 0 },
    currency: { type: String, enum: ['EUR'], default: 'EUR' },
    status: { type: String, enum: ['held', 'released', 'refunded'], default: 'held' },
    releasedAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    resolution: { type: String, enum: ['normal', 'admin_dispute', 'cancellation', null], default: null },
  },
  { timestamps: true, collection: 'escrowRecords' }
);
escrowSchema.index({ order: 1 }, { unique: true });
escrowSchema.index({ seller: 1, status: 1 });
escrowSchema.index({ buyer: 1, status: 1 });

module.exports = {
  Wallet: mongoose.model('Wallet', walletSchema),
  LedgerTransaction: mongoose.model('LedgerTransaction', ledgerTransactionSchema),
  EscrowRecord: mongoose.model('EscrowRecord', escrowSchema),
  LEDGER_TYPES,
};
