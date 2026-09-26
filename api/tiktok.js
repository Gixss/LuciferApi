import axios from 'axios';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.query.url || req.body?.url;
  if (!url) return res.status(400).json({ error: 'url wajib' });

  try {
    const { data } = await axios.get('https://www.tikwm.com/api/', {
      params: { url, hd: 1 },
      timeout: 15000,
    });
    if (data.code !== 0) return res.status(500).json({ error: data.msg || 'gagal' });
    const d = data.data;
    res.json({
      platform: 'tiktok',
      id: d.id, title: d.title, cover: d.cover, duration: d.duration,
      author: { unique_id: d.author?.unique_id, nickname: d.author?.nickname, avatar: d.author?.avatar },
      stats: { play: d.play_count, like: d.digg_count, comment: d.comment_count, share: d.share_count },
      music: d.music_info?.title,
      downloads: {
        no_watermark: 'https://www.tikwm.com' + d.play,
        watermark: 'https://www.tikwm.com' + d.wmplay,
        hd: d.hdplay ? 'https://www.tikwm.com' + d.hdplay : null,
        audio: 'https://www.tikwm.com' + d.music,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
