import crypto from 'crypto';
import { redis, json, cors, readBody } from '../_redis.js';
import { authUser } from '../_auth.js';

const MAX = 500;

function convoKey(a, b) {
  const [x, y] = [a, b].sort();
  return `dm:${x}:${y}`;
}

function previewOf(m) {
  if (m.type === 'text') return m.content.slice(0, 60);
  if (m.type === 'image') return '[foto]';
  if (m.type === 'voice') return '[pesan suara]';
  if (m.type === 'file') return `[file] ${m.fileName || ''}`;
  return m.content.slice(0, 40);
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const user = await authUser(req);
  if (!user) return json(res, { error: 'Unauthorized' }, 401);

  if (req.method === 'GET') {
    const withUid = req.query.with;
    if (!withUid) return json(res, { error: 'query "with" wajib' }, 400);
    const since = parseInt(req.query.since || '0', 10);
    const items = await redis.lrange(convoKey(user.uid, withUid), 0, MAX - 1);
    const messages = (items || [])
      .map(x => typeof x === 'string' ? JSON.parse(x) : x)
      .filter(m => !since || m.ts > since)
      .reverse();
    return json(res, { ok: true, messages });
  }

  if (req.method === 'POST') {
    const body = await readBody(req);
    const to = String(body.to || '');
    if (!to) return json(res, { error: '"to" wajib' }, 400);

    const other = await redis.hgetall(`user:${to}`);
    if (!other?.username) return json(res, { error: 'User tidak ditemukan' }, 404);

    const type = String(body.type || 'text');
    const content = String(body.content || '').slice(0, 300000);
    if (!content) return json(res, { error: 'content wajib' }, 400);

    const msg = {
      id: crypto.randomBytes(8).toString('hex'),
      ts: Date.now(),
      from: user.uid, fromUsername: user.username, fromDisplay: user.displayName,
      to, type, content,
      fileName: body.fileName ? String(body.fileName).slice(0, 120) : null,
      mime: body.mime ? String(body.mime).slice(0, 100) : null,
    };

    await redis.lpush(convoKey(user.uid, to), JSON.stringify(msg));
    await redis.ltrim(convoKey(user.uid, to), 0, MAX - 1);
    await redis.sadd(`inbox:${user.uid}`, to);
    await redis.sadd(`inbox:${to}`, user.uid);
    await redis.hset(`inbox:last:${user.uid}`, to, JSON.stringify({ ts: msg.ts, preview: previewOf(msg) }));
    await redis.hset(`inbox:last:${to}`, user.uid, JSON.stringify({ ts: msg.ts, preview: previewOf(msg) }));

    return json(res, { ok: true, message: msg });
  }

  return json(res, { error: 'method not allowed' }, 405);
}
