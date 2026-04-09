---
title: Thông Tin & Trợ Giúp
description: Xem trợ giúp lệnh, thống kê bot và server, lấy ảnh đại diện.
icon: "ℹ️"
order: 8
relatedCommands: ["help", "info", "avatar"]
---

## Tổng Quan

Cần tìm lệnh? Muốn xem thống kê bot hoặc lấy ảnh đại diện? Các lệnh thông tin sẽ giúp bạn.

## Trợ Giúp

Dùng `/help` để duyệt tất cả lệnh có sẵn. Phản hồi hiển thị danh sách phân loại của mọi lệnh với mô tả ngắn.

> **Mẹo:** Nhấp vào tên lệnh trong danh sách help để tìm hiểu thêm!

## Thông Tin

Dùng `/info bot` để xem thống kê bot:

| Thống Kê | Mô Tả |
|----------|--------|
| Version | Phiên bản bot hiện tại |
| Uptime | Bot đã chạy bao lâu |
| Servers | Tổng số server bot đang trong |
| Members | Tổng số thành viên trên tất cả server |
| Tech Stack | Node.js, Discord.js, Mongoose, ioredis |

## Ảnh Đại Diện

Dùng `/avatar` để lấy ảnh đại diện người dùng ở độ phân giải đầy đủ.

```
/avatar
/avatar target:@ai_do
```

Phản hồi hiển thị ảnh đại diện với link tải trực tiếp. Nếu không chỉ định người dùng, hiển thị ảnh đại diện của bạn.

## Bảng Lệnh

| Lệnh | Mô Tả | Ví Dụ |
|-------|--------|--------|
| `/help` | Duyệt tất cả lệnh | `/help` |
| `/info bot` | Xem thống kê bot | `/info bot` |
| `/avatar` | Lấy ảnh đại diện của bạn | `/avatar` |
| `/avatar target:@user` | Lấy ảnh đại diện người khác | `/avatar target:@friend` |
