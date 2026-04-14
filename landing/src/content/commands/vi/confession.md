---
title: Confession
command: confession
category: confession
description: Hệ thống confession ẩn danh với embed VIP, voting, reply thread, keyword filter, ban, và category tags.
---

## Lệnh con

| Lệnh con | Mô tả | Quyền |
|-----------|-------|-------|
| `/confession setup` | Cấu hình kênh và chế độ confession | Manage Guild |
| `/confession submit` | Gửi confession ẩn danh | Tất cả |
| `/confession ban <user> [duration] [reason]` | Cấm người dùng gửi confession | Manage Guild / Manage Messages |
| `/confession unban <user>` | Gỡ lệnh cấm confession | Manage Guild / Manage Messages |
| `/confession filter-add <keyword>` | Thêm từ khóa vào danh sách chặn | Manage Guild |
| `/confession filter-remove <keyword>` | Xóa từ khóa khỏi danh sách chặn | Manage Guild |
| `/confession filter-list` | Xem tất cả từ khóa bị chặn | Manage Guild |

## Tùy chọn Submit

| Tùy chọn | Bắt buộc | Mô tả |
|-----------|----------|-------|
| `text` | Có | Nội dung confession (tối đa 3.500 ký tự) |
| `image` | Không | Ảnh đính kèm tùy chọn |
| `vip` | Không | Confession VIP với embed vàng — tốn **5 gem** |
| `skip_cooldown` | Không | Bỏ qua cooldown — tốn **50 coin** |
| `audio` | Không | Ghi âm tùy chọn (chỉ premium, MP3/OGG/WAV/M4A/WebM) |
| `tag` | Không | Danh mục: Tâm sự, Hài hước, Hỏi đáp, Chia sẻ, Khác |

## Cách sử dụng

### Thiết lập (Admin)

Dùng `/confession setup` để cấu hình:
- **Bật/tắt:** Bật hoặc tắt hệ thống confession
- **Chế độ:** `instant` (đăng ngay) hoặc `review` (cần duyệt)
- **Kênh công khai:** Nơi confession được đăng
- **Kênh duyệt:** Nơi confession chờ duyệt (bắt buộc ở chế độ review)
- **Thời gian chờ:** 1–120 phút giữa các lần gửi mỗi người

### Gửi Confession

```
/confession submit text:Nội dung confession
/confession submit text:Tâm sự bí mật vip:true tag:heartfelt
/confession submit text:Gửi nhanh skip_cooldown:true
```

- Tối đa **3.500 ký tự**, có thể đính kèm một ảnh
- Danh tính **hoàn toàn ẩn** với các thành viên khác
- Mỗi confession có số thứ tự riêng (VD: Confession #42)
- Tag hiển thị dạng badge trên embed: `[🏷️ Tâm sự]`

### Confession VIP

Trả **5 gem** để có embed vàng đặc biệt với title `✨ Confession (#N)` và footer "VIP Confession". Nổi bật trong channel.

### Bỏ qua Cooldown

Trả **50 coin** để bỏ qua cooldown đang hoạt động. Chỉ tốn coin khi thực sự đang trong cooldown — miễn phí nếu cooldown đã hết.

> **Mẹo:** Có thể kết hợp VIP và skip cooldown trong cùng một lần gửi.

### Tương tác cộng đồng

Mỗi confession đã đăng có nút tương tác:

```
[ 👍 0 ] [ 👎 0 ] [ 💬 Reply ]
```

- **Vote:** Click 👍 hoặc 👎 để upvote/downvote. Click lần nữa để hủy. Không thể vote confession của chính mình.
- **Reply:** Click 💬 để mở form reply. Reply ẩn danh được đăng trong thread Discord dưới confession.
  - Reply đầu tiên mỗi confession: **miễn phí**
  - Mỗi reply tiếp theo: **5 coin**

### Chế độ duyệt

Ở chế độ review, confession được gửi đến kênh duyệt. Moderator thấy nội dung kèm nút **Duyệt** và **Từ chối**. Confession được duyệt sẽ có nút voting + reply. Moderator có thể xem danh tính người gửi.

## Công cụ kiểm duyệt

### Cấm Confession

```
/confession ban user:@troll duration:7d reason:Spam
/confession ban user:@troll
/confession unban user:@troll
```

Cấm người dùng gửi confession. Thời hạn: `1h`, `6h`, `1d`, `7d`, `30d`, hoặc vĩnh viễn (không chọn thời hạn). Người bị cấm sẽ thấy lỗi khi thử gửi.

### Bộ lọc từ khóa

```
/confession filter-add keyword:tukhoaxau
/confession filter-remove keyword:tukhoaxau
/confession filter-list
```

Tự động từ chối confession chứa từ khóa bị chặn. Tối đa **50 từ khóa** mỗi server. So khớp không phân biệt hoa thường. Tin nhắn từ chối không tiết lộ từ khóa nào bị match.

> **Lưu ý:** Hệ thống confession phải được admin thiết lập trước khi thành viên có thể gửi.
