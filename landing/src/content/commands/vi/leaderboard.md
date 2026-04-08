---
title: Bảng Xếp hạng
command: leaderboard
category: xp
description: Bảng xếp hạng XP được phân trang với lọc theo khoảng thời gian và nhiều chế độ hiển thị.
---

## Cách dùng

```
/leaderboard
/leaderboard mode:global
/leaderboard mode:servers
```

## Tùy chọn

| Tùy chọn | Loại | Bắt buộc | Mô tả |
|----------|------|----------|-------|
| `mode` | Choice | Không | `server` (mặc định), `global`, hoặc `servers` |

## Chế độ

| Chế độ | Hiển thị |
|--------|----------|
| **Server** | Các thành viên hàng đầu trên máy chủ hiện tại theo XP |
| **Global** | Người dùng hàng đầu trên tất cả các máy chủ sử dụng 3AT |
| **Servers** | Các máy chủ hàng đầu được xếp hạng theo tổng XP |

## Cách sử dụng

### Bước 1: Chạy lệnh

Sử dụng `/leaderboard` cho bảng xếp hạng máy chủ mặc định, hoặc chọn một chế độ.

### Bước 2: Lọc theo khoảng thời gian

Sau khi bảng xếp hạng xuất hiện, sử dụng **các nút khoảng thời gian** để lọc:
- **Tất cả thời gian** — Tổng XP tích lũy
- **Hàng ngày** — XP kiếm được hôm nay
- **Hàng tuần** — XP kiếm được tuần này (tuần ISO)
- **Hàng tháng** — XP kiếm được tháng này
- **Hàng năm** — XP kiếm được năm này

### Bước 3: Điều hướng các trang

Sử dụng các nút **Trước** và **Tiếp theo** để duyệt. Mỗi trang hiển thị 10 mục, tối đa 100 mục.

> **Mẹo:** Các nút hết hạn sau **60 giây** không hoạt động. Chạy lệnh lại để có các nút mới.
