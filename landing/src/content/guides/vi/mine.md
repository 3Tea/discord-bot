---
title: Khai Thác Mỏ
description: Nắm vững hệ thống khai thác — tìm hiểu độ hiếm khoáng sản, chiến lược độ sâu, checkpoint và cách tối đa hóa thu nhập coin.
icon: "⛏️"
order: 10
relatedCommands: ["mine", "balance", "wallet"]
---

## Tổng Quan

Khai thác là hệ thống **tiến trình theo độ sâu** nơi bạn đào dưới lòng đất tìm khoáng sản. Mỗi lần đào thành công đẩy bạn sâu thêm một tầng, tăng cả phần thưởng lẫn rủi ro. Càng đào sâu, khoáng sản càng quý — nhưng nguy cơ sập hầm cũng tăng.

## Bắt Đầu

Chạy `/mine` để bắt đầu đào. Thời gian chờ **2 giờ** giữa các lần đào. Không cần tùy chọn, không cần thiết lập — chỉ cần đào và thu thập.

## Khoáng Sản & Phần Thưởng

Mỗi lần đào sẽ roll ngẫu nhiên một khoáng sản:

| Khoáng Sản | Độ Hiếm | Tỉ Lệ | Coin Cơ Bản | Bonus Độ Sâu |
|-------------|----------|--------|-------------|---------------|
| 🪨 Đá | Thường | 45% | 10–30 | +độ sâu × 2 |
| ⛓️ Sắt | Không thường | 28% | 40–80 | +độ sâu × 3 |
| 🥇 Vàng | Hiếm | 15% | 100–200 | +độ sâu × 5 |
| 💎 Kim cương | Sử thi | 8% | 300–500 | +độ sâu × 8 |
| 🟢 Ngọc lục bảo | Huyền thoại | 4% | 500–800 | +độ sâu × 12 |

**Tổng thưởng = coin cơ bản + (độ sâu × hệ số)**

Ở tầng 20, quặng Vàng trả 100–200 cơ bản + 100 bonus = tổng 200–300 coin. Ngọc lục bảo ở tầng 30 có thể cho 500–800 + 360 = 860–1.160 coin!

## Rủi Ro Sập Hầm

Khai thác không an toàn. Mỗi lần đào sẽ kiểm tra sập hầm:

| Độ Sâu | Tỉ Lệ Sập | Hậu Quả |
|---------|-----------|----------|
| 1–5 | 5% | Mất 50–100 coin, rơi về checkpoint |
| 6–10 | 10% | Mất 50–100 coin, rơi về checkpoint |
| 11+ | 15% | Mất 50–100 coin, rơi về checkpoint |

Bạn không bao giờ bị nợ — nếu có ít coin hơn mức phạt, bạn chỉ mất số coin đang có.

## Checkpoint

Độ sâu tự động lưu tại các **tầng số nguyên tố**: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31...

Khi sập hầm, bạn không phải bắt đầu từ tầng 1 — bạn rơi về checkpoint cuối cùng. Nghĩa là càng tiến xa, bạn càng ít mất khi sập.

### Chiến Lược Checkpoint

- **Tầng 1–5:** Rủi ro tối thiểu (5%). Đẩy nhanh qua.
- **Tầng 6–10:** Rủi ro vừa phải (10%). Checkpoint ở tầng 7 là lưới an toàn.
- **Tầng 11+:** Rủi ro cao hơn (15%), nhưng checkpoint đến thường xuyên (11, 13, 17, 19, 23...).

## Rơi Star

Mỗi lần khai thác thành công (không sập) có **4% cơ hội** rơi 1 star vào ví toàn cầu. Star rất hiếm và giá trị — hoạt động xuyên server và admin không thể chỉnh sửa.

## Tối Đa Hóa Thu Nhập

### Lịch Khai Thác Hàng Ngày

Với thời gian chờ 2 giờ, bạn có thể đào tối đa **12 lần mỗi ngày**. Kết hợp với các lệnh kinh tế khác để tối đa thu nhập:

| Lệnh | Thời Gian Chờ | Thu Nhập Dự Kiến |
|-------|--------------|-----------------|
| `/mine` | 2h | Tùy độ sâu (50–1.000+ coin) |
| `/work` | 4h | 80–200 coin |
| `/fish` | 1h | 10–600 coin |
| `/pray` | 24h | 50–200 coin + cơ hội gem |
| `/curse` | 24h | 20–100 coin |

### Độ Sâu vs. An Toàn

Bonus độ sâu tăng tuyến tính nhưng rủi ro sập giới hạn ở 15%. Sau tầng 11, rủi ro giữ nguyên trong khi phần thưởng tiếp tục tăng. Độ sâu cao luôn có lợi hơn về lâu dài — checkpoint bảo vệ bạn khỏi mất mát thảm khốc.

## Bảng Lệnh

| Lệnh | Mô Tả |
|-------|--------|
| `/mine` | Khai thác khoáng sản (thời gian chờ 2 giờ) |
| `/balance` | Xem số dư coin |
| `/wallet view` | Xem số dư star toàn cầu |
