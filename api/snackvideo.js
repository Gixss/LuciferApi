import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.query.url || req.body?.url;
  if (!url) return res.status(400).json({ error: 'url wajib' });

  try {
    const { data: html } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/122.0.0.0 Mobile Safari/537.36' },
      timeout: 15000,
    });
    const $ = cheerio.load(html);
    res.json({
      platform: 'snackvideo',
      title: $('meta[property="og:title"]').attr('content'),
      description: $('meta[property="og:description"]').attr('content'),
      thumbnail: $('meta[property="og:image"]').attr('content'),
      video: $('meta[property="og:video"]').attr('content') || $('meta[property="og:video:url"]').attr('content') || $('video source').attr('src'),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
