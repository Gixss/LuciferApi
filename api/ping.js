import { json, cors } from './_redis.js';

export default function handler(req, res) {
  if (cors(req, res)) return;
  return json(res, { ok: true, service: 'LuciferAPI', version: '6.2', time: new Date().toISOString() });
}
