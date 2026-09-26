import axios from 'axios';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.query.url || req.body?.url;
  if (!url) return res.status(400).json({ error: 'url wajib' });

  try {
    const shortcode = url.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/)?.[2];
    if (!shortcode) return res.status(400).json({ error: 'shortcode tidak ketemu' });

    const { data } = await axios.get(`https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'X-IG-App-ID': '936619743392459',
      },
      timeout: 15000,
    });

    const item = data?.items?.[0] || data?.graphql?.shortcode_media;
    if (!item) return res.status(500).json({ error: 'gagal parse' });

    const type = item.media_type === 2 ? 'video' : item.media_type === 8 ? 'carousel' : 'image';
    const downloads = [];
    if (type === 'carousel' && item.carousel_media) {
      item.carousel_media.forEach((m, i) => downloads.push({
        index: i + 1,
        type: m.media_type === 2 ? 'video' : 'image',
        url: m.video_versions?.[0]?.url || m.image_versions2?.candidates?.[0]?.url,
      }));
    } else {
      downloads.push({
        type,
        url: item.video_versions?.[0]?.url || item.image_versions2?.candidates?.[0]?.url,
      });
    }

    res.json({
      platform: 'instagram',
      shortcode, type,
      caption: item.caption?.text || '',
      author: { username: item.user?.username, full_name: item.user?.full_name, avatar: item.user?.profile_pic_url },
      stats: { like: item.like_count, comment: item.comment_count, view: item.view_count || item.play_count },
      thumbnail: item.image_versions2?.candidates?.[0]?.url,
      downloads,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}