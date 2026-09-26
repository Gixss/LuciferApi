import ytdl from '@distube/ytdl-core';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.query.url || req.body?.url;
  if (!url) return res.status(400).json({ error: 'url wajib' });
  if (!ytdl.validateURL(url)) return res.status(400).json({ error: 'url youtube tidak valid' });

  try {
    const info = await ytdl.getInfo(url);
    const formats = info.formats.filter(f => f.url).map(f => ({
      itag: f.itag,
      quality: f.qualityLabel || f.audioQuality || f.quality,
      container: f.container,
      hasVideo: f.hasVideo, hasAudio: f.hasAudio,
      contentLength: f.contentLength, url: f.url,
    }));
    res.json({
      platform: 'youtube',
      id: info.videoDetails.videoId,
      title: info.videoDetails.title,
      duration: parseInt(info.videoDetails.lengthSeconds),
      thumbnail: info.videoDetails.thumbnails.pop()?.url,
      author: info.videoDetails.author?.name,
      viewCount: info.videoDetails.viewCount,
      isShort: url.includes('/shorts/') || parseInt(info.videoDetails.lengthSeconds) <= 60,
      formats: {
        muxed: formats.filter(f => f.hasVideo && f.hasAudio).slice(0, 5),
        videoOnly: formats.filter(f => f.hasVideo && !f.hasAudio).slice(0, 8),
        audioOnly: formats.filter(f => !f.hasVideo && f.hasAudio).slice(0, 3),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
