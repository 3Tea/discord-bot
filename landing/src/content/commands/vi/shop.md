---
title: Cửa hàng
command: shop
category: economy
description: Duyệt và mua các mục cửa hàng máy chủ, hoặc quản lý cửa hàng như quản trị viên.
---

## Lệnh con

| Lệnh con | Mô tả | Quyền hạn |
|----------|-------|-----------|
| `/shop view` | Duyệt các mục có sẵn (phân trang) | Mọi người |
| `/shop buy <item_id>` | Mua một mục theo ID | Mọi người |
| `/shop add` | Thêm mục mới vào cửa hàng | Quản trị viên |
| `/shop remove <item_id>` | Loại bỏ mục khỏi cửa hàng | Quản trị viên |

## Cách sử dụng

### Duyệt Cửa hàng

Sử dụng `/shop view` để xem các mục có sẵn. Các mục được hiển thị 5 mục trên một trang với các nút phân trang. Mỗi mục hiển thị tên, mô tả, giá, loại tiền tệ và hàng tồn kho còn lại.

### Mua Mục

Sử dụng `/shop buy` với ID của mục (được hiển thị trong danh sách cửa hàng). Chi phí của mục được trừ khỏi số dư coin hoặc gem của bạn.

### Quản lý Cửa hàng (Quản trị viên)

#### Thêm Mục

`/shop add` nhắc bạn nhập:
- **Tên** và **mô tả**
- **Loại:** `role` (gán vai trò Discord), `cosmetic`, hoặc `currency_exchange`
- **Giá** và **tiền tệ** (coin hoặc gem)
- **Vai trò** (bắt buộc nếu loại là `role`)
- **Hàng tồn kho** (tùy chọn — không giới hạn nếu không được đặt)

#### Loại bỏ Mục

`/shop remove` xóa một mục theo ID của nó. Các lần mua hiện có không bị ảnh hưởng.

> **Lưu ý:** Chỉ những thành viên có quyền **Quản trị viên** mới có thể thêm hoặc loại bỏ các mục cửa hàng.
