---
title: Hầm Ngục
description: Chinh phục hầm ngục — học chiến thuật chiến đấu, các loại lượt gặp, chiến lược thương nhân và tiến tầng.
icon: "🏰"
order: 11
relatedCommands: ["dungeon", "adventure", "guild"]
---

## Tổng Quan

Hầm ngục là hệ thống **phiêu lưu nhiều lượt gặp**. Mỗi lần chơi cho bạn tối đa 5 lượt gặp — quái vật để chiến đấu, kho báu để tìm, bẫy để sống sót, và thương nhân để giao dịch. HP của bạn được giữ suốt lượt chơi, nên mỗi quyết định đều quan trọng.

> **Lưu ý:** Bạn cần nhân vật RPG để vào hầm ngục. Tạo nhân vật bằng `/adventure create` nếu chưa có. Xem [Hướng Dẫn Bắt Đầu RPG](/vi/guide/rpg-getting-started) để biết chi tiết.

## Bắt Đầu

Chạy `/dungeon` để vào. Thời gian chờ **1 giờ** giữa các lượt chơi. Khi vào trong, bot hiển thị lượt gặp đầu tiên và bạn tương tác qua **nút bấm** — không cần lệnh trong lượt chơi.

## Lượt Chơi

Mỗi lượt bắt đầu với **toàn bộ HP** nhân vật (dựa trên lớp, cấp, và trang bị) và **5 lượt gặp**. Sau mỗi lượt gặp, bạn chọn:

- **Tiếp tục** — Đối mặt lượt gặp tiếp theo
- **Rời đi** — Thoát hầm ngục và giữ tất cả phần thưởng đã kiếm

Lượt chơi tự động kết thúc khi bạn dùng hết 5 lượt gặp, HP về 0, hoặc hết 15 phút.

## Các Loại Lượt Gặp

| Lượt Gặp | Tỉ Lệ | Tiến Tầng? |
|-----------|--------|-----------|
| Quái vật | 50% | Có (khi thắng) |
| Kho báu | 25% | Có |
| Bẫy | 15% | Không |
| Thương nhân | 10% | Không |

## Chiến Đấu

Chiến đấu **dựa trên chỉ số** — STR, DEF, MAG, và SPD thực của nhân vật ảnh hưởng sát thương gây ra và nhận. Mỗi lớp chơi khác nhau trong chiến đấu.

### Hành Động

| Hành Động | MP Cần | Hiệu Ứng |
|-----------|--------|-----------|
| ⚔️ Tấn Công | 0 | Đòn cơ bản dùng chỉ số sát thương chính (STR hoặc MAG) |
| Kỹ Năng 1 | 20 MP | Kỹ năng đầu tiên của lớp (VD: Đòn Mạnh, Cầu Lửa) |
| Kỹ Năng 2 | 30 MP | Kỹ năng thứ hai của lớp (VD: Xoáy Gió, Hồi Máu) |
| 🛡️ Phòng Thủ | 0 | Nhận 50% sát thương + hồi thêm 15 MP |
| 🏃 Chạy | 0 | Thoát khỏi trận (không thưởng, không phạt) |
| Tuyệt Chiêu | 50 MP | Chỉ lớp nâng cao — năng lực mạnh dùng 1 lần mỗi trận |

Quái thường cho bạn **5 lượt** để hạ. Boss cho **7 lượt**.

> **Mẹo:** Phòng Thủ cần thiết cho quản lý MP. Không tốn gì, giảm nửa sát thương nhận, và cho thêm 15 MP ngoài 5 MP hồi tự động. Một lượt Phòng Thủ chuẩn bị cho kỹ năng lớn lượt sau.

### Hệ Thống MP

- **MP cơ bản:** 50 + (cấp nhân vật x 5)
- **Hồi MP mỗi lượt:** 5 (tự động)
- **Bonus Phòng Thủ:** +15 MP (tổng 20 khi phòng thủ)
- **Chi phí kỹ năng:** 20 MP (Kỹ Năng 1), 30 MP (Kỹ Năng 2), 50 MP (Tuyệt Chiêu)

Nếu dùng kỹ năng mà không đủ MP, hành động tự động chuyển thành Tấn Công cơ bản.

### Công Thức Sát Thương

Sát thương tính từ chỉ số nhân vật so với chỉ số quái:

