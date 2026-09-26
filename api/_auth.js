import crypto from 'crypto';
import { redis } from './_redis.js';

const SECRET = process.env.AUTH_SECRET || 'lucifer-default-secret-change-me';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  try {
    const [salt, hash] = stored.split(':');
    const check = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
  } catch { return false; }
}

export function signToken(payload, ttlSeconds = 60 * 60 * 24 * 30) {
  const data = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token) {
  try {
    const [body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
    if (sig !== expected) return null;
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch { return null; }
}

export async function authUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const data = verifyToken(token);
  if (!data) return null;
  const user = await redis.hgetall(`user:${data.uid}`);
  if (!user || !user.username) return null;
  return { uid: data.uid, username: user.username, displayName: user.displayName || user.username };
}

export const userKey = (username) => `user:${username.toLowerCase()}`;
