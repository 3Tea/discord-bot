---
title: Hầm Ngục
description: Chinh phục hầm ngục — học chiến thuật chiến đấu, các loại lượt gặp, chiến lược thương nhân và tiến tầng.
icon: "🏰"
order: 11
relatedCommands: ["dungeon", "balance", "wallet"]
---

## Tổng Quan

Hầm ngục là hệ thống **phiêu lưu nhiều lượt gặp**. Mỗi lần chơi cho bạn tối đa 5 lượt gặp — quái vật để chiến đấu, kho báu để tìm, bẫy để sống sót, và thương nhân để giao dịch. HP của bạn được giữ suốt lượt chơi, nên mỗi quyết định đều quan trọng.

## Bắt Đầu

Chạy `/dungeon` để vào. Thời gian chờ **1 giờ** giữa các lượt chơi. Khi vào trong, bot hiển thị lượt gặp đầu tiên và bạn tương tác qua **nút bấm** — không cần lệnh trong lượt chơi.

## Lượt Chơi

Mỗi lượt bắt đầu với **100 HP** và **5 lượt gặp**. Sau mỗi lượt gặp, bạn chọn:

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

Khi gặp quái vật, bạn có **3 lượt** để hạ nó bằng các nút hành động:

### Hành Động

| Nút | Sát Thương Của Bạn | Sát Thương Nhận |
|-----|-------------------|-----------------|
| ⚔️ Tấn công | 100% | 100% |
| 🛡️ Phòng thủ | 70% | 50% |
| 🏃 Chạy | — | — (thoát) |

### Công Thức Sát Thương

- **Tấn công của bạn:** 15–25 cơ bản + (tầng × 2)
- **Tấn công quái:** 10–20 cơ bản + (tầng × 3)
- **HP quái:** 30 + (tầng × 5)

### Kết Quả Chiến Đấu

| Kết Quả | Hậu Quả |
|---------|---------|
| Hạ quái | 50–150 coin + bonus tầng, 10% cơ hội gem, 3% cơ hội star |
| HP bạn về 0 | Mất 100–200 coin, reset về checkpoint, kết thúc lượt |
| Hết 3 lượt | Tự thoát, không thưởng, không phạt |
| Hết 30 giây | Tự thoát |

> **Mẹo:** Dùng Phòng thủ ở tầng cao nơi quái đánh đau. Nhận 50% sát thương mà vẫn gây 70% có thể cứu cả lượt chơi.

## Rương Kho Báu

Không cần chiến đấu — chỉ cần thu thập:

- **Coin:** 30–100 cơ bản + (tầng × 8)
- **Gem:** 15% cơ hội nhận 1
- **Star:** 3% cơ hội nhận 1

Tầng tăng thêm 1.

## Bẫy

Xui xẻo. Bạn nhận sát thương và mất coin:

- **Mất HP:** 10–20
- **Mất coin:** 30–60

Tầng **không** tăng. Nếu bẫy hạ HP về 0, bạn sập — reset về checkpoint với thêm 100–200 coin phạt.

## Thương Nhân NPC

Thương nhân cung cấp **một dịch vụ** mỗi lượt gặp. Chọn khôn ngoan:

| Dịch Vụ | Chi Phí | Hiệu Ứng |
|----------|---------|-----------|
| 🧪 Hồi máu | 80 + tầng × 5 coin | Hồi 30 + tầng × 2 HP (tối đa 100) |
| ⚔️ Buff | 100 + tầng × 5 coin | Buff ngẫu nhiên cho các lượt còn lại |
| 💱 Đổi tiền | 300–600 coin | 1 gem |

### Loại Buff

| Buff | Hiệu Ứng | Thời Hạn |
|------|-----------|----------|
| Tấn công | Sát thương × 1.3 | Hết lượt chơi |
| Phòng thủ | Sát thương quái × 0.7 | Hết lượt chơi |
| May mắn | Nhiều kho báu hơn (35%), ít bẫy hơn (5%) | Hết lượt chơi |

> **Mẹo:** Buff May mắn cực kỳ mạnh — gần gấp ba tỉ lệ kho báu đồng thời giảm bẫy xuống gần không. Nếu đủ tiền, luôn chọn May mắn.

## Cấp Quái Vật

Quái vật chỉ mang tính thẩm mỹ — không có chỉ số riêng. Tất cả sát thương tính theo công thức tầng.

| Cấp | Tầng | Quái |
|-----|------|------|
| Cấp 1 | 1–5 | Chuột 🐀, Dơi 🦇, Slime 🟢, Goblin 👺, Nhện 🕷️ |
| Cấp 2 | 6–10 | Xương 💀, Zombie 🧟, Sói 🐺, Orc 👹, Ma 👻 |
| Cấp 3 | 11+ | Rồng 🐉, Quỷ 😈, Pháp sư 🧙, Thủy xà 🐍, Titan ⚡ |

## Tiến Tầng & Checkpoint

Tầng hoạt động giống `/mine`:

- Tầng tăng 1 khi thắng quái và tìm kho báu
- Checkpoint tự lưu tại **tầng nguyên tố** (2, 3, 5, 7, 11, 13...)
- Khi chết, tầng reset về checkpoint cuối cùng
- Tiến trình lưu vào database **sau mỗi lần tăng tầng**, không phải cuối lượt chơi

## Hướng Dẫn Chiến Lược

### Tầng Đầu (1–5)

Rủi ro thấp. Quái đánh nhẹ, bẫy ít đau. Tấn công liên tục và đẩy nhanh tầng.

### Tầng Giữa (6–10)

Quái bắt đầu đánh đau. Cân nhắc Phòng thủ khi HP dưới 50. Hồi máu thương nhân trở nên giá trị ở đây.

### Tầng Sâu (11+)

Sát thương quái đáng kể. Luôn Phòng thủ trừ khi có buff. Buff thương nhân gần như bắt buộc. Đừng tham — Rời đi khi HP thấp thay vì mạo hiểm sập.

### Ưu Tiên Lượt Chơi

1. **Lấy buff sớm** — May mắn hoặc Phòng thủ là tốt nhất
2. **Hồi máu khi dưới 50 HP** — bẫy có thể kết liễu bạn
3. **Rời đi trước lượt gặp thứ 5** nếu HP nguy hiểm — luôn có thể quay lại
4. **Chạy khỏi trận** bạn không thể thắng — không xấu hổ khi chạy khỏi Rồng ở 30 HP

## Bảng Lệnh

| Lệnh | Mô Tả |
|-------|--------|
| `/dungeon` | Bắt đầu lượt hầm ngục (thời gian chờ 1 giờ) |
| `/balance` | Xem số dư coin/gem |
| `/wallet view` | Xem số dư star toàn cầu |
