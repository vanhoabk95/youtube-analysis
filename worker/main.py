"""One job per process; JSON lines on stdout, diagnostics on stderr."""
import json
import re
import sys
import time
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs


def emit(kind, **data):
    print(json.dumps({"type": kind, **data}, ensure_ascii=False), flush=True)


class QuietLogger:
    def debug(self, msg): pass
    def warning(self, msg): pass
    def error(self, msg): pass


def discover(url, kind):
    from yt_dlp import YoutubeDL
    options = {"extract_flat": "in_playlist", "skip_download": True, "ignoreerrors": True,
               "quiet": True, "logger": QuietLogger(), "socket_timeout": 30,
               "extractor_retries": 2, "retries": 2}
    # A channel root includes Videos, Shorts and Streams, rather than only /videos.
    with YoutubeDL(options) as ydl:
        info = ydl.extract_info(url, download=False)
    if not info:
        raise ValueError("Không đọc được nguồn YouTube. Kiểm tra liên kết và kết nối mạng.")
    videos, seen = [], set()

    def visit(item):
        if not item:
            return
        if "entries" in item:
            for entry in item["entries"] or []:
                visit(entry)
            return
        video_id = item.get("id", "")
        if not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id) or video_id in seen:
            return
        seen.add(video_id)
        videos.append({"id": video_id, "title": item.get("title") or video_id,
                       "channel": item.get("channel") or item.get("uploader") or info.get("channel") or info.get("uploader") or "YouTube",
                       "duration": item.get("duration") or 0})

    visit(info)
    return videos, info.get("title", "YouTube")


def choose_transcript(api, video_id, languages, fallback):
    from youtube_transcript_api import NoTranscriptFound
    tracks = api.list(video_id)
    try:
        return tracks.find_transcript(languages).fetch()
    except NoTranscriptFound:
        if not fallback:
            raise
        available = list(tracks)
        if not available:
            raise
        available.sort(key=lambda track: track.is_generated)
        return available[0].fetch()


def run(job):
    existing_ids = set(job.get("existingIds", [])) if job.get("refreshExisting") is not True else set()
    # A saved single video needs neither discovery nor a transcript request.
    if job["kind"] == "video":
        video_id = parse_qs(urlparse(job["url"]).query).get("v", [None])[0]
        if video_id in existing_ids:
            emit("done", success=0, failed=0, cached=1)
            return
    from youtube_transcript_api import YouTubeTranscriptApi, RequestBlocked, IpBlocked, TranscriptsDisabled, NoTranscriptFound
    from requests import Session
    class TimeoutSession(Session):
        def request(self, *args, **kwargs):
            kwargs.setdefault("timeout", 30)
            return super().request(*args, **kwargs)
    emit("phase", message="Đang tìm video trong nguồn YouTube…")
    videos, title = discover(job["url"], job["kind"])
    if not videos:
        raise ValueError("Không tìm thấy video công khai trong nguồn này.")
    cached = sum(video["id"] in existing_ids for video in videos)
    videos = [video for video in videos if video["id"] not in existing_ids]
    emit("discovered", total=len(videos), title=title, cached=cached)
    if not videos:
        emit("done", success=0, failed=0, cached=cached)
        return
    success, failed = 0, 0
    with TimeoutSession() as session:
        api = YouTubeTranscriptApi(http_client=session)
        for index, video in enumerate(videos):
            emit("progress", current=index + 1, total=len(videos), title=video["title"])
            try:
                transcript = choose_transcript(api, video["id"], job["languages"], job.get("fallback", True))
                video.update({"snippets": transcript.to_raw_data(), "language": transcript.language,
                              "languageCode": transcript.language_code, "generated": transcript.is_generated,
                              "source": job["kind"], "sourceTitle": title, "sourceUrl": job["url"],
                              "savedAt": datetime.now(timezone.utc).isoformat()})
                emit("video", video=video)
                success += 1
            except (RequestBlocked, IpBlocked):
                emit("error", message="YouTube đang chặn yêu cầu từ IP này. Tác vụ đã dừng; các transcript đã lấy vẫn được giữ lại. Khi chạy lại, ứng dụng sẽ bỏ qua video đã lưu, trừ khi bạn chọn lấy lại.")
                return
            except (TranscriptsDisabled, NoTranscriptFound):
                failed += 1
                emit("skipped", id=video["id"], title=video["title"], message="Không có phụ đề phù hợp hoặc phụ đề đã bị tắt.")
            except Exception as error:
                failed += 1
                emit("skipped", id=video["id"], title=video["title"], message=str(error)[:500])
            if index + 1 < len(videos):
                time.sleep(1.5)
    emit("done", success=success, failed=failed, cached=cached)


if __name__ == "__main__":
    try:
        run(json.loads(sys.stdin.read()))
    except Exception as error:
        emit("error", message=str(error)[:1000])
        sys.exit(1)
