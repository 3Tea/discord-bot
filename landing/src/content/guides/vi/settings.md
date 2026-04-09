---
title: Cài Đặt & Ngôn Ngữ
description: Cấu hình ngôn ngữ cá nhân và cài đặt ngôn ngữ cho toàn server.
icon: "⚙️"
order: 9
relatedCommands: ["settings"]
---

## Tổng Quan

3AT hỗ trợ **15 ngôn ngữ**. Bạn có thể đặt ưu tiên cá nhân hoặc mặc định cho toàn server — bot sẽ điều chỉnh tất cả phản hồi theo ngôn ngữ bạn chọn.

## Ngôn Ngữ Cá Nhân

Dùng `/settings language` để đặt ngôn ngữ ưa thích. Áp dụng trên **tất cả server** nơi bạn dùng 3AT.

```
/settings language locale:vi
```

## Ngôn Ngữ Server

Quản trị viên server có thể đặt ngôn ngữ mặc định cho toàn server bằng `/settings server-language`. Áp dụng cho tất cả thành viên chưa đặt ưu tiên cá nhân.

```
/settings server-language locale:en
```

> **Lưu ý:** Yêu cầu quyền **Administrator**.

## Thứ Tự Ưu Tiên Ngôn Ngữ

Bot xác định ngôn ngữ sử dụng theo thứ tự:

| Ưu Tiên | Nguồn | Ví Dụ |
|----------|--------|--------|
| 1 (cao nhất) | Ngôn ngữ cá nhân của bạn | Đặt qua `/settings language` |
| 2 | Ngôn ngữ mặc định server | Đặt qua `/settings server-language` |
| 3 | Ngôn ngữ Discord client | Tự động phát hiện từ cài đặt Discord |
| 4 (dự phòng) | Tiếng Anh | Luôn có sẵn |

## Ngôn Ngữ Được Hỗ Trợ

| Mã | Ngôn Ngữ |
|----|----------|
| `en` | English |
| `vi` | Tiếng Việt |
| `id` | Bahasa Indonesia |
| `es` | Español |
| `ja` | 日本語 |
| `zh` | 中文 |
| `ko` | 한국어 |
| `pt-BR` | Português (Brasil) |
| `fr` | Français |
| `de` | Deutsch |
| `ru` | Русский |
| `tr` | Türkçe |
| `it` | Italiano |
| `pl` | Polski |
| `nl` | Nederlands |

> **Lưu ý:** **Tên** lệnh và tùy chọn giữ nguyên tiếng Anh. Chỉ **mô tả** lệnh và **phản hồi** bot được dịch.

## Bảng Lệnh

| Lệnh | Mô Tả | Ví Dụ |
|-------|--------|--------|
| `/settings language` | Đặt ngôn ngữ cá nhân | `/settings language locale:ja` |
| `/settings server-language` | Đặt ngôn ngữ mặc định server (Admin) | `/settings server-language locale:vi` |