- **Sát thương vật lý:** Dựa trên STR bạn vs DEF quái, với hệ số kỹ năng và phần trăm bỏ qua DEF
- **Sát thương phép:** Dựa trên MAG bạn vs MAG_DEF quái
- **Chí mạng:** Một số kỹ năng (VD: Đâm Lén của Sát Thủ) có cơ hội chí mạng cho bonus sát thương
- **Đa đòn:** Một số kỹ năng đánh nhiều lần (VD: Bắn Nhanh của Cung Thủ đánh 2 lần)
- **Hiệu ứng trạng thái:** Độc gây % HP tối đa mỗi lượt; tăng DEF tăng phòng thủ; giảm SPD làm chậm kẻ thù

Xem chi tiết kỹ năng theo lớp tại [Hướng Dẫn Lớp RPG](/vi/guide/rpg-classes).

### Kết Quả Chiến Đấu

| Kết Quả | Hậu Quả |
|---------|---------|
| Hạ quái | Vàng + EXP + nguyên liệu + cơ hội trang bị + cơ hội rương |
| HP bạn về 0 | Mất 100–200 Vàng, reset về checkpoint, kết thúc lượt |
| Hết lượt | Tự thoát, không thưởng, không phạt |
| Hết 30 giây | Tự thoát |

## Boss

**Boss** xuất hiện mỗi **5 tầng** (tầng 5, 10, 15, 20...). Boss có:

- **Gấp 2 mọi chỉ số** so với quái thường cùng tầng
- **7 lượt** để hạ (so với 5 cho quái thường)
- **Gấp 3 phần thưởng** — gấp ba Vàng, EXP, và nguyên liệu
- **Đảm bảo rơi nguyên liệu** (100%)
- **50% cơ hội rơi trang bị**
- **50% rương Bạc** + 15% rương Vàng

Boss là nguồn phần thưởng tốt nhất trong game. Chuẩn bị bằng cách giữ HP cao và MP đầy trước khi đánh.

## Rương Kho Báu

Không cần chiến đấu — chỉ cần thu thập:

- **Vàng:** 30 cơ bản + (tầng x 10)
- **EXP:** 10 cơ bản + (tầng x 5)
- **Nguyên liệu:** 50% cơ hội
- **Trang bị:** 15% cơ hội
- **Rương:** 15% Đồng, 5% Bạc

Tầng tăng thêm 1.

## Bẫy

Xui xẻo. Bạn nhận sát thương và mất Vàng:

- **Mất Vàng:** 20 cơ bản + (tầng x 5)

Tầng **không** tăng. Nếu bẫy hạ HP về 0, bạn sập — reset về checkpoint với thêm 100–200 Vàng phạt.

## Thương Nhân NPC

Thương nhân cung cấp **một dịch vụ** mỗi lượt gặp. Chọn khôn ngoan:

| Dịch Vụ | Chi Phí | Hiệu Ứng |
|----------|---------|-----------|
| 🧪 Hồi máu | 80 + tầng x 5 Vàng | Hồi 30 + tầng x 2 HP (tối đa đầy) |
| ⚔️ Buff | 100 + tầng x 5 Vàng | Buff ngẫu nhiên cho các lượt còn lại |
| 💱 Đổi tiền | 300–600 Vàng | 1 gem |

### Loại Buff

| Buff | Hiệu Ứng | Thời Hạn |
|------|-----------|----------|
| Tấn công | Sát thương x 1.3 | Hết lượt chơi |
| Phòng thủ | Sát thương quái x 0.7 | Hết lượt chơi |
| May mắn | Nhiều kho báu hơn (35%), ít bẫy hơn (5%) | Hết lượt chơi |

> **Mẹo:** Buff May mắn cực kỳ mạnh — gần gấp ba tỉ lệ kho báu đồng thời giảm bẫy xuống gần không. Nếu đủ tiền, luôn chọn May mắn.

## Chỉ Số Quái Vật

Quái tăng theo cả tầng và cấp nhân vật:

- **HP quái:** 80 + (tầng x 15) + (cấp bạn x 5)
- **STR quái:** 10 + (tầng x 4)
- **DEF quái:** 5 + (tầng x 2)
- **MAG quái:** 8 + (tầng x 3)
- **MAG_DEF quái:** 5 + (tầng x 2)
- **SPD quái:** 8 + (tầng x 2)

Nhân vật cấp cao đối mặt quái khó hơn, nhưng chỉ số và trang bị bù thừa.

