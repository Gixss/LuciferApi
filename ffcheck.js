import axios from 'axios';

const OB_VERSION = 'OB55';
const UA = 'Dalvik/2.1.0 (Linux; U; Android 13; SM-S918B Build/TP1A.220624.014)';

async function getGuestToken() {
  const { data } = await axios.post(
    'https://100067.connect.garena.com/oauth/guest/token/grant',
    new URLSearchParams({
      uid: String(Math.floor(Math.random() * 9e9) + 1e9),
      password: Math.random().toString(36).slice(2, 12),
      response_type: 'token',
      client_type: '2',
      client_secret: '2ee44819e9b4598845141067b281621874d0d5d7af9d8f7e00c1e54715b7d1e3',
      client_id: '100067',
    }).toString(),
    { headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
  );
  return data;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const uid = req.query.uid || req.body?.uid;
  const region = (req.query.region || req.body?.region || 'ID').toUpperCase();
  if (!uid) return res.status(400).json({ error: 'uid wajib' });

  try {
    const token = await getGuestToken();
    const { data } = await axios.get('https://client.ind.freefiremobile.com/GetPlayerPersonalShow', {
      params: { target_uid: uid },
      headers: {
        'User-Agent': UA,
        'Authorization': `Bearer ${token.access_token}`,
        'X-Unity-Version': '2018.4.11f1',
        'X-GA': 'v1 1',
        'ReleaseVersion': OB_VERSION,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Host': 'client.ind.freefiremobile.com',
      },
      timeout: 15000,
    });
    res.json({
      platform: 'freefire', ob: OB_VERSION, uid, region,
      account: {
        nickname: data.nickname, level: data.level, exp: data.exp,
        rank: data.rank, rank_points: data.rank_points,
        badges: data.badge_cnt, signature: data.signature,
        clan_name: data.clan_name, clan_id: data.clan_id,
        create_time: data.create_time, last_login: data.last_login,
        head_pic: data.head_pic, banner: data.banner,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message, detail: err.response?.data });
  }
}