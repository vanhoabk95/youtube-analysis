import unittest
from unittest.mock import patch, MagicMock
from main import discover, choose_transcript, run
from youtube_transcript_api import NoTranscriptFound, RequestBlocked

class WorkerTests(unittest.TestCase):
    @patch('yt_dlp.YoutubeDL')
    def test_nested_channel_tabs_and_deduplication(self, ydl):
        ydl.return_value.__enter__.return_value.extract_info.return_value = {'title': 'Channel', 'entries': [
            {'entries': [{'id': 'abcdefghijk', 'title': 'A'}, None]},
            {'entries': [{'id': 'abcdefghijk'}, {'id': '12345678901', 'title': 'Short'}]}, {'id': 'bad'}]}
        videos, title = discover('https://www.youtube.com/@test', 'channel')
        self.assertEqual([v['id'] for v in videos], ['abcdefghijk', '12345678901'])
        self.assertEqual(title, 'Channel')

    def test_fallback_prefers_manual_and_can_be_disabled(self):
        api = MagicMock()
        tracks = api.list.return_value
        tracks.find_transcript.side_effect = NoTranscriptFound('abcdefghijk', ['vi'], [])
        generated, manual = MagicMock(), MagicMock()
        generated.is_generated = True
        manual.is_generated = False
        tracks.__iter__.return_value = iter([generated, manual])
        self.assertEqual(choose_transcript(api, 'abcdefghijk', ['vi'], True), manual.fetch.return_value)
        with self.assertRaises(NoTranscriptFound):
            choose_transcript(api, 'abcdefghijk', ['vi'], False)

    @patch('main.emit')
    @patch('main.discover')
    def test_saved_single_video_never_contacts_youtube(self, discover_mock, emit):
        run({'url': 'https://www.youtube.com/watch?v=abcdefghijk', 'kind': 'video',
             'languages': ['vi'], 'existingIds': ['abcdefghijk']})
        discover_mock.assert_not_called()
        emit.assert_called_once_with('done', success=0, failed=0, cached=1)

    @patch('main.emit')
    @patch('youtube_transcript_api.YouTubeTranscriptApi')
    @patch('main.discover', return_value=([{'id': 'abcdefghijk', 'title': 'A'}], 'Channel'))
    def test_all_saved_batch_does_not_create_transcript_client(self, discover_mock, api, emit):
        run({'url': 'https://www.youtube.com/@test', 'kind': 'channel',
             'languages': ['vi'], 'existingIds': ['abcdefghijk']})
        api.assert_not_called()
        self.assertEqual(emit.call_args.kwargs, {'success': 0, 'failed': 0, 'cached': 1})

    @patch('main.emit')
    @patch('main.choose_transcript')
    @patch('main.discover', return_value=([{'id': 'abcdefghijk', 'title': 'Saved'}, {'id': '12345678901', 'title': 'New'}], 'Playlist'))
    def test_rerun_only_fetches_unsaved_video(self, discover_mock, fetch, emit):
        run({'url': 'https://www.youtube.com/playlist?list=PL123', 'kind': 'playlist',
             'languages': ['vi'], 'existingIds': ['abcdefghijk']})
        self.assertEqual(fetch.call_count, 1)
        self.assertEqual(fetch.call_args.args[1], '12345678901')
        self.assertEqual(emit.call_args.kwargs, {'success': 1, 'failed': 0, 'cached': 1})

    @patch('main.emit')
    @patch('main.choose_transcript')
    @patch('main.discover', return_value=([{'id': 'abcdefghijk', 'title': 'Saved'}], 'Video'))
    def test_explicit_refresh_fetches_saved_video(self, discover_mock, fetch, emit):
        run({'url': 'https://www.youtube.com/watch?v=abcdefghijk', 'kind': 'video',
             'languages': ['vi'], 'existingIds': ['abcdefghijk'], 'refreshExisting': True})
        self.assertEqual(fetch.call_count, 1)
        self.assertEqual(fetch.call_args.args[1], 'abcdefghijk')
        self.assertEqual(emit.call_args.kwargs, {'success': 1, 'failed': 0, 'cached': 0})

    @patch('main.emit')
    @patch('main.choose_transcript', side_effect=RequestBlocked('abcdefghijk'))
    @patch('main.discover', return_value=([{'id': 'abcdefghijk', 'title': 'A'}, {'id': '12345678901', 'title': 'B'}], 'Channel'))
    def test_ip_block_stops_batch(self, discover_mock, fetch, emit):
        run({'url': 'https://www.youtube.com/@test', 'kind': 'channel', 'languages': ['vi']})
        self.assertEqual(fetch.call_count, 1)
        self.assertEqual(emit.call_args.args[0], 'error')

if __name__ == '__main__':
    unittest.main()
