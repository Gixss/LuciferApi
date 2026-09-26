import axios from 'axios';

export const config = { api: { responseLimit: false } };

function guessReferer(target) {
  try {
    const h = new URL(target).hostname;
    if (/tiktok|tikwm|tiklydown|tikmate|douyin/.test(h)) return 'https://www.tiktok.com/';
    if (/instagram|cdninstagram|fbcdn/.test(h)) return 'https://www.instagram.com/';
    if (/youtube|googlevideo|ytimg/.test(h)) return 'https://www.youtube.com/';
    if (/snackvideo|snack/.test(h)) return 'https://www.snackvideo.com/';
    return `https://${h}/`;
  } catch { return ''; }
}

function sanitize(name) {
  return String(name).replace(/[^\w.\-]+/g, '_').slice(0, 120) || 'file';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const targetUrl = req.query.url;
  const filename = req.query.filename || 'video.mp4';
  const customReferer = req.query.referer;

  if (!targetUrl) { res.setHeader('Content-Type', 'application/json'); return res.status(400).json({ error: 'url wajib' }); }

  let parsed;
  try { parsed = new URL(targetUrl); } catch { res.setHeader('Content-Type', 'application/json'); return res.status(400).json({ error: 'url invalid' }); }
  if (!/^https?:$/.test(parsed.protocol)) { res.setHeader('Content-Type', 'application/json'); return res.status(400).json({ error: 'protocol invalid' }); }

  const referer = customReferer || guessReferer(targetUrl);

  try {
    const upstream = await axios.get(targetUrl, {
      responseType: 'stream', timeout: 28000, maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
        'Accept': '*/*', 'Accept-Encoding': 'identity',
        'Referer': referer, 'Origin': referer.replace(/\/$/, ''),
      },
      validateStatus: s => s >= 200 && s < 400,
    });

    const ct = upstream.headers['content-type'] || 'application/octet-stream';
    const cl = upstream.headers['content-length'];
    res.setHeader('Content-Type', ct);
    if (cl) res.setHeader('Content-Length', cl);
    res.setHeader('Content-Disposition', `attachment; filename="${sanitize(filename)}"`);
    res.setHeader('Cache-Control', 'no-store');
    upstream.data.pipe(res);
    upstream.data.on('error', () => { try { res.end(); } catch {} });
  } catch (err) {
    res.setHeader('Location', targetUrl);
    res.setHeader('X-Fallback', 'proxy-error');
    return res.status(302).end();
  }
}
