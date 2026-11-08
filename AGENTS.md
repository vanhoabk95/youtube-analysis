# Transcript Studio

Desktop app macOS/Windows lấy transcript theo video, playlist hoặc kênh YouTube.

## Stack
- `src/`: Vite + React + TypeScript, giao diện tiếng Việt.
- `electron/`: main process, preload sandbox, IPC; contextIsolation bật, renderer không có Node.
- `worker/`: Python JSON-lines worker; youtube-transcript-api lấy phụ đề, yt-dlp chỉ liệt kê metadata.
- Một tác vụ mỗi process; hủy process phải giữ kết quả đã lưu. Thư viện được ghi tuần tự qua tệp tạm.
- PyInstaller bundle worker trên từng OS/architecture đích, electron-builder tạo DMG/NSIS.

## Lệnh
`pnpm install`, `pnpm setup:python`, `pnpm dev`.
Kiểm tra: `pnpm typecheck`, `pnpm test`, `pnpm build`.
Đóng gói: `pnpm dist` trên hệ điều hành đích.

## Quy ước
- Đọc DESIGN.md trước khi sửa UI. Desktop macOS, một bộ style nhất quán, không focus ring; giữ keyboard navigation và thể hiện focus bằng nền.
- Font offline trong public/fonts được chép từ thư mục người dùng cung cấp; không dùng CDN font.
- Không tạo dữ liệu giả như dữ liệu thật. Browser preview ghi rõ giới hạn.
- Chỉ nhận URL HTTPS YouTube; không chạy shell với dữ liệu người dùng.
- Kênh bao gồm các tab video/Shorts/streams công khai, khử trùng lặp ID.
- Dừng khi IP bị chặn; video không có phụ đề được báo riêng.
- Mặc định bỏ qua video có transcript trong thư viện theo ID, áp dụng mọi nguồn và khi chạy lại; chỉ lấy lại khi người dùng bật tùy chọn cho tác vụ đó. Danh sách ID lấy từ main process, không tin renderer.
- Không tự thay thư viện transcript bằng dịch vụ khác hoặc ASR.
- Chạy typecheck, build và kiểm tra logic URL/export/worker khi sửa logic.
