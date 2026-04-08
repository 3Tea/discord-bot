---
title: Quản Lý Server
description: Timeout, ban, kick và unban thành viên với kiểm tra quyền hạn đầy đủ.
icon: "🛡️"
order: 5
relatedCommands: ["moderation"]
---

## Tổng Quan

3AT cung cấp các lệnh quản lý để giúp giữ server an toàn. Tất cả lệnh tuân thủ **thứ bậc role** — bạn chỉ có thể quản lý thành viên có role cao nhất thấp hơn role của bạn.

## Các Lệnh

| Lệnh Con | Mô Tả | Quyền Cần |
|----------|--------|-----------|
| `/moderation timeout` | Tắt tiếng thành viên trong text và voice | Moderate Members |
| `/moderation untimeout` | Gỡ timeout | Moderate Members |
| `/moderation ban` | Cấm thành viên khỏi server | Ban Members |
| `/moderation kick` | Đuổi thành viên khỏi server | Kick Members |
| `/moderation unban` | Gỡ cấm bằng ID người dùng | Ban Members |

## Timeout

Tạm thời tắt tiếng thành viên trong cả kênh text và voice.

```
/moderation timeout user:@member duration:1h reason:Spam
```

| Tùy Chọn Thời Gian |
|-------------------|
| 1 phút đến 28 ngày |

Thành viên tự động được gỡ timeout khi hết hạn. Dùng `/moderation untimeout` để gỡ sớm.

## Ban

Xóa vĩnh viễn thành viên khỏi server. Tùy chọn xóa tin nhắn gần đây.

```
/moderation ban user:@member reason:Vi phạm nhiều lần
```

> **Mẹo:** Discord cho phép xóa tối đa 7 ngày tin nhắn của người bị ban.

## Kick

Đuổi thành viên khỏi server — họ có thể quay lại với lời mời mới.

```
/moderation kick user:@member reason:Cảnh cáo
```

## Unban

Gỡ lệnh ban bằng ID người dùng (snowflake). Bạn cần ID số vì người bị ban không còn trong server.

```
/moderation unban user_id:123456789012345678 reason:Chấp nhận kháng cáo
```

> **Mẹo:** Tìm ID người dùng bằng cách bật Developer Mode trong cài đặt Discord, rồi nhấp chuột phải vào người dùng → Copy User ID.

## Kiểm Tra An Toàn

Mỗi hành động quản lý đều qua các kiểm tra:

| Kiểm Tra | Quy Tắc |
|----------|---------|
| Tự nhắm | Bạn không thể tự quản lý chính mình |
| Nhắm bot | Bạn không thể quản lý bot |
| Bảo vệ chủ server | Chủ server không thể bị quản lý |
| Thứ bậc role | Role cao nhất của bạn phải cao hơn role của mục tiêu |
| Thứ bậc bot | Role của bot phải cao hơn role của mục tiêu |
| Độ dài lý do | Cắt ngắn còn 512 ký tự (giới hạn Discord API) |

Tất cả hành động được ghi trong **audit log** của Discord với lý do bạn cung cấp.

## Thực Hành Tốt

- **Luôn cung cấp lý do** — hiển thị trong audit log và giúp đội mod hiểu quyết định
- **Leo thang dần dần:** timeout → kick → ban. Cho thành viên cơ hội sửa đổi hành vi
- **Dùng timeout trước** cho vi phạm nhỏ — tạm thời và ít gây gián đoạn hơn kick hoặc ban
- **Viết quy tắc rõ ràng** trong kênh rules để thành viên biết trước
