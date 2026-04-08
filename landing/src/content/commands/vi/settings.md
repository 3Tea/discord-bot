---
title: Cài đặt
command: settings
category: settings
description: Định cấu hình ngôn ngữ cá nhân của bạn hoặc đặt ngôn ngữ mặc định cho toàn bộ máy chủ.
---

## Lệnh con

| Lệnh con | Mô tả | Quyền hạn |
|----------|-------|-----------|
| `/settings language <lang>` | Đặt sở thích ngôn ngữ cá nhân của bạn | Mọi người |
| `/settings server-language <lang>` | Đặt ngôn ngữ mặc định của máy chủ | Manage Guild |

## Ngôn ngữ Hỗ trợ

Tiếng Anh, Tiếng Việt, Tiếng Indonesia, Tiếng Tây Ban Nha, Tiếng Nhật, Tiếng Trung, Tiếng Hàn, Tiếng Bồ Đào Nha (Brazil), Tiếng Pháp, Tiếng Đức, Tiếng Nga, Tiếng Thổ Nhĩ Kỳ, Tiếng Ý, Tiếng Ba Lan, Tiếng Hà Lan — 15 ngôn ngữ tổng cộng.

## Cách hoạt động

### Ngôn ngữ Cá nhân

Sở thích cá nhân của bạn ghi đè mọi thứ khác. Bot sẽ luôn trả lời bạn bằng ngôn ngữ được chọn của bạn, bất kể cài đặt máy chủ.

Sử dụng `/settings language reset:true` để xóa sở thích của bạn và quay lại ngôn ngữ máy chủ hoặc Discord client.

### Ngôn ngữ Máy chủ

Giá trị mặc định máy chủ áp dụng cho tất cả các thành viên chưa đặt sở thích cá nhân.

Sử dụng `/settings server-language reset:true` để xóa và quay lại ngôn ngữ Discord client của từng thành viên.

> **Mẹo:** Sở thích ngôn ngữ được lưu vào bộ nhớ cache trong 30 ngày để có phản hồi nhanh.
