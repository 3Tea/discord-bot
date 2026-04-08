---
title: Quản lý Kênh Thoại
command: voice
category: voice
description: Tạo và quản lý các kênh thoại tạm thời với quyền kiểm soát hoàn toàn về quyền hạn, đặt tên và truy cập người dùng.
cooldown: "5s–120s"
---

## Lệnh con

| Lệnh con | Mô tả | Ví dụ |
|----------|-------|--------|
| `/voice limit <number>` | Đặt giới hạn người dùng (0–99, 0 = không giới hạn) | `/voice limit 5` |
| `/voice name <text>` | Đổi tên kênh của bạn (tối đa 50 ký tự) | `/voice name Gaming Room` |
| `/voice lock` | Khóa kênh — từ chối mọi người tham gia | `/voice lock` |
| `/voice unlock` | Mở khóa kênh — cho phép mọi người tham gia | `/voice unlock` |
| `/voice hide` | Ẩn kênh khỏi mọi người trên máy chủ | `/voice hide` |
| `/voice permit <user>` | Cho phép một người dùng cụ thể tham gia | `/voice permit @friend` |
| `/voice block <user>` | Chặn người dùng và ngắt kết nối họ | `/voice block @troll` |
| `/voice kick <user>` | Đuổi một người dùng với lời nhắc xác nhận | `/voice kick @user` |
| `/voice transfer <user>` | Chuyển quyền sở hữu phòng cho người dùng khác | `/voice transfer @friend` |

## Cách sử dụng

### Bước 1: Tham gia kênh kích hoạt

Tham gia kênh thoại được chỉ định trên bất kỳ máy chủ nào sử dụng 3AT. Một phòng thoại cá nhân được tự động tạo cho bạn — bạn là **chủ sở hữu**.

### Bước 2: Tùy chỉnh phòng của bạn

Sử dụng `/voice name` để đổi tên phòng của bạn và `/voice limit` để đặt số lượng người dùng tối đa.

> **Mẹo:** Đặt giới hạn thành `0` để loại bỏ giới hạn người dùng hoàn toàn.

### Bước 3: Kiểm soát truy cập

- `/voice lock` — Ngăn chặn mọi người tham gia.
- `/voice hide` — Làm cho kênh không nhìn thấy đối với những người không phải là thành viên.
- `/voice permit @user` — Cho phép danh sách một người dùng cụ thể (hoạt động ngay cả khi bị khóa/ẩn).
- `/voice block @user` — Cấm một người dùng khỏi phòng của bạn và ngắt kết nối họ ngay lập tức.

### Bước 4: Đuổi hoặc chuyển

- `/voice kick @user` — Hiển thị nút xác nhận. Bạn có thể chặn họ cùng lúc.
- `/voice transfer @user` — Trao quyền sở hữu cho người dùng khác. Danh sách cho phép và chặn của bạn sẽ bị xóa.

### Bước 5: Rời đi

Khi mọi người rời khỏi phòng, nó sẽ tự động bị xóa. Dữ liệu sở hữu của bạn hết hạn sau 12 giờ không hoạt động.

> **Lưu ý:** Thay đổi tên và giới hạn có **cooldown 120 giây**. Tất cả các lệnh khác có **cooldown 5 giây**. Bạn phải là chủ sở hữu phòng để sử dụng các lệnh này.
