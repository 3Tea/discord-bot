---
title: Quản lý XP
command: xp
category: xp
description: Các lệnh quản trị viên để quản lý XP của người dùng và định cấu hình danh sách đen kênh.
permissions: ["Manage Guild"]
---

## Lệnh con

| Lệnh con | Mô tả | Ví dụ |
|----------|-------|--------|
| `/xp set <user> <amount>` | Đặt XP của người dùng thành một số tiền cụ thể | `/xp set @user 5000` |
| `/xp add <user> <amount>` | Thêm XP cho người dùng | `/xp add @user 500` |
| `/xp remove <user> <amount>` | Loại bỏ XP từ người dùng | `/xp remove @user 200` |
| `/xp channel-blacklist add <channel>` | Thêm kênh vào danh sách đen XP | `/xp channel-blacklist add #spam` |
| `/xp channel-blacklist remove <channel>` | Loại bỏ kênh khỏi danh sách đen | `/xp channel-blacklist remove #spam` |

## Cách sử dụng

### Quản lý XP Người dùng

Sử dụng `set` để ghi đè, `add` để thưởng, hoặc `remove` để phạt. Những thay đổi được phản ánh ngay lập tức trong thẻ xếp hạng của người dùng và vị trí bảng xếp hạng.

### Danh sách đen Kênh

Tin nhắn được gửi trong các kênh được liệt kê đen không kiếm được XP. Điều này hữu ích cho các kênh spam, kênh lệnh bot, hoặc các khu vực không liên quan.

> **Lưu ý:** Chỉ những thành viên có quyền **Quản lý Guild** mới có thể sử dụng các lệnh này.
