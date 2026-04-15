---
title: Quản lý Kinh tế
command: economy
category: economy
description: Công cụ quản trị để quản lý kinh tế server — tiền tệ, cấu hình, bảng điều khiển, kiểm tra, reset, thao tác hàng loạt.
permissions: ["Administrator"]
---

## Nhóm Lệnh Con

### Balance — Quản lý tiền tệ người dùng

| Lệnh con | Mô tả | Ví dụ |
|----------|-------|--------|
| `/economy balance set-coin <user> <amount>` | Đặt số dư coin của người dùng | `/economy balance set-coin @user 1000` |
| `/economy balance add-coin <user> <amount>` | Thêm (hoặc trừ) coin | `/economy balance add-coin @user 500` |
| `/economy balance set-gem <user> <amount>` | Đặt số dư gem của người dùng | `/economy balance set-gem @user 10` |
| `/economy balance add-gem <user> <amount>` | Thêm (hoặc trừ) gem | `/economy balance add-gem @user 5` |

### Config — Cấu hình các hệ thống con

| Lệnh con | Mô tả |
|----------|-------|
| `/economy config reward-view` | Xem cài đặt thưởng thụ động |
| `/economy config reward-toggle` | Bật/tắt thưởng thụ động |
| `/economy config reward-set <setting> <value>` | Điều chỉnh giá trị thưởng |
| `/economy config reward-milestone <level> <gems>` | Đặt/xóa mốc thưởng gem |
| `/economy config gambling-view/toggle/set` | Quản lý cài đặt cờ bạc |
| `/economy config work-view/toggle/set` | Quản lý cài đặt làm việc/câu cá |
| `/economy config social-view/toggle/set` | Quản lý cài đặt tặng/cướp |

### Admin — Bảng điều khiển, kiểm tra và công cụ quản lý

| Lệnh con | Mô tả | Ví dụ |
|----------|-------|--------|
| `/economy admin dashboard` | Xem tổng quan kinh tế, chỉ số sức khỏe, cảnh báo bất thường | `/economy admin dashboard` |
| `/economy admin history <user>` | Xem lịch sử giao dịch của người dùng (phân trang) | `/economy admin history @user type:gambling` |
| `/economy admin reverse <id>` | Hoàn tác một giao dịch cụ thể | `/economy admin reverse abc123` |
| `/economy admin freeze <user>` | Khóa quyền truy cập kinh tế của người dùng | `/economy admin freeze @user reason:nghi ngờ gian lận` |
| `/economy admin unfreeze <user>` | Mở khóa quyền truy cập kinh tế | `/economy admin unfreeze @user` |
| `/economy admin reset <scope>` | Reset kinh tế với snapshot tự động | `/economy admin reset scope:coin` |
| `/economy admin rollback <id>` | Khôi phục từ snapshot | `/economy admin rollback a1b2c3d4` |
| `/economy admin log-setup <channel>` | Đặt kênh ghi nhật ký kinh tế | `/economy admin log-setup #economy-logs` |
| `/economy admin log-config <setting> <value>` | Cấu hình ngưỡng ghi nhật ký | `/economy admin log-config coin-threshold 1000` |

### Bulk — Thao tác tiền tệ hàng loạt

| Lệnh con | Mô tả | Ví dụ |
|----------|-------|--------|
| `/economy bulk distribute <amount> <currency>` | Phân phối tiền tệ cho các thành viên | `/economy bulk distribute 100 coin role:@Active` |
| `/economy bulk tax <amount> <currency>` | Thu tiền tệ từ các thành viên | `/economy bulk tax 50 coin` |

> **Lưu ý:** Các thao tác reset và bulk có cổng xác nhận. Reset tự động tạo snapshot để rollback. Thao tác bulk có thời gian chờ 60 giây.
