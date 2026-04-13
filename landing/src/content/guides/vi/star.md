---
title: Tiền Tệ Star
description: Tất cả về star — cách kiếm, cách tiêu, và quản lý tiền tệ toàn cầu của bạn.
icon: "⭐"
order: 2
relatedCommands: ["wallet", "pray", "curse", "work", "fish", "mine", "dungeon", "nhentai", "3hentai", "asmhentai", "hentaifox", "nhentai-lite", "pururin"]
---

## Tổng Quan

**Star** ⭐ là **tiền tệ toàn cầu** của 3AT — số dư của bạn giống nhau trên mọi server. Khác với coin và gem (theo từng server), star không thể bị admin thêm hay xóa, và không thể chuyển cho người dùng khác.

Star được kiếm qua hoạt động hàng ngày và dùng để sử dụng các tính năng cao cấp như lệnh manga và shop toàn cầu.

## Kiếm Star

### Nhận Hàng Ngày

Dùng `/wallet daily` mỗi ngày để nhận **1–3 star** (ngẫu nhiên). Đây là cách ổn định nhất để tích lũy star.

Nhận vào **các ngày UTC liên tiếp** sẽ xây dựng streak với phần thưởng bonus:

| Streak | Star Bonus | Tổng Ngày Đó |
|--------|------------|---------------|
| 3 ngày | +2 | 3–5 |
| 7 ngày | +5 | 6–8 |
| 14 ngày | +10 | 11–13 |
| 30 ngày | +20 | 21–23 |

> **Lưu ý:** Bỏ lỡ một ngày sẽ reset streak về 0. Hãy đặt nhắc nhở hàng ngày!

### Star Rơi

Mỗi khi bạn dùng một số lệnh nhất định, có cơ hội nhỏ nhận được **1 star bonus**. Hoàn toàn ngẫu nhiên — không có thời gian chờ, chỉ là may mắn.

| Lệnh | Tỉ Lệ Rơi | Điều Kiện |
|------|-----------|-----------|
| `/pray` | 5% | Sau mỗi lần cầu nguyện |
| `/curse` | 5% | Sau mỗi lần nguyền rủa |
| `/work` | 4% | Khi làm việc thành công |
| `/mine` | 4% | Khi đào thành công (không tính sập hầm) |
| `/fish` | 3% | Khi câu cá thành công |
| `/dungeon` | 3% | Sau khi thắng chiến đấu |

> **Mẹo:** Càng nhiều hoạt động bạn làm mỗi ngày, càng nhiều cơ hội nhận star rơi. Pray, curse, work, fish, mine và dungeon đều tính độc lập.

### Mốc Thành Tích

Phần thưởng star một lần khi đạt các mục tiêu cụ thể. Sau khi nhận rồi sẽ không lặp lại — nhưng tổng cộng lên đến **176 star**.

#### Mốc XP

| Mốc | Star |
|------|------|
| Đạt level 10 | 5 |
| Đạt level 25 | 15 |
| Đạt level 50 | 30 |
| Đạt level 100 | 50 |

#### Mốc Streak Cầu Nguyện

| Mốc | Star |
|------|------|
| Streak pray 7 ngày | 3 |
| Streak pray 14 ngày | 8 |
| Streak pray 30 ngày | 20 |

#### Mốc Đa Server

| Mốc | Star |
|------|------|
| Hoạt động trong 3 server | 5 |
| Hoạt động trong 5 server | 10 |
| Hoạt động trong 10 server | 20 |

#### Bảng Xếp Hạng

| Mốc | Star |
|------|------|
| Lọt top 3 trên bảng xếp hạng bất kỳ | 10 |

Dùng `/wallet view` để xem những mốc nào bạn đã nhận và mốc nào còn có thể nhận.

## Tiêu Star

### Lệnh Manga

Tất cả lệnh manga (`/nhentai`, `/3hentai`, `/asmhentai`, `/hentaifox`, `/nhentai-lite`, `/pururin`) sử dụng **hệ thống tính phí star**:

- **3 lượt miễn phí mỗi ngày** — reset lúc nửa đêm UTC
- Sau khi hết lượt miễn phí, mỗi lệnh tốn **1 star**
- Cả 6 nguồn manga **dùng chung bộ đếm** — dùng `/nhentai` tính cùng 3 lượt miễn phí với `/3hentai`
- Nếu lệnh lỗi (API error, timeout), star hoặc lượt miễn phí sẽ được **hoàn tự động**

> **Mẹo:** Chia 3 lượt miễn phí cho các nguồn khác nhau để khám phá, rồi dùng star cho nguồn yêu thích.

Để biết thêm chi tiết về lệnh manga, xem [Hướng dẫn Manga](/vi/guide/manga).

### Shop Toàn Cầu

Dùng `/global-shop buy` để mua vật phẩm độc quyền bằng star. Mỗi vật phẩm có giá star riêng, và một số có số lượng giới hạn. Kiểm tra shop thường xuyên để tìm vật phẩm mới.

## Quản Lý Ví

| Lệnh | Chức Năng |
|------|-----------|
| `/wallet view` | Xem số dư star, streak hàng ngày và tiến độ mốc thành tích |
| `/wallet daily` | Nhận phần thưởng star hàng ngày |
| `/wallet history` | Xem lịch sử giao dịch toàn cầu (thu nhập và chi tiêu star) |

## Mẹo & Chiến Lược

1. **Đừng bao giờ bỏ lỡ `/wallet daily`** — bonus streak rất lớn. Streak 30 ngày cho +20 star bonus ngoài 1–3 star cơ bản.
2. **Làm tất cả hoạt động hàng ngày** — pray, curse, work, fish, mine và dungeon đều có cơ hội rơi star độc lập. Làm đủ sáu hoạt động cho bạn tới 6 cơ hội mỗi ngày.
3. **Theo dõi mốc thành tích** — dùng `/wallet view` để xem những mốc nào chưa nhận. Một số (như đa server) chỉ cần tham gia thêm server có 3AT.
4. **Dùng manga miễn phí trước** — bạn có 3 lượt miễn phí mỗi ngày. Đừng tiêu star khi chưa hết lượt.
5. **Star là vĩnh viễn** — không ai có thể lấy star của bạn. Star thuộc về bạn trên mọi server, mãi mãi.
