# Transcript Studio — Desktop design

Thiết kế Apple trong DESIGN.reference.md được chuyển thành desktop app macOS, chạy trên Windows. Quy chuẩn dưới đây ưu tiên hơn bản tham khảo web.

## Bố cục
Sidebar 232px, titlebar 57px, vùng thêm nguồn, thư viện và trình đọc chia cột. Cửa sổ mặc định 1440 × 940, tối thiểu 1024 × 700. Danh sách và transcript cuộn độc lập. macOS dùng hiddenInset với nút cửa sổ native; Windows giữ titlebar native. Không dùng landing page hoặc hero toàn màn hình.

## Tokens
- Action blue #0066cc; ink #1d1d1f; muted #8a8b92.
- Canvas #f8f9fb; sidebar #f0f1f4; surface #ffffff; divider #e7e8ec; selected #e0e9f6.
- Control radius 8px, panel radius 10–12px; spacing 4 / 8 / 12 / 16 / 24 / 32px.
- Không gradient hoặc đổ bóng trang trí. Phân vùng bằng surface và viền mảnh.

## Font offline
SF Pro Text 400/500/600/700 cho nội dung và control; SF Pro Display 600/700 cho heading, letter spacing âm nhẹ; JetBrains Mono 400 cho timestamp/mã. Font trong public/fonts chép từ D:\Project\test-repo\apps\frontend\public\fonts theo yêu cầu. Dùng @font-face local, không CDN. Body 11–13px, heading chính 33px, transcript 12px/1.85 thay cho body 17px của web tham khảo.

## Components
- Một bộ nút, input, select, checkbox dùng chung radius, màu và kiểu chữ. Icon Lucide outline stroke 1.65.
- Primary xanh/trắng; secondary trắng/viền mảnh; selected nền xanh nhạt; disabled giảm opacity.
- Không focus ring: không outline hoặc box-shadow focus. Giữ Tab và semantics; focus bàn phím thay đổi nền.
- Nội dung tiếng Việt. Icon-only buttons có accessible name.
- Trạng thái trống có hướng dẫn, không dữ liệu giả. Browser preview phải ghi rõ giới hạn.
- Hiển thị tiến độ, lỗi theo video, hủy giữ kết quả; xóa xác nhận inline; xuất dùng dialog native.
- Khi prefers-reduced-motion bật, tắt animation.

## Responsive
Hai cột thư viện/trình đọc trên desktop, dưới 900px chuyển một cột để xem preview. Không giảm font để nhét nội dung dài; dùng scroll và ellipsis thích hợp.
