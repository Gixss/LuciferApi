import { redis, json, cors, readBody } from '../_redis.js';
import { verifyPassword, signToken, userKey } from '../_auth.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return json(res, { error: 'POST only' }, 405);

  try {
    const body = await readBody(req);
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!username || !password) return json(res, { error: 'Username & password wajib' }, 400);

    const uid = await redis.get(userKey(username));
    if (!uid) return json(res, { error: 'Username atau password salah' }, 401);

    const user = await redis.hgetall(`user:${uid}`);
    if (!user?.passwordHash) return json(res, { error: 'Akun rusak' }, 500);
    if (!verifyPassword(password, user.passwordHash)) {
      return json(res, { error: 'Username atau password salah' }, 401);
    }

    const token = signToken({ uid, username });
    return json(res, { ok: true, token, user: { uid, username, displayName: user.displayName || username } });
  } catch (err) {
    return json(res, { error: err.message }, 500);
  }
}
