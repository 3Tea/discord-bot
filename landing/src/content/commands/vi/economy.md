---
title: Quản lý Kinh tế
command: economy
category: economy
description: Các lệnh quản trị viên để đặt hoặc điều chỉnh số dư coin và gem của người dùng.
permissions: ["Administrator"]
---

## Lệnh con

| Lệnh con | Mô tả | Ví dụ |
|----------|-------|--------|
| `/economy set-coin <user> <amount>` | Đặt số dư coin của người dùng | `/economy set-coin @user 1000` |
| `/economy add-coin <user> <amount>` | Thêm (hoặc trừ) coins | `/economy add-coin @user 500` |
| `/economy set-gem <user> <amount>` | Đặt số dư gem của người dùng | `/economy set-gem @user 10` |
| `/economy add-gem <user> <amount>` | Thêm (hoặc trừ) gems | `/economy add-gem @user 5` |

Sử dụng số tiền âm với `add-coin` / `add-gem` để trừ tiền tệ.

> **Lưu ý:** Chỉ những thành viên có quyền **Quản trị viên** mới có thể sử dụng các lệnh này. Tất cả các giao dịch được ghi lại.
