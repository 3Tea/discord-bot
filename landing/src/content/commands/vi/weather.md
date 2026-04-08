---
title: Thời tiết
command: weather
category: utility
description: Lấy thời tiết hiện tại và dự báo 3 ngày cho bất kỳ địa điểm nào.
---

## Cách dùng

```
/weather location:Tokyo
/weather location:Ho Chi Minh City
```

## Tùy chọn

| Tùy chọn | Loại | Bắt buộc | Mô tả |
|----------|------|----------|-------|
| `location` | String | Có | Tên thành phố hoặc địa điểm cần tra cứu |

Trả lại một embed với nhiệt độ hiện tại, độ ẩm, tốc độ gió và hướng gió, cộng với dự báo 3 ngày với nhiệt độ cao và thấp hàng ngày. Được cung cấp bởi Open-Meteo API.
