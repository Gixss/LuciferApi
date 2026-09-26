// language: JavaScript, file: api/download.js
// Proxy stream dengan header Content-Disposition buat force download di browser
import axios from 'axios';

export const config = { api: { responseLimit: false } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const targetUrl = req.query.url;
  const filename = req.query.filename || 'video.mp4';
  const referer = req.query.referer || '';

  if (!targetUrl) return res.status(400).json({ error: 'url wajib' });

  let parsed;
  try { parsed = new URL(targetUrl); } catch { return res.status(400).json({ error: 'url invalid' }); }
  if (!/^https?:$/.test(parsed.protocol)) return res.status(400).json({ error: 'protocol invalid' });

  try {
    const upstream = await axios.get(targetUrl, {
      responseType: 'stream',
      timeout: 25000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'identity',
        ...(referer ? { Referer: referer } : {}),
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
    res.status(502).json({ error: 'gagal proxy', detail: err.message });
  }
}

function sanitize(name) {
  return String(name).replace(/[^\w.\-]+/g, '_').slice(0, 120) || 'file';
}
