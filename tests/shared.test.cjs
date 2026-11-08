const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sourceUrl, timestamp, formatTranscript } = require('../electron/shared.cjs');
test('normalize video, shorts, playlist and channel root', () => {
  assert.equal(sourceUrl('https://youtu.be/dQw4w9WgXcQ?t=12', 'video'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(sourceUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ', 'video'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(sourceUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123', 'playlist'), 'https://www.youtube.com/playlist?list=PL123');
  assert.equal(sourceUrl('https://www.youtube.com/@TED/videos', 'channel'), 'https://www.youtube.com/@TED');
});
test('reject arbitrary hosts, credentials, ports and malformed sources', () => {
  for (const url of ['https://youtube.com.evil.test/@TED', 'file:///etc/passwd', 'https://evil.test', 'https://user@youtube.com/@TED', 'https://youtube.com:8443/@TED']) assert.throws(() => sourceUrl(url, 'channel'));
  assert.throws(() => sourceUrl('https://www.youtube.com/watch?v=no', 'video'));
  assert.throws(() => sourceUrl('https://www.youtube.com/playlist', 'playlist'));
});
test('SRT rounds milliseconds across minute boundary and exports Unicode', () => {
  assert.equal(timestamp(59.9996, true), '00:01:00,000');
  const video = {id:'dQw4w9WgXcQ',title:'Tiếng Việt',snippets:[{text:'Xin chào',start:59.9996,duration:1.5}]};
  assert.equal(formatTranscript(video,'srt'), '1\n00:01:00,000 --> 00:01:01,500\nXin chào\n');
  assert.match(formatTranscript(video,'txt'), /Tiếng Việt/);
  assert.deepEqual(JSON.parse(formatTranscript(video,'json')), video);
});
