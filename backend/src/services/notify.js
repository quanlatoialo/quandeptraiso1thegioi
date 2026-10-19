'use strict';
const { Notification, AuditLog, User } = require('../models');

async function notify(userId, { type, title, body = '', link = '' }, session) {
  await Notification.create([{ user: userId, type, title, body, link }], { session });
}

async function notifyAdmins(payload, session) {
  const admins = await User.find({ roles: 'admin', status: 'active' }).select('_id').session(session || null);
  if (!admins.length) return;
  await Notification.insertMany(
    admins.map((a) => ({ user: a._id, ...payload })),
    { session }
  );
}

async function audit({ actor, actorRole, action, targetType, targetId, meta = {}, ip = null }, session) {
  await AuditLog.create(
    [{ actor: actor || null, actorRole: actorRole || null, action, targetType, targetId: targetId ? String(targetId) : null, meta, ip }],
    { session }
  );
}

module.exports = { notify, notifyAdmins, audit };
