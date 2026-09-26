import crypto from 'crypto';
import { redis, json, cors, readBody } from '../_redis.js';
import { authUser } from '../_auth.js';

const KEY = 'chat:global';
const MAX = 500;

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const user = await authUser(req);
  if (!user) return json(res, { error: 'Unauthorized' }, 401);

  if (req.method === 'GET') {
    const since = parseInt(req.query.since || '0', 10);
    const items = await redis.lrange(KEY, 0, MAX - 1);
    const messages = (items || [])
      .map(x => typeof x === 'string' ? JSON.parse(x) : x)
      .filter(m => !since || m.ts > since)
      .reverse();
    return json(res, { ok: true, messages });
  }

  if (req.method === 'POST') {
    const body = await readBody(req);
    const type = String(body.type || 'text');
    const content = String(body.content || '').slice(0, 300000);
    if (!content) return json(res, { error: 'content wajib' }, 400);

    const msg = {
      id: crypto.randomBytes(8).toString('hex'),
      ts: Date.now(),
      uid: user.uid, username: user.username, displayName: user.displayName,
      type, content,
      fileName: body.fileName ? String(body.fileName).slice(0, 120) : null,
      mime: body.mime ? String(body.mime).slice(0, 100) : null,
    };
    await redis.lpush(KEY, JSON.stringify(msg));
    await redis.ltrim(KEY, 0, MAX - 1);
    return json(res, { ok: true, message: msg });
  }

  return json(res, { error: 'method not allowed' }, 405);
}
