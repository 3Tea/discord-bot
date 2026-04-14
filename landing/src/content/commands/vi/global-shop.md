---
title: Shop Toàn Cầu
command: global-shop
category: economy
description: Duyệt và mua vật phẩm độc quyền bằng star — tiền tệ xuyên server.
---

## Lệnh con

| Lệnh con | Mô tả | Ví dụ |
|----------|-------|--------|
| `/global-shop view` | Duyệt danh mục vật phẩm | `/global-shop view` |
| `/global-shop buy <item-id>` | Mua vật phẩm | `/global-shop buy item-id:badge_gold quantity:1` |

## Cách sử dụng

### Bước 1: Duyệt danh mục

Dùng `/global-shop view` để xem các vật phẩm có sẵn. Mỗi vật phẩm hiển thị tên, ID, giá star, và tình trạng tồn kho. Bạn có thể lọc theo loại:

- `cosmetic_identity` — Vật phẩm trang trí và tùy chỉnh danh tính
- `utility_token` — Token tiện ích chức năng

Dùng tùy chọn `page` để xem các trang (8 vật phẩm mỗi trang).

### Bước 2: Mua vật phẩm

Dùng `/global-shop buy item-id:<id>` để mua. Bạn có thể mua tối đa 10 cái cùng lúc với tùy chọn `quantity`.

Việc mua sẽ trừ star từ ví toàn cầu. Nếu vật phẩm có số lượng giới hạn, ai nhanh người đó được.

### Bảo vệ

- **Thời gian chờ 3 giây** giữa các lần mua để tránh mua nhầm
- **Phát hiện trùng lặp** — cùng một yêu cầu mua không thể xử lý hai lần
- **Hoàn tiền tự động** — nếu có lỗi xảy ra trong quá trình mua, star được trả lại

> **Mẹo:** Kiểm tra số dư star với `/wallet view` trước khi mua sắm. Kiếm star qua `/wallet daily`, rơi ngẫu nhiên, và mốc thành tích — xem [Hướng dẫn Star](/vi/guide/star) để biết chi tiết.
