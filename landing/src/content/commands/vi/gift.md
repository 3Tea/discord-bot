---
title: Quà tặng
command: gift
category: economy
description: Tặng coin cho người dùng khác — chuyển trực tiếp với giới hạn tùy chỉnh.
---

## Cách dùng

```
/gift user:@username amount:100
```

## Tùy chọn

| Tùy chọn | Loại | Bắt buộc | Mô tả |
|----------|------|----------|-------|
| `user` | User | Có | Người nhận coin |
| `amount` | Integer | Có | Số coin muốn tặng |

## Cách hoạt động

Gửi coin trực tiếp cho người dùng khác. Chuyển khoản ngay lập tức và hiển thị số dư trước/sau của cả hai.

- Không thể tặng cho bot hoặc chính mình
- Giới hạn tối đa **1.000 coin** mỗi lần (admin có thể tùy chỉnh)
- Không có thời gian chờ — tặng bao nhiêu lần cũng được

> **Lưu ý:** Giới hạn tặng để chống lạm dụng. Admin có thể điều chỉnh qua `/economy social-config-*`.
