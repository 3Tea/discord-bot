---
title: Tự thú
command: confession
category: confession
description: Hệ thống tự thú ẩn danh với quy trình xem xét điều độ tùy chọn.
---

## Lệnh con

| Lệnh con | Mô tả | Quyền hạn |
|----------|-------|-----------|
| `/confession setup` | Định cấu hình hệ thống tự thú | Manage Guild |
| `/confession submit` | Gửi một lời tự thú ẩn danh | Mọi người |

## Cách sử dụng

### Thiết lập (Quản trị viên)

Sử dụng `/confession setup` để định cấu hình:
- **Enabled:** Bật/tắt hệ thống tự thú
- **Mode:** `instant` (đăng ngay lập tức) hoặc `review` (yêu cầu sự phê duyệt của điều độ)
- **Public channel:** Nơi tự thú được phê duyệt xuất hiện
- **Review channel:** Nơi các lời tự thú đang chờ xử lý được xem xét (bắt buộc ở chế độ xem xét)
- **Cooldown:** 1–120 phút giữa các lần gửi trên mỗi người dùng

### Gửi một Lời tự thú

```
/confession submit text:Your confession here image:(optional attachment)
```

- Văn bản có thể lên đến **3,500 ký tự**
- Tùy chọn đính kèm một hình ảnh
- Danh tính của bạn **hoàn toàn ẩn** khỏi các thành viên khác
- Mỗi lời tự thú nhận được một số duy nhất (ví dụ: Confession #42)

### Chế độ Xem xét

Ở chế độ xem xét, các lời tự thú được gửi đến kênh xem xét nơi các điều độ thấy văn bản tự thú với các nút **Phê duyệt** và **Từ chối**. Các lời tự thú được phê duyệt được đăng lên kênh công khai. Ở chế độ xem xét, các điều độ có thể thấy danh tính của tác giả.

> **Lưu ý:** Hệ thống tự thú phải được thiết lập bởi quản trị viên trước khi thành viên có thể gửi lời tự thú.
