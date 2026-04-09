---
title: Hệ Thống Kinh Tế
description: Tìm hiểu cách kiếm coin và gem, xây dựng chuỗi cầu nguyện, và mua sắm trong shop.
icon: "💰"
order: 1
relatedCommands: ["balance", "pray", "curse", "shop", "economy", "gamble", "work", "fish", "gift", "rob"]
---

## Tổng Quan

3AT có **hệ thống kinh tế kép** trong mỗi server. **Coin** là tiền tệ thông dụng — dễ kiếm, dùng để mua vật phẩm trong shop. **Gem** là loại tiền hiếm và giá trị — kiếm được qua cầu nguyện may mắn và các mốc streak.

Số dư của bạn là **riêng biệt theo server**, mỗi server bạn tham gia có kinh tế riêng.

## Xem Số Dư

Dùng `/balance` để xem số coin, gem, chuỗi cầu nguyện và hoạt động gần nhất. Bạn cũng có thể xem số dư của người khác với `/balance user:@ai_do`.

## Kiếm Coin: Cầu Nguyện

Cách chính để kiếm coin là lệnh `/pray` — hành động hàng ngày bạn có thể dùng **mỗi 24 giờ** (reset lúc nửa đêm UTC).

| Loại Cầu Nguyện | Thưởng Coin | Cơ Hội Gem |
|-----------------|-------------|------------|
| Tự cầu nguyện (`/pray`) | 50–150 coin | Không |
| Cầu nguyện cho người khác (`/pray target:@user`) | 100–200 coin | 5% cơ hội nhận 1 gem |

> **Mẹo:** Luôn cầu nguyện cho người khác khi có thể — thưởng coin cao hơn và có cơ hội nhận gem!

## Thưởng Streak

Cầu nguyện vào **các ngày liên tiếp** sẽ xây dựng streak. Đạt các mốc sau để nhận thưởng:

| Streak | Thưởng Coin | Thưởng Gem |
|--------|-------------|------------|
| 3 ngày | +50 | — |
| 7 ngày | +150 | +1 |
| 14 ngày | +300 | +2 |
| 30 ngày | +500 | +5 |

> **Lưu ý:** Bỏ lỡ một ngày sẽ reset streak về 0. Hãy cầu nguyện mỗi ngày!

## Kiếm Coin: Nguyền Rủa

`/curse` là hành động hàng ngày thứ hai, **tách biệt với pray** — bạn có thể dùng cả hai mỗi ngày.

| Loại Nguyền Rủa | Thưởng Coin |
|-----------------|-------------|
| Tự nguyền rủa (`/curse`) | 20–80 coin |
| Nguyền rủa người khác (`/curse target:@user`) | 40–100 coin |

Curse không có streak hay thưởng gem.

## Shop

Mỗi server có shop riêng với các vật phẩm tùy chỉnh. Xem với `/shop view` và mua với `/shop buy`.

### Loại Vật Phẩm

| Loại | Bạn Nhận Được |
|------|--------------|
| Role | Một role Discord được gán cho bạn |
| Cosmetic | Vật phẩm trang trí (theo server) |
| Currency Exchange | Đổi giữa các loại tiền |

Vật phẩm có thể có **số lượng giới hạn** — hết hàng thì phải đợi admin bổ sung.

## Làm Việc & Câu Cá

### /work
Kiếm 80–200 coin mỗi ca làm việc với thời gian chờ 4 giờ. Chạy lệnh, nhận mô tả công việc ngẫu nhiên và nhận lương. Thu nhập đơn giản và ổn định.

### /fish
Thả câu mỗi giờ để có cơ hội bắt cá với 4 cấp độ hiếm. Cá thường (55%) cho 10–30 coin, trong khi cá huyền thoại (4%) có thể thưởng 300–600 coin. Tên cá và cấp độ hiếm được hiển thị trong embed.

## Cờ Bạc

Dùng `/gamble` để đặt cược coin vào các mini-game:
- **Coinflip** — 50/50 nhân đôi hoặc mất tất cả
- **Slots** — trùng biểu tượng để thắng đến ×20
- **Dice** — đoán cao/thấp trên 2d6

Cờ bạc có lợi thế nhà cái (trừ coinflip) và là nơi tiêu coin. Cược tối thiểu/tối đa và thời gian chờ có thể tùy chỉnh bởi admin.

## Kinh Tế Xã Hội

### /gift
Gửi coin trực tiếp cho người dùng khác. Tối đa 1.000 coin mỗi lần tặng (tùy chỉnh). Không có thời gian chờ.

### /rob
Cố cướp 10–30% coin của người dùng khác. Tỉ lệ thành công 40% — nhưng thất bại sẽ khiến bạn mất 10–20% số dư của mình. Các bảo vệ ngăn việc nhắm vào người nghèo hoặc vừa bị cướp.

## Bảng Lệnh

| Lệnh | Mô Tả | Ví Dụ |
|-------|--------|--------|
| `/balance` | Xem số dư coin/gem và streak | `/balance` |
| `/balance user:@ai_do` | Xem số dư người khác | `/balance user:@friend` |
| `/pray` | Cầu nguyện hàng ngày (tự thân) | `/pray` |
| `/pray target:@user` | Cầu nguyện cho người khác | `/pray target:@friend` |
| `/curse` | Nguyền rủa hàng ngày (tự thân) | `/curse` |
| `/curse target:@user` | Nguyền rủa người khác | `/curse target:@rival` |
| `/shop view` | Xem các vật phẩm trong shop | `/shop view` |
| `/shop buy` | Mua vật phẩm từ shop | `/shop buy` |

## Dành Cho Admin

> Phần này dành cho quản trị viên server.

### Quản Lý Tiền Tệ

Dùng `/economy` để điều chỉnh số dư của bất kỳ người dùng nào:

| Lệnh Con | Mô Tả | Ví Dụ |
|----------|--------|--------|
| `/economy set-coin` | Đặt số coin chính xác | `/economy set-coin user:@user amount:500` |
| `/economy add-coin` | Thêm (hoặc trừ) coin | `/economy add-coin user:@user amount:100` |
| `/economy set-gem` | Đặt số gem chính xác | `/economy set-gem user:@user amount:10` |
| `/economy add-gem` | Thêm (hoặc trừ) gem | `/economy add-gem user:@user amount:5` |

Mọi thay đổi tiền tệ đều được ghi lại trong lịch sử giao dịch.

### Quản Lý Shop

| Lệnh Con | Mô Tả |
|----------|--------|
| `/shop add` | Thêm vật phẩm mới vào shop (tên, giá, loại, giới hạn số lượng) |
| `/shop remove` | Xóa vật phẩm khỏi shop |

> **Mẹo:** Lên kế hoạch cho các vật phẩm shop phù hợp với hệ thống role của server. Vật phẩm role là phần thưởng phổ biến cho thành viên tích cực!
