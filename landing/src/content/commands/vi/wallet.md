---
title: Ví Toàn Cầu
command: wallet
category: economy
description: Xem số dư star toàn cầu, nhận thưởng hàng ngày và theo dõi lịch sử giao dịch trên tất cả server.
---

## Cách dùng

```
/wallet view
/wallet daily
/wallet history page:2
```

## Lệnh con

| Lệnh con | Mô tả |
|-----------|-------|
| `view` | Xem số dư star, chuỗi ngày và thành tựu đã đạt |
| `daily` | Nhận star hàng ngày (reset lúc nửa đêm UTC) |
| `history` | Xem lịch sử giao dịch toàn cầu (phân trang) |

## Tiền Tệ Star

**Star** là loại tiền toàn cầu hoàn toàn tách biệt với coin và gem theo server:

- **Bot kiểm soát** — không admin nào có thể thêm hoặc xóa star
- **Toàn cầu** — số dư star giống nhau trên tất cả server
- **Không đổi** — star không thể chuyển đổi sang/từ coin hoặc gem
- **Không chuyển** — star không thể gửi cho người dùng khác

## Nhận Star Hàng Ngày

Nhận 1–3 star mỗi ngày. Nhận vào các ngày liên tiếp xây dựng **chuỗi streak** với thưởng mốc:

| Streak | Star Bonus |
|--------|------------|
| 3 ngày | +2 |
| 7 ngày | +5 |
| 14 ngày | +10 |
| 30 ngày | +20 |

> **Lưu ý:** Bỏ lỡ một ngày sẽ reset streak về 0!

## Thành Tựu

Nhận star một lần khi đạt mốc trên bất kỳ server nào:

| Thành Tựu | Star |
|-----------|------|
| Đạt cấp 10 | 5 |
| Đạt cấp 25 | 15 |
| Đạt cấp 50 | 30 |
| Đạt cấp 100 | 50 |
| Streak pray 7 ngày | 3 |
| Streak pray 14 ngày | 8 |
| Streak pray 30 ngày | 20 |
| Top 3 bảng xếp hạng XP | 10 |
| Hoạt động trong 3 server | 5 |
| Hoạt động trong 5 server | 10 |
| Hoạt động trong 10 server | 20 |

## Lịch Sử Giao Dịch

Dùng `/wallet history` để xem tất cả thu nhập và chi tiêu star. Mỗi mục hiển thị thời gian, loại và số lượng. Phân trang 10 mục mỗi trang.
