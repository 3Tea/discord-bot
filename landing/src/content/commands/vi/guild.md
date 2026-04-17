---
title: Hội phiêu lưu
command: guild
category: rpg
description: Hội Phiêu Lưu — tham gia, hoàn thành nhiệm vụ, kiếm GP và leo hạng.
---

## Tổng quan

Lệnh `/guild` cho phép bạn gia nhập Hội Phiêu Lưu, nhận nhiệm vụ hàng ngày, kiếm Điểm Hội (GP) và thăng hạng qua 10 cấp bậc. Cạnh tranh với các phiêu lưu gia khác trên bảng xếp hạng và tham gia hoạt động chi hội.

## Lệnh con

| Lệnh con | Mô tả | Ví dụ |
|-----------|-------|-------|
| `register` | Gia nhập Hội Phiêu Lưu | `/guild register` |
| `profile` | Xem hạng, GP và thống kê nhiệm vụ | `/guild profile` |
| `board` | Xem bảng nhiệm vụ hàng ngày | `/guild board` |
| `quests` | Xem và quản lý nhiệm vụ đang làm | `/guild quests` |
| `ranking` | Xem bảng xếp hạng hội | `/guild ranking` |
| `branch` | Xem thông tin chi hội và nhiệm vụ tuần | `/guild branch` |
| `event` | Xem sự kiện thi đấu hàng tháng | `/guild event` |

## Bắt đầu

Dùng `/guild register` để gia nhập Hội Phiêu Lưu. Bạn bắt đầu ở hạng F với 0 GP. Hoàn thành nhiệm vụ để kiếm GP và thăng hạng.

> **Yêu cầu nhân vật RPG.** Dùng `/adventure create` trước nếu chưa có.

## Cấp Bậc

Tiến qua 10 cấp bậc bằng cách tích lũy Điểm Hội:

| Hạng | Cấp bậc |
|------|---------|
| F | Tân binh |
| E | Người mới |
| D | Học viên |
| C | Thợ lành nghề |
| B | Kỳ cựu |
| A | Chuyên gia |
| S | Tinh nhuệ |
| SS | Bậc thầy |
| SSS | Đại sư |
| Huyền thoại | Huyền thoại |

Hạng cao hơn mở khóa phần thưởng nhiệm vụ tốt hơn và đặc quyền hội.

## Bảng Nhiệm Vụ Hàng Ngày

Bảng nhiệm vụ làm mới hàng ngày với **3 nhiệm vụ chung** cho tất cả thành viên và **2 nhiệm vụ cá nhân** riêng cho bạn. Có 12 loại hành động nhiệm vụ bao gồm nhiều hoạt động RPG khác nhau.

Dùng `/guild board` để xem nhiệm vụ có sẵn và `/guild quests` để theo dõi tiến trình.

## Chi Hội

Mỗi server Discord có thể có chi hội riêng (admin thiết lập qua `/guild-admin setup`). Chi hội cung cấp:

- **Nhiệm vụ hợp tác hàng tuần** — mục tiêu chung cho tất cả thành viên chi hội
- **Sự kiện thi đấu hàng tháng** — server đấu với server

Dùng `/guild branch` để xem chi hội của server và `/guild event` để kiểm tra sự kiện tháng hiện tại.

## Bảng Xếp Hạng

Dùng `/guild ranking` để xem xếp hạng. Tham số loại tùy chọn:

| Loại | Hiển thị |
|------|---------|
| `gp` | Xếp theo Điểm Hội |
| `rank` | Xếp theo cấp bậc hội |
| `quests` | Xếp theo số nhiệm vụ hoàn thành |

> **Mẹo:** Hoàn thành nhiệm vụ hàng ngày đều đặn để tối đa hóa GP. Bonus streak từ hoạt động hàng ngày tích lũy nhanh theo thời gian.
