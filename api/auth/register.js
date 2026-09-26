import crypto from 'crypto';
import { redis, json, cors, readBody } from '../_redis.js';
import { hashPassword, signToken, userKey } from '../_auth.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return json(res, { error: 'POST only' }, 405);

  try {
    const body = await readBody(req);
    const username = String(body.username || '').trim().toLowerCase();
    const displayName = String(body.displayName || body.username || '').trim().slice(0, 40);
    const password = String(body.password || '');

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return json(res, { error: 'Username 3-20 karakter, hanya a-z 0-9 _' }, 400);
    }
    if (password.length < 6) return json(res, { error: 'Password minimal 6 karakter' }, 400);

    const exists = await redis.exists(userKey(username));
    if (exists) return json(res, { error: 'Username sudah dipakai' }, 409);

    const uid = crypto.randomBytes(8).toString('hex');
    await redis.hset(`user:${uid}`, {
      uid, username,
      displayName: displayName || username,
      passwordHash: hashPassword(password),
      createdAt: Date.now(),
    });
    await redis.set(userKey(username), uid);
    await redis.sadd('users:all', uid);

    const token = signToken({ uid, username });
    return json(res, { ok: true, token, user: { uid, username, displayName: displayName || username } });
  } catch (err) {
    return json(res, { error: err.message }, 500);
  }
}
