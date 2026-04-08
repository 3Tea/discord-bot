---
title: Confession
description: Đăng confession ẩn danh, bình chọn, trả lời và sử dụng tính năng VIP.
icon: "🎭"
order: 4
relatedCommands: ["confession"]
---

## Tổng Quan

Hệ thống confession cho phép thành viên đăng **tin nhắn ẩn danh** — không ai có thể thấy ai viết (kể cả admin, trừ khi bật chế độ review). Confession được đánh số, có thể bình chọn và trả lời.

## Gửi Confession

Dùng `/confession submit` để viết confession:

| Tùy Chọn | Bắt Buộc | Mô Tả |
|----------|----------|--------|
| `text` | Có | Nội dung confession (tối đa 3.500 ký tự) |
| `image` | Không | Đính kèm hình ảnh |
| `tag` | Không | Phân loại confession |
| `vip` | Không | Confession VIP dạng vàng (tốn gem) |
| `skip_cooldown` | Không | Bỏ qua thời gian chờ (tốn coin) |

### Tags

Chọn tag để phân loại confession:

| Tag | Phù Hợp Cho |
|-----|------------|
| Heartfelt | Nội dung nghiêm túc, cảm xúc |
| Funny | Hài hước, vui vẻ |
| Question | Hỏi cộng đồng |
| Sharing | Chia sẻ câu chuyện, trải nghiệm |
| Other | Mọi thứ khác |

## Chế Độ Instant vs. Review

Admin server chọn cách confession hoạt động:

| Chế Độ | Cách Hoạt Động |
|--------|---------------|
| **Instant** | Confession được đăng ngay lập tức lên kênh công khai |
| **Review** | Confession đến kênh review cho mod trước. Mod duyệt hoặc từ chối trước khi công khai |

Ở chế độ review, mod có thể thấy ai gửi confession — nhưng bài đăng công khai luôn ẩn danh.

## Confession VIP

Dùng gem để confession nổi bật với **embed màu vàng**. Confession VIP khác biệt về mặt hình ảnh và thu hút sự chú ý hơn.

## Bỏ Qua Cooldown

Có thời gian chờ giữa các confession (admin đặt, 1–120 phút). Nếu không muốn đợi, bạn có thể dùng coin để bỏ qua.

## Bình Chọn & Trả Lời

Mỗi confession đã đăng có nút **upvote** và **downvote**. Bạn cũng có thể **trả lời** confession — phản hồi cũng ẩn danh.

## Bảng Lệnh

| Lệnh | Mô Tả |
|-------|--------|
| `/confession submit` | Gửi confession mới |

## Dành Cho Admin

> Phần này dành cho quản trị viên và moderator.

### Thiết Lập Confession

Dùng `/confession setup` để cấu hình hệ thống:

| Cài Đặt | Mô Tả |
|---------|--------|
| Mode | `instant` (đăng ngay) hoặc `review` (cần mod duyệt) |
| Public channel | Nơi confession được đăng công khai |
| Review channel | Nơi confession chờ duyệt (chỉ chế độ review) |
| Cooldown | Thời gian chờ giữa các lần gửi (1–120 phút) |

### Công Cụ Quản Lý

| Lệnh | Quyền | Mô Tả |
|-------|-------|--------|
| `/confession ban` | Manage Messages | Cấm người dùng gửi confession (vĩnh viễn hoặc tạm thời: 1h, 6h, 1d, 7d, 30d) |
| `/confession unban` | Manage Messages | Gỡ lệnh cấm confession |
| `/confession filter-add` | Manage Guild | Thêm từ khóa vào danh sách đen |
| `/confession filter-remove` | Manage Guild | Xóa từ khóa khỏi danh sách đen |
| `/confession filter-list` | Manage Guild | Xem tất cả từ khóa bị chặn |

### Quy Trình Review

1. Người dùng gửi confession → xuất hiện trong **kênh review** (hiển thị tác giả cho mod)
2. Mod bấm **Approve** → confession được đăng ẩn danh lên kênh công khai
3. Mod bấm **Reject** → confession bị xóa (hoàn tiền nếu có)

> **Mẹo:** Dùng bộ lọc từ khóa để tự động chặn confession chứa nội dung không phù hợp. Bộ lọc không phân biệt hoa thường và khớp chuỗi con.
