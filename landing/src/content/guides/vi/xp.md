---
title: XP & Cấp Độ
slug: xp
description: Tìm hiểu cách hoạt động của XP, lên cấp và cạnh tranh trên bảng xếp hạng.
icon: "📊"
order: 2
relatedCommands: ["rank", "leaderboard", "server-rank", "xp"]
---

## Tổng Quan

Mỗi tin nhắn bạn gửi, mỗi phút trong voice chat, và mỗi reaction bạn thêm đều kiếm được **XP**. Khi XP tăng, bạn sẽ **lên cấp** — và tiến trình được theo dõi trên cả bảng xếp hạng server và toàn cầu.

## Cách Kiếm XP

| Nguồn | XP Kiếm Được | Cooldown | Điều Kiện |
|-------|-------------|----------|-----------|
| Tin nhắn | 15–25 XP | 60 giây | Tối thiểu 3 ký tự, không trùng lặp |
| Voice chat | 5 XP mỗi phút | Liên tục | Cần 2+ thành viên (không tính bot), không bị server deaf |
| Reaction | 3 XP | 30 giây | Không kiếm từ reaction tin nhắn của chính mình |

> **Mẹo:** XP voice tích lũy nhanh — 1 giờ gọi thoại cùng bạn bè kiếm được 300 XP!

### Chống Spam

Bot có hệ thống bảo vệ để đảm bảo kiếm XP công bằng:
- **Cooldown:** Chỉ kiếm XP tin nhắn mỗi 60 giây một lần
- **Phát hiện trùng lặp:** Gửi cùng một tin nhắn liên tục sẽ không kiếm XP
- **Độ dài tối thiểu:** Tin nhắn phải có ít nhất 3 ký tự

## Cách Hoạt Động Của Cấp Độ

XP cần để đạt mỗi cấp theo công thức: **Cấp² × 50**.

| Cấp Độ | Tổng XP Cần |
|---------|-------------|
| 1 | 50 |
| 5 | 1.250 |
| 10 | 5.000 |
| 20 | 20.000 |
| 30 | 45.000 |
| 50 | 125.000 |

Khi bạn lên cấp, bot sẽ gửi thông báo trong kênh bạn đang hoạt động.

## Thẻ Xếp Hạng

Dùng `/rank` để xem thẻ xếp hạng cá nhân — hình ảnh hiển thị:
- **Cấp độ** hiện tại và thanh **tiến trình XP**
- **Xếp hạng server** (trong tất cả thành viên server)
- **Xếp hạng toàn cầu** (trong tất cả người dùng 3AT)
- Phân tích hoạt động (tin nhắn, phút voice, reaction)

Xem thẻ của người khác với `/rank user:@ai_do`.

## Bảng Xếp Hạng

Dùng `/leaderboard` để xem ai đứng đầu. Ba chế độ:

| Chế Độ | Hiển Thị |
|--------|----------|
| Server | Top thành viên trong server này |
| Global | Top người dùng trên tất cả server |
| Servers | Top server xếp theo tổng XP |

### Bộ Lọc Thời Gian

Chuyển đổi khoảng thời gian bằng các nút bên dưới bảng xếp hạng:

| Khoảng Thời Gian | Hiển Thị XP Kiếm Được |
|-------------------|----------------------|
| All Time | Tổng XP tích lũy |
| Daily | Hôm nay (UTC) |
| Weekly | Tuần ISO này |
| Monthly | Tháng này |
| Yearly | Năm nay |

Bảng xếp hạng phân trang (10 mỗi trang) và tự tắt sau 60 giây không hoạt động.

## Xếp Hạng Server

Dùng `/server-rank` để xem server này đứng ở vị trí nào — tổng XP, số thành viên, phân tích hoạt động, và xếp hạng giữa tất cả server sử dụng 3AT.

## Bảng Lệnh

| Lệnh | Mô Tả | Ví Dụ |
|-------|--------|--------|
| `/rank` | Xem thẻ xếp hạng | `/rank` |
| `/rank user:@ai_do` | Xem thẻ xếp hạng người khác | `/rank user:@friend` |
| `/leaderboard` | Mở bảng xếp hạng | `/leaderboard` |
| `/server-rank` | Xem xếp hạng toàn cầu của server | `/server-rank` |

## Dành Cho Admin

> Phần này dành cho quản trị viên server.

### Quản Lý XP

| Lệnh Con | Mô Tả | Ví Dụ |
|----------|--------|--------|
| `/xp set` | Đặt XP chính xác | `/xp set user:@user amount:5000` |
| `/xp add` | Thêm XP cho người dùng | `/xp add user:@user amount:500` |
| `/xp remove` | Trừ XP của người dùng | `/xp remove user:@user amount:200` |

### Danh Sách Kênh Đen

Ngăn kiếm XP trong các kênh cụ thể (ví dụ: kênh bot-spam):

| Lệnh Con | Mô Tả |
|----------|--------|
| `/xp channel-blacklist add` | Tắt kiếm XP trong kênh |
| `/xp channel-blacklist remove` | Bật lại kiếm XP trong kênh |

### Cấu Hình XP

Cài đặt XP có thể tùy chỉnh theo server. Giá trị mặc định:

| Cài Đặt | Mặc Định |
|---------|----------|
| XP mỗi tin nhắn | 20 |
| XP mỗi phút voice | 5 |
| XP mỗi reaction | 3 |
| Cooldown tin nhắn | 60 giây |
| Độ dài tin nhắn tối thiểu | 3 ký tự |
| Hệ thống XP bật | Có |
