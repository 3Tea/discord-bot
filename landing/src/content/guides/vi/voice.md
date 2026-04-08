---
title: Kênh Thoại
description: Tạo kênh thoại tạm thời của riêng bạn và kiểm soát ai có thể tham gia, xem và sử dụng.
icon: "🎙️"
order: 3
relatedCommands: ["voice"]
---

## Tổng Quan

3AT cho phép bạn tạo **kênh thoại tạm thời** mà bạn hoàn toàn sở hữu và kiểm soát. Tham gia kênh kích hoạt, nhận phòng riêng và quản lý quyền truy cập bằng nút hoặc lệnh slash.

## Bắt Đầu

### Bước 1: Tham gia kênh kích hoạt

Tìm kênh thoại có tên bắt đầu bằng **"3AT "** (ví dụ: "3AT Tham Gia Để Tạo"). Khi bạn vào, bot sẽ tạo ngay một kênh thoại cá nhân cho bạn.

### Bước 2: Bạn là chủ sở hữu

Kênh mới xuất hiện với tiền tố **"* "** (ví dụ: "* Phòng Chơi Game"). Bạn cũng sẽ thấy **bảng điều khiển** với các nút quản lý phòng.

### Bước 3: Tùy chỉnh và sử dụng

Đổi tên phòng, đặt giới hạn người dùng, khóa phòng hoặc mời bạn bè. Khi mọi người rời đi, kênh sẽ tự động bị xóa.

## Bảng Điều Khiển

Khi kênh được tạo, bảng điều khiển với các nút sẽ xuất hiện:

| Nút | Hành Động | Cooldown |
|-----|-----------|----------|
| 🔒 Khóa | Ngăn mọi người tham gia | 5 giây |
| 🔓 Mở Khóa | Cho phép mọi người tham gia lại | 5 giây |
| 👁️ Ẩn | Ẩn kênh khỏi người khác | 5 giây |
| 👤 Cho Phép | Cho phép một người cụ thể tham gia (kể cả khi khóa/ẩn) | 5 giây |
| 🚫 Chặn | Chặn người dùng và ngắt kết nối | 5 giây |
| 👢 Đuổi | Đuổi người dùng với tùy chọn chặn luôn | 5 giây |
| 🔄 Chuyển | Chuyển quyền sở hữu cho người khác | 5 giây |
| ✏️ Đổi Tên | Đổi tên kênh (tối đa 50 ký tự) | 120 giây |
| 🔢 Giới Hạn | Đặt số người tối đa (0–99, 0 = không giới hạn) | 120 giây |

> **Mẹo:** Cho Phép vượt qua cả Khóa và Ẩn — người được cho phép luôn có thể tham gia và nhìn thấy kênh.

## Lệnh Slash

Bạn cũng có thể dùng các lệnh con `/voice` thay vì nút trên bảng:

| Lệnh Con | Mô Tả | Ví Dụ |
|----------|--------|--------|
| `/voice lock` | Khóa kênh | `/voice lock` |
| `/voice unlock` | Mở khóa kênh | `/voice unlock` |
| `/voice hide` | Ẩn kênh | `/voice hide` |
| `/voice permit` | Cho phép người dùng | `/voice permit user:@friend` |
| `/voice block` | Chặn người dùng | `/voice block user:@troll` |
| `/voice kick` | Đuổi người dùng | `/voice kick user:@someone` |
| `/voice transfer` | Chuyển quyền sở hữu | `/voice transfer user:@friend` |
| `/voice name` | Đổi tên kênh | `/voice name text:Phòng Game` |
| `/voice limit` | Đặt giới hạn người dùng | `/voice limit number:5` |

## Lưu Ý

- **Quyền sở hữu hết hạn** sau 12 giờ không hoạt động
- **Kênh tự xóa** khi trống (hoặc chỉ còn bot)
- Bạn **không thể** tự permit, block, kick hoặc transfer cho chính mình
- **Kick** hiện xác nhận — bạn có thể chọn "Chỉ đuổi" hoặc "Đuổi và Chặn"
- **Transfer** xóa danh sách permit và block — chủ mới bắt đầu từ đầu
- Chat thoại trong kênh kiếm **Voice XP** (5 XP/phút khi có 2+ người)

## Dành Cho Admin

> Phần này dành cho quản trị viên server.

### Thiết Lập Kênh Kích Hoạt

Để bật kênh thoại tạm thời trong server:

1. Tạo kênh thoại với tên bắt đầu bằng **"3AT "** (ví dụ: "3AT Tham Gia Để Tạo")
2. Vậy là xong — khi bất kỳ thành viên nào vào kênh này, bot sẽ tạo phòng tạm cho họ

Bạn có thể tạo nhiều kênh kích hoạt (ví dụ: mỗi danh mục một cái) nếu muốn.

> **Mẹo:** Đặt kênh kích hoạt ở đầu danh mục voice để thành viên dễ tìm.
