---
title: Kiểm duyệt
command: moderation
category: moderation
description: Bộ công cụ kiểm duyệt nhân viên — timeout, ban, kick, và unban với thực thi phân cấp quyền hạn.
permissions: ["Moderate Members", "Ban Members", "Kick Members"]
---

## Lệnh con

| Lệnh con | Mô tả | Quyền hạn Bắt buộc |
|----------|-------|------|
| `/moderation timeout <user> <duration> <unit>` | Tắt tiếng thành viên (văn bản + thoại) | Moderate Members |
| `/moderation untimeout <user>` | Loại bỏ timeout hoạt động | Moderate Members |
| `/moderation ban <user> [reason] [delete_messages]` | Ban thành viên khỏi máy chủ | Ban Members |
| `/moderation kick <user> [reason]` | Đuổi thành viên khỏi máy chủ | Kick Members |
| `/moderation unban <user_id>` | Bỏ ban theo ID người dùng | Ban Members |

## Cách sử dụng

### Timeout

```
/moderation timeout user:@troll duration:30 unit:minutes reason:Spamming
```

Tắt tiếng người dùng trong cả văn bản và thoại trong thời gian được chỉ định. Thời gian tối đa là **28 ngày**. Tùy chọn `unit` chấp nhận: `minutes`, `hours`, hoặc `days`.

### Ban

```
/moderation ban user:@user reason:Rule violation delete_messages:86400
```

Tùy chọn `delete_messages` loại bỏ tin nhắn của người dùng từ N giây trước (tối đa 604800 = 7 ngày). Đặt thành `0` để giữ tin nhắn.

### Unban

```
/moderation unban user_id:123456789012345678
```

Yêu cầu **ID số** của người dùng (snowflake), không phải một đề cập.

> **Lưu ý:** Bot thực thi **phân cấp vai trò** — bạn không thể kiểm duyệt các thành viên có vai trò bằng hoặc cao hơn của bạn. Chủ sở hữu guild bỏ qua tất cả các kiểm tra phân cấp.
