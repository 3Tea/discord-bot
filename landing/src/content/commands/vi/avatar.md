---
title: Avatar
command: avatar
category: info
description: Lấy URL avatar của bất kỳ người dùng nào, hoặc avatar của chính bạn.
---

## Cách dùng

```
/avatar
/avatar target:@username
```

## Tùy chọn

| Tùy chọn | Loại | Bắt buộc | Mô tả |
|----------|------|----------|-------|
| `target` | User | Không | Người dùng có avatar cần hiển thị. Mặc định là bạn. |

Trả lại avatar của người dùng được chọn dưới dạng hình ảnh PNG độ phân giải cao (2048px). Nếu không chỉ định người dùng, sẽ hiển thị avatar của bạn.
