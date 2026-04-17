---
title: Phiêu lưu
command: adventure
category: rpg
description: Phiêu lưu RPG — quản lý nhân vật, trang bị, chỉ số, chế tạo và rương.
---

## Tổng quan

Lệnh `/adventure` là cổng vào hệ thống RPG. Tạo nhân vật, chọn nghề, quản lý trang bị, chế tạo đồ và mở rương.

## Lệnh con

| Lệnh con | Mô tả | Ví dụ |
|-----------|-------|-------|
| `create` | Chọn nghề và tạo nhân vật | `/adventure create` |
| `profile` | Xem chỉ số, cấp, Gold, trang bị | `/adventure profile` |
| `equip <item>` | Trang bị vật phẩm theo tên | `/adventure equip Iron Sword` |
| `unequip <slot>` | Tháo trang bị khỏi ô | `/adventure unequip weapon` |
| `inventory` | Xem kho trang bị và nguyên liệu | `/adventure inventory` |
| `craft` | Chế tạo trang bị từ nguyên liệu + Gold | `/adventure craft` |
| `crate` | Mở rương nhận từ hầm ngục | `/adventure crate` |
| `shop` | Mua rương bằng Gold | `/adventure shop` |
| `advance` | Tiến hóa nghề nâng cao (cấp 20+) | `/adventure advance` |

## Tạo Nhân Vật

Dùng `/adventure create` để bắt đầu. Chọn từ 6 nghề:

| Nghề | Vai trò | Chỉ số chính |
|------|---------|-------------|
| Kiếm sĩ | Cận chiến cân bằng | STR, DEF |
| Chiến binh | HP cao, phòng thủ | HP, DEF |
| Pháp sư | Sát thương phép mạnh | MAG, MAG_DEF |
| Cung thủ | Tầm xa, nhanh | STR, SPD |
| Sát thủ | Chí mạng và tốc độ | STR, SPD |
| Thầy thuốc | Hỗ trợ và hồi phục | MAG, HP |

> **Lựa chọn này là vĩnh viễn!** Hãy chọn cẩn thận theo phong cách chơi của bạn.

## Trang Bị

6 ô trang bị: Vũ khí, Khiên, Mũ, Giáp, Giày, Phụ kiện. 6 cấp độ hiếm từ Thường đến Thần thoại. Nhận trang bị từ hầm ngục, chế tạo hoặc mở rương.

| Độ hiếm | Màu |
|----------|-----|
| Thường | Trắng |
| Không thường | Xanh lá |
| Hiếm | Xanh dương |
| Sử thi | Tím |
| Huyền thoại | Cam |
| Thần thoại | Đỏ |

## Chế Tạo

`/adventure craft` cho phép bạn biến nguyên liệu + Gold thành trang bị với độ hiếm đảm bảo. Độ hiếm càng cao cần càng nhiều nguyên liệu và Gold. Nguyên liệu kiếm được từ hầm ngục.

## Rương

Ba cấp rương: Đồng, Bạc, Vàng. Kiếm từ hầm ngục hoặc mua tại `/adventure shop`. Mỗi rương chứa một trang bị ngẫu nhiên phù hợp với nghề của bạn.

## Tiến Hóa Nghề

Ở cấp 20, dùng `/adventure advance` để tiến hóa thành một trong hai nhánh nghề nâng cao. Nghề nâng cao nhận thêm chỉ số bonus và mở khóa tuyệt chiêu mạnh mẽ dùng trong hầm ngục và PvP.

> **Mẹo:** Tập trung lên cấp qua hầm ngục và trang bị đồ tốt nhất. Chế tạo là cách đáng tin cậy để nhắm mục tiêu độ hiếm cụ thể khi vận may không đứng về phía bạn.
