import crypto from 'crypto';
import { redis, json, cors, readBody } from './_redis.js';
import { authUser } from './_auth.js';

const MAX_SIZE = 500 * 1024;

export default async function handler(req, res) {
  if (cors(req, res)) return;

  if (req.method === 'GET') {
    const id = req.query.id;
    if (!id) return json(res, { error: 'id wajib' }, 400);
    const raw = await redis.get(`blob:${id}`);
    if (!raw) return json(res, { error: 'not found / expired' }, 404);
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const buf = Buffer.from(data.data, 'base64');
    res.setHeader('Content-Type', data.mime || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.setHeader('Content-Length', buf.length);
    return res.status(200).end(buf);
  }

  if (req.method !== 'POST') return json(res, { error: 'GET or POST' }, 405);

  const user = await authUser(req);
  if (!user) return json(res, { error: 'Unauthorized' }, 401);

  try {
    const body = await readBody(req);
    const data = String(body.data || '');
    const mime = String(body.mime || 'application/octet-stream').slice(0, 100);
    const fileName = String(body.fileName || 'file').slice(0, 120);
    if (!data) return json(res, { error: 'data kosong' }, 400);

    const base64 = data.includes(',') ? data.split(',')[1] : data;
    if (base64.length > MAX_SIZE) {
      return json(res, { error: `Max ${Math.round(MAX_SIZE/1024)}KB` }, 413);
    }

    const id = crypto.randomBytes(12).toString('hex');
    await redis.set(`blob:${id}`, JSON.stringify({ mime, fileName, data: base64, uid: user.uid }), { ex: 60 * 60 * 24 * 7 });

    return json(res, { ok: true, url: `/api/upload?id=${id}`, id, mime, fileName });
  } catch (err) {
    return json(res, { error: err.message }, 500);
  }
}
