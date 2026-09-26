// language: JavaScript, file: api/youtube.js
import { Innertube } from 'youtubei.js';

let _p = null;
const getClient = () => _p || (_p = Innertube.create({ lang: 'en', location: 'US', retrieve_player: true, generate_session_locally: true }));

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.query.url || req.body?.url;
  if (!url) return res.status(400).json({ error: 'url wajib' });
  const m = url.match(/(?:v=|youtu\.be\/|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/);
  if (!m) return res.status(400).json({ error: 'url youtube invalid' });
  const vid = m[1];

  try {
    const yt = await getClient();
    const info = await yt.getInfo(vid);
    const b = info.basic_info;
    const sd = info.streaming_data || {};
    const dec = f => { try { return f.url || f.decipher(yt.session.player); } catch { return null; } };

    const muxed = (sd.formats || []).map(f => ({
      itag: f.itag,
      quality: f.quality_label || f.quality,
      container: (f.mime_type || '').split('/')[1]?.split(';')[0] || 'mp4',
      size: f.content_length,
      url: dec(f),
    })).filter(f => f.url);

    const adaptive = (sd.adaptive_formats || []).map(f => ({
      itag: f.itag,
      quality: f.quality_label || f.audio_quality || f.quality,
      container: (f.mime_type || '').split('/')[1]?.split(';')[0] || 'mp4',
      hasVideo: f.has_video,
      hasAudio: f.has_audio,
      size: f.content_length,
      url: dec(f),
    })).filter(f => f.url);

    res.json({
      platform: 'youtube',
      id: vid,
      title: b.title,
      description: (b.short_description || '').slice(0, 500),
      duration: b.duration,
      thumbnail: b.thumbnail?.[0]?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
      author: b.author,
      viewCount: b.view_count,
      isShort: /\/shorts\//.test(url) || b.duration <= 60,
      formats: {
        muxed,
        videoOnly: adaptive.filter(f => f.hasVideo && !f.hasAudio).sort((a, b) => (b.size || 0) - (a.size || 0)).slice(0, 12),
        audioOnly: adaptive.filter(f => !f.hasVideo && f.hasAudio).sort((a, b) => (b.size || 0) - (a.size || 0)).slice(0, 5),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
