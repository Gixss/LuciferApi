// language: JavaScript, file: api/tiktok.js
import axios from 'axios';
const BASE = 'https://www.tikwm.com';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.query.url || req.body?.url;
  if (!url) return res.status(400).json({ error: 'url wajib' });
  if (!/tiktok\.com|douyin\.com/.test(url)) return res.status(400).json({ error: 'url tidak valid' });

  try {
    const { data } = await axios.get(`${BASE}/api/`, {
      params: { url, hd: 1 },
      timeout: 20000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36' },
    });
    if (data.code !== 0) return res.status(502).json({ error: data.msg || 'gagal' });
    const d = data.data;
    const abs = p => p ? (p.startsWith('http') ? p : BASE + p) : null;
    res.json({
      platform: 'tiktok',
      id: d.id,
      title: d.title || '',
      cover: abs(d.cover),
      duration: d.duration,
      author: { unique_id: d.author?.unique_id, nickname: d.author?.nickname, avatar: abs(d.author?.avatar) },
      stats: { play: d.play_count, like: d.digg_count, comment: d.comment_count, share: d.share_count },
      music: d.music_info?.title || null,
      downloads: { no_watermark: abs(d.play), watermark: abs(d.wmplay), hd: abs(d.hdplay), audio: abs(d.music) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message, hint: 'Coba ulang 3-5 detik lagi.' });
  }
}
