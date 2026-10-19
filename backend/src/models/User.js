'use strict';
const mongoose = require('mongoose');

const ROLES = ['customer', 'seller', 'booster', 'admin'];

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, required: true, trim: true, maxlength: 40 },
    roles: { type: [{ type: String, enum: ROLES }], default: ['customer'] },
    status: { type: String, enum: ['active', 'banned'], default: 'active' },
    banReason: { type: String, default: null },
    bannedAt: { type: Date, default: null },
    bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    bio: { type: String, default: '', maxlength: 500 },
    country: { type: String, default: '', maxlength: 2 },
    avatarUrl: { type: String, default: '' },
    // Incremented on password change / ban to invalidate existing sessions.
    tokenVersion: { type: Number, default: 0 },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'users' }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ displayName: 1 });

userSchema.methods.hasRole = function hasRole(role) {
  return this.roles.includes(role);
};

userSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    displayName: this.displayName,
    roles: this.roles.filter((r) => r !== 'admin'),
    bio: this.bio,
    country: this.country,
    avatarUrl: this.avatarUrl,
    memberSince: this.createdAt,
  };
};

userSchema.methods.toSelf = function toSelf() {
  return {
    id: String(this._id),
    email: this.email,
    displayName: this.displayName,
    roles: this.roles,
    status: this.status,
    bio: this.bio,
    country: this.country,
    avatarUrl: this.avatarUrl,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
