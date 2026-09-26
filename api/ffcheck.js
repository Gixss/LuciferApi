import axios from 'axios';

const UA = 'Dalvik/2.1.0 (Linux; U; Android 13; SM-S918B Build/TP1A.220624.014)';
const OB = 'OB55';

const HOSTS = {
  ID: 'client.ind.freefiremobile.com', IND: 'client.ind.freefiremobile.com',
  SG: 'client.sg.freefiremobile.com', MY: 'client.sg.freefiremobile.com',
  BR: 'client.br.freefiremobile.com', ME: 'client.me.freefiremobile.com',
  VN: 'client.vn.freefiremobile.com', TH: 'client.th.freefiremobile.com',
  PK: 'client.pk.freefiremobile.com', CIS: 'client.cis.freefiremobile.com',
  US: 'client.us.freefiremobile.com', TW: 'client.tw.freefiremobile.com',
  BD: 'client.bd.freefiremobile.com',
};

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const uid = String(req.query.uid || req.body?.uid || '').trim();
  const region = String(req.query.region || req.body?.region || 'ID').toUpperCase();

  if (!uid) return res.status(400).json({ error: 'uid wajib' });
  if (!/^\d{5,15}$/.test(uid)) return res.status(400).json({ error: 'uid 5-15 digit angka' });

  try {
    const { data: token } = await axios.post(
      'https://100067.connect.garena.com/oauth/guest/token/grant',
      new URLSearchParams({
        uid: String(Math.floor(Math.random() * 9e9) + 1e9),
        password: Math.random().toString(36).slice(2, 16),
        response_type: 'token', client_type: '2',
        client_secret: '2ee44819e9b4598845141067b281621874d0d5d7af9d8f7e00c1e54715b7d1e3',
        client_id: '100067',
      }).toString(),
      { headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 12000 }
    );
    if (!token?.access_token) throw new Error('guest token gagal');

    const host = HOSTS[region] || HOSTS.ID;
    const { data } = await axios.get(`https://${host}/GetPlayerPersonalShow`, {
      params: { target_uid: uid },
      headers: {
        'User-Agent': UA, 'Authorization': `Bearer ${token.access_token}`,
        'X-Unity-Version': '2018.4.11f1', 'X-GA': 'v1 1', 'ReleaseVersion': OB, 'Host': host,
      },
      timeout: 12000,
    });
    if (!data || (!data.nickname && !data.nick_name)) throw new Error('kosong');

    return res.status(200).json({
      ok: true, platform: 'freefire', ob: OB, uid, region,
      account: {
        nickname: data.nickname || data.nick_name,
        level: data.level || 0, exp: data.exp || 0,
        rank: data.rank || 0, rank_points: data.rank_points || 0,
        badges: data.badge_cnt || 0, signature: data.signature || '',
        clan_name: data.clan_name || '', clan_id: data.clan_id || 0,
        head_pic: data.head_pic || '', banner: data.banner || '',
      },
    });
  } catch (err) {
    return res.status(502).json({
      error: 'gagal ambil data FF', detail: String(err.message).slice(0, 200), uid, region,
      hint: 'Coba region lain (ID/SG/IND/BR/ME).',
    });
  }
}
