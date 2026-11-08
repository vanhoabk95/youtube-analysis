const VIDEO = /^[A-Za-z0-9_-]{11}$/;
function sourceUrl(value, kind) {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('Liên kết không hợp lệ.');
  const raw = value.trim();
  if (kind === 'video' && VIDEO.test(raw)) return `https://www.youtube.com/watch?v=${raw}`;
  let url;
  try { url = new URL(raw); } catch { throw new Error('Vui lòng nhập liên kết YouTube đầy đủ.'); }
  if (url.protocol !== 'https:' || !['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(url.hostname) || url.username || url.password || url.port) throw new Error('Chỉ hỗ trợ liên kết HTTPS của YouTube.');
  if (!['video', 'playlist', 'channel'].includes(kind)) throw new Error('Loại nguồn không hợp lệ.');
  if (kind === 'video') {
    const id = url.hostname === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)/)?.[1];
    if (!VIDEO.test(id || '')) throw new Error('Không tìm thấy mã video trong liên kết.');
    return `https://www.youtube.com/watch?v=${id}`;
  }
  if (kind === 'playlist') {
    const id = url.searchParams.get('list');
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('Liên kết cần có mã playlist (list=...).');
    return `https://www.youtube.com/playlist?list=${id}`;
  }
  if (!/^\/(?:@[\w.\-%]+|channel\/[\w-]+|c\/[\w.\-%]+|user\/[\w.\-%]+)(?:\/(?:videos|shorts|streams|featured))?\/?$/.test(url.pathname)) throw new Error('Vui lòng nhập liên kết kênh, ví dụ youtube.com/@TED.');
  return `https://www.youtube.com${url.pathname.replace(/\/(videos|shorts|streams|featured)\/?$/, '').replace(/\/$/, '')}`;
}
function timestamp(seconds, srt = false) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
  const clock = [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
  return srt ? `${clock},${String(ms % 1000).padStart(3, '0')}` : clock;
}
function formatTranscript(video, format) {
  if (format === 'json') return JSON.stringify(video, null, 2);
  if (format === 'srt') return video.snippets.map((s, i) => `${i + 1}\n${timestamp(s.start, true)} --> ${timestamp(s.start + s.duration, true)}\n${s.text}\n`).join('\n');
  return `${video.title}\nhttps://www.youtube.com/watch?v=${video.id}\n\n${video.snippets.map(s => s.text).join('\n')}\n`;
}
module.exports = { sourceUrl, timestamp, formatTranscript };
