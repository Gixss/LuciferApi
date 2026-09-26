// language: JavaScript, file: api/snackvideo.js
import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.query.url || req.body?.url;
  if (!url) return res.status(400).json({ error: 'url wajib' });

  try {
    const { data: html } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/122.0.0.0 Mobile Safari/537.36' },
      timeout: 15000, maxRedirects: 5,
    });
    const $ = cheerio.load(html);
    const video = $('meta[property="og:video"]').attr('content')
      || $('meta[property="og:video:url"]').attr('content')
      || $('meta[property="og:video:secure_url"]').attr('content')
      || $('video source').attr('src');
    if (!video) return res.status(502).json({ error: 'video tidak ditemukan' });

    const id = (url.match(/[A-Za-z0-9_-]{8,}/g) || ['snack']).pop();
    res.json({
      platform: 'snackvideo',
      id,
      title: $('meta[property="og:title"]').attr('content') || '',
      description: $('meta[property="og:description"]').attr('content') || '',
      thumbnail: $('meta[property="og:image"]').attr('content') || null,
      downloads: [
        { url: video, filename: `snackvideo_${id}.mp4`, label: 'MP4 · Video' },
      ],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
