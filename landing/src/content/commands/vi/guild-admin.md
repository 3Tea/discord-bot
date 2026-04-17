---
title: Quản lý Hội
command: guild-admin
category: rpg
description: Quản lý cài đặt chi hội cho server — thiết lập, cấu hình và giải tán.
permissions: ["Administrator"]
---

## Tổng quan

Lệnh `/guild-admin` cho phép quản trị viên server tạo và quản lý chi hội cho server Discord. Chi hội mở ra nhiệm vụ hợp tác hàng tuần và sự kiện thi đấu hàng tháng cho thành viên server.

## Lệnh con

| Lệnh con | Mô tả | Quyền |
|-----------|-------|-------|
| `/guild-admin setup` | Thiết lập chi hội cho server | Administrator |
| `/guild-admin config` | Cấu hình cài đặt chi hội | Administrator |
| `/guild-admin disband` | Giải tán chi hội của server | Administrator |

## Thiết Lập

Dùng `/guild-admin setup` để tạo chi hội cho server. Bạn có thể tùy chọn đặt tên riêng.

```
/guild-admin setup
/guild-admin setup name:Dragon Slayers
```

Sau khi thiết lập, tất cả thành viên server đã gia nhập Hội Phiêu Lưu (qua `/guild register`) có thể tham gia hoạt động chi hội.

## Cấu Hình

Dùng `/guild-admin config` để điều chỉnh cài đặt chi hội. Các tùy chọn có sẵn phụ thuộc vào trạng thái và tính năng hiện tại của chi hội.

## Giải Tán

Dùng `/guild-admin disband` để xóa vĩnh viễn chi hội khỏi server. Hành động này yêu cầu xác nhận và không thể hoàn tác.

> **Cảnh báo:** Giải tán sẽ xóa toàn bộ dữ liệu chi hội bao gồm tiến trình nhiệm vụ và lịch sử sự kiện của server.

## Chi Hội Mang Lại Gì

- **Nhiệm vụ hợp tác hàng tuần** — mục tiêu chung mà tất cả thành viên chi hội cùng hướng tới
- **Sự kiện thi đấu hàng tháng** — server của bạn cạnh tranh với các server khác để giành xếp hạng và phần thưởng
- Thành viên xem thông tin chi hội qua `/guild branch` và sự kiện qua `/guild event`

> **Mẹo:** Hãy thiết lập chi hội sớm để thành viên tham gia nhiệm vụ tuần và sự kiện tháng. Sự kiện thi đấu là cách tuyệt vời để xây dựng cộng đồng server.
