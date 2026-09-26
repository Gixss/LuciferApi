// language: JavaScript, file: api/instagram.js
import axios from 'axios';

const AL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const MOB = 'Instagram 219.0.0.12.117 Android (30/11; 420dpi; 1080x2340; samsung; SM-G991B; o1s; exynos2100; en_US; 349282295)';

function sc2id(sc) {
  let id = 0n;
  for (const c of sc) {
    const i = AL.indexOf(c);
    if (i === -1) return null;
    id = id * 64n + BigInt(i);
  }
  return id.toString();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.query.url || req.body?.url;
  if (!url) return res.status(400).json({ error: 'url wajib' });
  const sc = url.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)?.[1];
  if (!sc) return res.status(400).json({ error: 'shortcode tidak ketemu' });
  const mid = sc2id(sc);
  if (!mid) return res.status(400).json({ error: 'shortcode invalid' });

  const headers = {
    'User-Agent': MOB,
    'Accept': '*/*',
    'Accept-Language': 'en-US',
    'X-IG-App-ID': '936619743392459',
    'X-IG-Connection-Type': 'WIFI',
    'X-IG-Capabilities': '3brTvw==',
  };
  if (process.env.IG_COOKIE) headers['Cookie'] = process.env.IG_COOKIE;

  try {
    const { data } = await axios.get(`https://i.instagram.com/api/v1/media/${mid}/info/`, { headers, timeout: 15000 });
    const item = data?.items?.[0];
    if (!item) throw new Error('response kosong');

    const isVid = item.media_type === 2;
    const isCar = item.media_type === 8;
    const type = isCar ? 'carousel' : isVid ? 'video' : 'image';

    const downloads = [];
    if (isCar && item.carousel_media) {
      item.carousel_media.forEach((m, i) => downloads.push({
        index: i + 1,
        type: m.media_type === 2 ? 'video' : 'image',
        url: m.video_versions?.[0]?.url || m.image_versions2?.candidates?.[0]?.url,
      }));
    } else {
      downloads.push({ type, url: item.video_versions?.[0]?.url || item.image_versions2?.candidates?.[0]?.url });
    }

    res.json({
      platform: 'instagram',
      shortcode: sc,
      type,
      caption: item.caption?.text || '',
      author: { username: item.user?.username, full_name: item.user?.full_name, avatar: item.user?.profile_pic_url },
      stats: { like: item.like_count, comment: item.comment_count, view: item.view_count || item.play_count },
      thumbnail: item.image_versions2?.candidates?.[0]?.url,
      downloads,
    });
  } catch (err) {
    res.status(502).json({ error: err.message, hint: 'Set env IG_COOKIE untuk hasil stabil.' });
  }
}
