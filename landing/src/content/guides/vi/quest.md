---
title: Nhiệm Vụ Hàng Ngày
description: Hoàn thành 3 nhiệm vụ luân phiên mỗi ngày để nhận coin, star và thưởng mốc chuỗi.
icon: "📜"
order: 12
relatedCommands: ["quest", "pray", "curse", "work", "fish", "mine", "dungeon", "gamble", "rob", "wallet", "gift", "shop"]
---

## Tổng Quan

Hệ thống Quest mỗi ngày sẽ giao cho bạn **3 mục tiêu**:

- **1 nhiệm vụ Dễ**
- **1 nhiệm vụ Trung bình**
- **1 nhiệm vụ Khó**

Bạn hoàn thành chúng bằng cách dùng các lệnh bot như hoạt động bình thường trong server. Quest được thiết kế để thưởng cho người chơi hoạt động đều đặn bằng:

- **Coin** (kinh tế theo server) cho từng nhiệm vụ hoàn thành
- **Star** (ví toàn cầu) khi hoàn thành đủ 3 nhiệm vụ và claim
- **Star thưởng thêm** từ các mốc streak

## Bắt Đầu Nhanh (2 phút)

1. Dùng `/quest view` để xem 3 nhiệm vụ hôm nay.
2. Hoàn thành từng nhiệm vụ bằng các lệnh tương ứng trong mô tả quest.
3. Dùng lại `/quest view` bất cứ lúc nào để kiểm tra tiến độ.
4. Khi hoàn thành cả 3, chạy `/quest claim`.
5. Lặp lại mỗi ngày để xây streak quest.

## Reset Hàng Ngày và Luân Phiên Nhiệm Vụ

- Nhiệm vụ reset vào **00:00 UTC** mỗi ngày.
- Danh sách quest được tạo theo user + ngày UTC, nên trong cùng một ngày danh sách của bạn sẽ giữ nguyên.
- Nếu bỏ lỡ một ngày, streak sẽ bị reset.

> **Mẹo:** Nếu bạn ở Việt Nam (UTC+7), thời điểm reset là **07:00 sáng**.

## Độ Khó Nhiệm Vụ và Thưởng Cơ Bản

Mỗi ngày luôn có 1 nhiệm vụ cho mỗi độ khó:

| Độ khó | Hành động thường gặp | Thưởng Coin cơ bản (Free) |
|--------|----------------------|---------------------------|
| Dễ | Cầu nguyện cho người khác, xem rank/balance/wallet | 10 coin |
| Trung bình | Work, fish, mine, gift, confession, xem shop | 20 coin |
| Khó | Hoàn thành dungeon, mine/fish 2 lần, thắng gamble, rob thành công | 35 coin |

Coin sẽ được cộng tự động ngay khi từng nhiệm vụ hoàn thành.

## Tăng Thưởng Theo Premium

Premium tăng coin nhận được theo từng quest, đồng thời tăng star ở thưởng hoàn tất và thưởng streak.

### Thưởng Coin Mỗi Nhiệm Vụ

| Độ khó | Free | Gói Star | Gói Galaxy |
|--------|------|----------|------------|
| Dễ | 10 | 15 | 20 |
| Trung bình | 20 | 30 | 40 |
| Khó | 35 | 50 | 70 |

### Thưởng Star Khi Hoàn Thành Cả 3 (`/quest claim`)

| Gói | Thưởng |
|-----|--------|
| Free | +1 star |
| Star | +2 star |
| Galaxy | +3 star |

## Mốc Streak

Streak quest tăng khi bạn hoàn thành và claim đủ 3 nhiệm vụ trong các ngày UTC liên tiếp.

| Mốc | Free | Gói Star | Gói Galaxy |
|-----|------|----------|------------|
| 3 ngày | +1 star | +2 star | +3 star |
| 7 ngày | +3 star | +5 star | +8 star |
| 14 ngày | +5 star | +8 star | +12 star |
| 30 ngày | +10 star | +15 star | +20 star |

Bỏ lỡ 1 ngày sẽ reset streak về 0.

## Cách Tính Tiến Độ

Tiến độ chỉ tăng khi hành động tương ứng thành công. Ví dụ:

- `Thắng gamble` chỉ tính khi kết quả là thắng.
- `Rob thành công` chỉ tính khi cướp thành công.
- `Mine 2 lần` yêu cầu 2 lần mine thành công.

Nếu lệnh bị lỗi, hết thời gian, hoặc bị hủy thì thường sẽ không cộng tiến độ quest.

## Cơ Chế Claim (Quan trọng)

- Hoàn thành đủ 3 nhiệm vụ **không tự động** nhận thưởng star hoàn tất.
- Bạn phải chạy `/quest claim` để nhận:
  - Star thưởng hoàn thành cả 3
  - Star thưởng mốc streak (nếu đạt điều kiện)
- Mỗi ngày chỉ claim một lần sau khi đủ 3 nhiệm vụ.

## Quy Trình Làm Quest Hiệu Quả

Bạn có thể theo thứ tự sau để clear nhanh:

1. Làm nhiệm vụ Dễ trước để lấy đà.
2. Hoàn thành nhiệm vụ Trung bình trong lúc chơi các lệnh kinh tế thường ngày (`/work`, `/fish`, `/mine`...).
3. Để nhiệm vụ Khó cho lúc rảnh tập trung (`/dungeon`, thắng gamble, hoặc nhiệm vụ nhiều bước).
4. Chạy `/quest claim` ngay khi hoàn thành cả 3.
5. Mở `/wallet view` để kiểm tra số star đã tăng.

## Các Lỗi Thường Gặp

| Lỗi | Hậu quả | Cách xử lý |
|-----|---------|------------|
| Quên `/quest claim` | Không nhận star hoàn tất | Claim trước giờ reset UTC |
| Để sát giờ reset mới làm | Dễ mất streak | Hoàn thành sớm trong ngày |
| Nghĩ lệnh nào cũng tính | Một số quest cần điều kiện thành công | Đọc kỹ mô tả quest |
| Bỏ lỡ 1 ngày | Streak về 0 | Đặt nhắc nhở hằng ngày |

## Bảng Lệnh Liên Quan

| Lệnh | Mục đích |
|------|----------|
| `/quest view` | Xem nhiệm vụ hôm nay và tiến độ |
| `/quest claim` | Nhận thưởng hoàn tất + thưởng streak |
| `/wallet view` | Kiểm tra tổng star toàn cầu |

Để xem mô tả ngắn theo dạng command, xem trang lệnh [`/quest`](/vi/commands/quest).
