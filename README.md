# Transcript Studio

Ứng dụng desktop lấy transcript từ video, playlist hoặc toàn bộ video công khai của kênh YouTube. React + Vite + Electron, Python worker dùng [youtube-transcript-api](https://github.com/jdepoix/youtube-transcript-api), [yt-dlp](https://github.com/yt-dlp/yt-dlp) để liệt kê metadata.

## Chạy

Cần Node.js 22.12+, pnpm và Python 3.10+ trong PATH.

Có thể chạy trực tiếp các script tại thư mục gốc, kể cả khi terminal đang ở thư mục khác. Script tự cài Node dependencies nếu chưa có `node_modules`, tạo `.venv` và cài Python dependencies còn thiếu. Lần đầu cần kết nối mạng.

| Tác vụ | Windows | macOS / Linux |
|---|---|---|
| Chạy dev Electron | `dev.bat` | `bash dev.sh` |
| Build bộ cài desktop | `build.bat` | `bash build.sh` |
| Chỉ build frontend | `build.bat frontend` | `bash build.sh frontend` |
| Xem hướng dẫn | `build.bat --help` | `bash build.sh --help` |

Trong PowerShell dùng `./dev.bat` hoặc `./build.bat`. Build frontend xuất ra `dist/`; build desktop xuất ra `release/` (NSIS trên Windows, DMG trên macOS). Linux chạy dev/frontend; cấu hình bộ cài hiện dành cho Windows/macOS. Có thể chạy `chmod +x dev.sh build.sh` trên macOS/Linux để dùng `./dev.sh` và `./build.sh`. Nhấn Ctrl+C để dừng dev. Script dừng và trả mã lỗi nếu cài đặt hoặc build thất bại.

```powershell
pnpm install
pnpm setup:python
pnpm dev
```

`pnpm dev:web` chỉ xem UI trong trình duyệt. Lấy transcript cần chạy Electron bằng `pnpm dev`. Không cần API key. Dán liên kết, chọn video/playlist/kênh, điều chỉnh ngôn ngữ trong Tùy chọn và bấm Lấy transcript.

Kênh được duyệt từ trang gốc để bao gồm video, Shorts và livestream công khai; không đặt giới hạn số video. Mỗi video lưu một transcript, theo thứ tự ngôn ngữ ưu tiên, ưu tiên phụ đề thủ công. Fallback có thể dùng ngôn ngữ khác sẵn có. Video riêng tư, bị xóa, không có phụ đề hoặc bị giới hạn truy cập sẽ được báo riêng. YouTube có thể chặn IP; batch sẽ dừng và giữ kết quả trước đó. Ứng dụng lấy phụ đề có sẵn, không nhận dạng giọng nói.

## Thư viện

Mặc định video đã có transcript trong thư viện sẽ được bỏ qua trên mọi nguồn video/playlist/kênh, kể cả khi chạy lại sau lỗi IP bị chặn hoặc hủy tác vụ. Video chưa lấy thành công vẫn được thử ở lần chạy tiếp theo. Nếu muốn cập nhật transcript, bật **Lấy lại transcript đã lưu cho tác vụ tiếp theo** trước khi bấm Lấy transcript. Tùy chọn chỉ áp dụng một tác vụ, sau đó tự tắt. Bản đã lưu chỉ được thay thế khi lấy lại thành công.

Lưu tại `app.getPath('userData')/library.json`, khử trùng lặp theo video ID. Windows thường ở `%APPDATA%/Transcript Studio` (development có thể theo tên package), macOS ở `~/Library/Application Support/Transcript Studio`.

Tìm theo tiêu đề/kênh/nội dung, đọc và tìm trong transcript, bật/tắt timestamp, sao chép. Xuất TXT/SRT/JSON UTF-8 qua dialog native. Nhiều tệp được xuất vào thư mục mới `Transcripts-<timestamp>` để tránh ghi đè. Transcript và font đọc được offline; thumbnail cần mạng. Không tải video/audio.

## Kiểm tra và đóng gói

```powershell
pnpm typecheck
pnpm test
pnpm build
pnpm dist
```

`pnpm dist` tạo worker PyInstaller kèm Python và dependencies rồi đóng gói DMG trên macOS hoặc NSIS trên Windows. Build trên từng OS/architecture đích. Người dùng bản đóng gói không cần cài Python. Chứng chỉ signing/notarization chưa được cấu hình; bản hiện tại dành cho thử nghiệm.

Font đã chép từ `D:\Project\test-repo\apps\frontend\public\fonts` vào `public/fonts`, không gọi CDN. Quy chuẩn trong DESIGN.md, hướng dẫn phát triển trong AGENTS.md.

## Trạng thái kiểm tra trong workspace

TypeScript, build Vite, kiểm tra cú pháp Electron/Python và 3 test Node (URL, SRT, Unicode) đã chạy thành công. Chưa chạy được Python tests, tải transcript thực tế hoặc mở/đóng gói Electron vì môi trường chặn tải từ PyPI và tải binary Electron. Cần cài dependencies trên máy có kết nối rồi chạy lại `pnpm test`, `pnpm dev` và `pnpm dist` trên từng OS đích trước khi phát hành.
