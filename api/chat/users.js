import { redis, json, cors } from '../_redis.js';
import { authUser } from '../_auth.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const user = await authUser(req);
  if (!user) return json(res, { error: 'Unauthorized' }, 401);

  const uids = await redis.smembers('users:all');
  const users = [];
  for (const uid of (uids || []).slice(0, 200)) {
    if (uid === user.uid) continue;
    const u = await redis.hgetall(`user:${uid}`);
    if (u?.username) users.push({ uid, username: u.username, displayName: u.displayName || u.username });
  }

  const last = (await redis.hgetall(`inbox:last:${user.uid}`)) || {};
  const inbox = (await redis.smembers(`inbox:${user.uid}`)) || [];

  return json(res, { ok: true, users, inbox, last });
}
