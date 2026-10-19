'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');
const { E } = require('../utils/errors');

const PUBLIC_DIR = path.join(env.UPLOAD_DIR, 'public');
const PRIVATE_DIR = path.join(env.UPLOAD_DIR, 'private');
fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.mkdirSync(PRIVATE_DIR, { recursive: true });

const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

/** Check magic bytes so a renamed file cannot pass as an image. */
function sniffImage(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED[file.mimetype]) return cb(E.badRequest('Only JPEG, PNG or WEBP images are allowed', undefined, 'UNSUPPORTED_FILE'));
    return cb(null, true);
  },
});

/** Persist an uploaded image after content sniffing. Returns the stored file name. */
function saveImage(file, visibility = 'public') {
  if (!file) throw E.badRequest('No file uploaded', undefined, 'NO_FILE');
  const real = sniffImage(file.buffer);
  if (!real || !ALLOWED[real]) throw E.badRequest('File content is not a valid image', undefined, 'UNSUPPORTED_FILE');
  const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ALLOWED[real]}`;
  const dir = visibility === 'private' ? PRIVATE_DIR : PUBLIC_DIR;
  fs.writeFileSync(path.join(dir, name), file.buffer);
  return name;
}

function privateFilePath(name) {
  if (!/^[0-9]+-[a-f0-9]{16}\.(jpg|png|webp)$/.test(name)) return null;
  return path.join(PRIVATE_DIR, name);
}

module.exports = { memoryUpload, saveImage, privateFilePath, PUBLIC_DIR, PRIVATE_DIR };
