// language: JavaScript, file: api/ffcheck.js
import axios from 'axios';

const OB = 'OB55';
const CLIENT_VERSION = '1.120.1';
const UA = 'Dalvik/2.1.0 (Linux; U; Android 13; SM-S918B Build/TP1A.220624.014)';
const CLIENT_SECRET = '2ee44819e9b4598845141067b281621874d0d5d7af9d8f7e00c1e54715b7d1e3';

const REGION_HOSTS = {
  ID: 'client.ind.freefiremobile.com',
  SG: 'client.sg.freefiremobile.com',
  IND: 'client.ind.freefiremobile.com',
  BR: 'client.br.freefiremobile.com',
  ME: 'client.me.freefiremobile.com',
  VN: 'client.vn.freefiremobile.com',
  TH: 'client.th.freefiremobile.com',
  PK: 'client.pk.freefiremobile.com',
  CIS: 'client.cis.freefiremobile.com',
  US: 'client.us.freefiremobile.com',
  TW: 'client.tw.freefiremobile.com',
  BD: 'client.bd.freefiremobile.com',
  SAC: 'client.sac.freefiremobile.com',
  NA: 'client.na.freefiremobile.com',
};

async function getGuestToken(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const uid = String(Math.floor(Math.random() * 9e9) + 1e9);
      const pwd = Math.random().toString(36).slice(2, 14) + Date.now().toString(36);
      const { data } = await axios.post(
        'https://100067.connect.garena.com/oauth/guest/token/grant',
        new URLSearchParams({
          uid, password: pwd,
          response_type: 'token',
          client_type: '2',
          client_secret: CLIENT_SECRET,
          client_id: '100067',
        }).toString(),
        {
          headers: {
            'User-Agent': UA,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Connection': 'Keep-Alive',
            'Accept-Encoding': 'gzip',
          },
          timeout: 12000,
        }
      );
      if (data?.access_token) return { ...data, _uid: uid, _pwd: pwd };
      throw new Error('token kosong');
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 400 * (i + 1)));
    }
  }
}

async function fetchPlayerInfo(uid, region, token) {
  const host = REGION_HOSTS[region] || REGION_HOSTS.ID;
  const url = `https://${host}/GetPlayerPersonalShow`;

  const { data } = await axios.get(url, {
    params: { target_uid: uid },
    headers: {
      'User-Agent': UA,
      'Authorization': `Bearer ${token.access_token}`,
      'X-Unity-Version': '2018.4.11f1',
      'X-GA': 'v1 1',
      'ReleaseVersion': OB,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Host': host,
      'Connection': 'Keep-Alive',
      'Accept-Encoding': 'gzip',
    },
    timeout: 12000,
    validateStatus: s => s < 500,
  });

  return data;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const uid = req.query.uid || req.body?.uid;
  const region = (req.query.region || req.body?.region || 'ID').toUpperCase();

  if (!uid) return res.status(400).json({ error: 'uid wajib' });
  if (!/^\d{5,15}$/.test(uid)) return res.status(400).json({ error: 'uid harus 5-15 digit angka' });

  const trace = [];
  try {
    trace.push(`region=${region} host=${REGION_HOSTS[region] || REGION_HOSTS.ID}`);
    const token = await getGuestToken();
    trace.push(`token ok (uid ${token._uid})`);

    const data = await fetchPlayerInfo(uid, region, token);
    if (!data || (!data.nickname && !data.nick_name && !data.accountInfo)) {
      return res.status(404).json({
        error: 'akun tidak ditemukan atau response kosong',
        region,
        uid,
        trace,
        raw: data,
      });
    }

    const a = data.accountInfo || data;
    res.json({
      platform: 'freefire',
      ob: OB,
      uid,
      region,
      account: {
        nickname: a.nickname || a.nick_name || '—',
        level: a.level || a.lv || 0,
        exp: a.exp || 0,
        rank: a.rank || 0,
        rank_points: a.rank_points || a.rp || 0,
        badges: a.badge_cnt || a.badges || 0,
        signature: a.signature || a.sign || '',
        clan_name: a.clan_name || a.clanName || '',
        clan_id: a.clan_id || 0,
        create_time: a.create_time || a.createTime || 0,
        last_login: a.last_login || a.lastLogin || 0,
        head_pic: a.head_pic || a.headPic || '',
        banner: a.banner || '',
      },
      trace,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      region,
      uid,
      trace,
      hint: 'Guest auth Garena kadang rate-limit. Coba ulang 3 detik lagi. Kalau masih error, region mismatch atau OB version outdated.',
      detail: err.response?.data,
    });
  }
}
