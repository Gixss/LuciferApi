import { json, cors } from '../_redis.js';
import { authUser } from '../_auth.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const user = await authUser(req);
  if (!user) return json(res, { error: 'Unauthorized' }, 401);
  return json(res, { ok: true, user });
}
