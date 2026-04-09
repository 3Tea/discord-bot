---
title: Cướp
command: rob
category: economy
description: Cố cướp coin từ người dùng khác — PvP mạo hiểm với bảo vệ.
cooldown: "6h (tùy chỉnh)"
---

## Cách dùng

```
/rob user:@username
```

## Tùy chọn

| Tùy chọn | Loại | Bắt buộc | Mô tả |
|----------|------|----------|-------|
| `user` | User | Có | Người dùng muốn cướp |

## Cách hoạt động

Cố gắng cướp coin từ người dùng khác. Rủi ro cao — bạn có thể bị bắt!

### Thành công (40% cơ hội)
Cướp **10–30%** số dư coin của mục tiêu. Coin bị cướp được chuyển cho bạn.

### Thất bại (60% cơ hội)
Bạn bị bắt và bị phạt **10–20%** số dư của chính mình. Tiền phạt bị hủy (không cho ai).

### Bảo vệ
- **Số dư tối thiểu:** Không thể cướp người có ít hơn 100 coin
- **Miễn nhiễm:** Người vừa bị cướp được miễn nhiễm 2 giờ
- **Thời gian chờ:** 6 giờ giữa các lần cướp

> **Cảnh báo:** Trung bình, cướp sẽ khiến bạn mất coin (đây là nơi tiêu coin). Dùng cho cảm giác mạnh, không phải chiến lược kiếm tiền!

### Cấu hình Server
Admin có thể cấu hình thời gian chờ, số dư tối thiểu, thời gian miễn nhiễm qua lệnh `/economy social-config-*`.