## Tiến Tầng & Checkpoint

Tầng hoạt động giống `/mine`:

- Tầng tăng 1 khi thắng quái và tìm kho báu
- Checkpoint tự lưu tại **tầng nguyên tố** (2, 3, 5, 7, 11, 13...)
- Khi chết, tầng reset về checkpoint cuối cùng
- Tiến trình lưu vào database **sau mỗi lần tăng tầng**, không phải cuối lượt chơi

## Hầm Ngục Đội

Hầm ngục đội cho phép **2–4 người chơi** khám phá cùng nhau. Tất cả phải có nhân vật RPG.

### Cách Hoạt Động

- Một người khởi tạo hầm ngục đội và mời người khác
- Chỉ số quái tăng theo số người chơi để cân bằng thử thách
- Tất cả thành viên chọn hành động đồng thời mỗi lượt
- Phần thưởng chia sẻ cho tất cả
- Nếu HP người chơi nào về 0, họ bị loại khỏi phần còn lại của trận

Hầm ngục đội tuyệt vời để đánh boss tầng nguy hiểm khi chơi solo, và cho thành viên hội hợp tác trong nhiệm vụ chung.

## Hướng Dẫn Chiến Lược

### Tầng Đầu (1–5)

Rủi ro thấp. Quái yếu so với đa số nhân vật. Dùng Tấn Công cơ bản để tiết kiệm MP và đẩy nhanh tầng.

### Tầng Giữa (6–10)

Quái bắt đầu đánh mạnh. Dùng Kỹ Năng 1 để hạ nhanh và Phòng Thủ khi HP dưới 50%. Đây là nơi lớp nhân vật quan trọng — Pháp Sư Hồi tự hồi, Đỡ Đòn chịu đòn, và khẩu đại bác (Pháp Sư/Sát Thủ) cần cẩn thận hơn.

### Tầng Sâu (11+)

Sát thương quái đáng kể. Xoay kỹ năng trở nên thiết yếu:
1. Mở đầu bằng kỹ năng lớn (Kỹ Năng 1 hoặc Tuyệt Chiêu nếu có)
2. Phòng Thủ để hồi MP và giảm sát thương
3. Tiếp theo bằng kỹ năng khác
4. Rời đi khi HP nguy hiểm — đừng mạo hiểm sập

### Chiến Lược Boss

1. **Giữ Tuyệt Chiêu** cho boss — 50 MP xứng đáng cho sát thương khổng lồ
2. **Vào với HP và MP đầy** — bỏ qua hoặc Phòng Thủ trận trước tầng boss
3. **Dùng hiệu ứng trạng thái** — Độc gây % HP tối đa, đặc biệt hiệu quả với boss HP gấp 2
4. **Đừng tham** — rời trước boss tốt hơn chết và mất Vàng + tiến trình tầng

### Ưu Tiên Lượt Chơi

1. **Lấy buff sớm** — May mắn hoặc Phòng thủ là tốt nhất
2. **Hồi máu khi dưới 50% HP** — bẫy có thể kết liễu bạn
3. **Tiết kiệm MP cho tầng boss** (mỗi 5 tầng)
4. **Rời đi trước lượt gặp thứ 5** nếu HP nguy hiểm — luôn có thể quay lại

## Tổng Hợp Phần Thưởng

| Nguồn | Vàng | EXP | Nguyên Liệu | Trang Bị | Rương |
|-------|------|-----|-------------|---------|-------|
| Quái | 50 + tầng x 15 | 20 + tầng x 8 | 30% | 10% | 5% Đồng |
| Kho báu | 30 + tầng x 10 | 10 + tầng x 5 | 50% | 15% | 15% Đồng, 5% Bạc |
| Boss | Gấp 3 quái | Gấp 3 quái | Đảm bảo | 50% | 50% Bạc, 15% Vàng |
| Bẫy | -(20 + tầng x 5) | — | — | — | — |

## Bảng Lệnh

| Lệnh | Mô Tả |
|-------|--------|
| `/dungeon` | Bắt đầu lượt hầm ngục (thời gian chờ 1 giờ) |
| `/adventure profile` | Xem chỉ số và trang bị nhân vật |
| `/adventure inventory` | Xem nguyên liệu và trang bị |
| `/adventure equip` | Trang bị đồ tốt hơn trước lượt chơi |
| `/guild quests` | Xem nhiệm vụ theo dõi tiến trình hầm ngục |
