import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { db, uid, now } from './db.js';
import { audit } from './audit.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
const TOKEN_TTL = '30d';
const CONSENT_VERSION = '1.0';

// --- Password hashing (scrypt, no native deps) ---
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(password, salt, 64).toString('hex');
  // constant-time compare
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(test, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

// --- Users ---
const getByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const getById = db.prepare('SELECT * FROM users WHERE id = ?');
const insertUser = db.prepare(
  `INSERT INTO users (id, role, name, email, phone, telegram_id, pass_hash, consent_pd, consent_at, consent_ver, created_at)
   VALUES (@id, @role, @name, @email, @phone, @telegram_id, @pass_hash, @consent_pd, @consent_at, @consent_ver, @created_at)`
);

export function findUserByEmail(email) {
  return email ? getByEmail.get(String(email).toLowerCase()) : undefined;
}
export function findUserById(id) {
  return getById.get(id);
}

export function createUser({ name, email, phone, password, role = 'client', consent = false }) {
  const id = uid('usr');
  const ts = now();
  insertUser.run({
    id,
    role,
    name: name || null,
    email: email ? String(email).toLowerCase() : null,
    phone: phone || null,
    telegram_id: null,
    pass_hash: password ? hashPassword(password) : null,
    consent_pd: consent ? 1 : 0,
    consent_at: consent ? ts : null,
    consent_ver: consent ? CONSENT_VERSION : null,
    created_at: ts,
  });
  audit({ entity: 'user', entityId: id, actorId: id, action: 'register', after: { role, email } });
  return getById.get(id);
}

export function publicUser(u) {
  if (!u) return null;
  return { id: u.id, role: u.role, name: u.name, email: u.email, phone: u.phone };
}

// --- Middleware ---
export function authRequired(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'auth required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = getById.get(payload.sub);
    if (!user) return res.status(401).json({ error: 'invalid token' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
}

// Optional auth — attaches req.user if a valid token is present, else continues.
export function authOptional(req, _res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (token) {
    try { req.user = getById.get(jwt.verify(token, JWT_SECRET).sub) || undefined; } catch { /* ignore */ }
  }
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
}

export { CONSENT_VERSION };
