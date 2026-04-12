---
title: Hầm ngục
command: dungeon
category: economy
description: Khám phá hầm ngục với chiến đấu, bẫy, kho báu và thương nhân NPC qua nhiều trận liên tiếp.
cooldown: "1h"
---

## Cách dùng

```
/dungeon
```

## Cách hoạt động

Bước vào hầm ngục và đối mặt tối đa **5 lượt gặp** mỗi lần chơi. Mỗi lượt có thể là trận chiến quái vật, rương kho báu, bẫy, hoặc thương nhân NPC. HP của bạn (100) được giữ nguyên trong suốt lượt chơi, hãy quản lý khéo léo.

### Các Loại Lượt Gặp

| Lượt Gặp | Tỉ Lệ | Điều Gì Xảy Ra |
|-----------|--------|----------------|
| Quái vật | 50% | Chiến đấu theo lượt (tối đa 3 vòng) |
| Kho báu | 25% | Thưởng coin/gem ngay lập tức, tiến tầng |
| Bẫy | 15% | Mất HP và coin, giữ nguyên tầng |
| Thương nhân | 10% | Mua hồi máu, buff, hoặc đổi coin lấy gem |

### Chiến Đấu

Chiến đấu quái vật bằng các nút hành động:

| Hành Động | Hiệu Ứng |
|-----------|-----------|
| ⚔️ Tấn công | Sát thương toàn bộ cho quái, nhận toàn bộ sát thương |
| 🛡️ Phòng thủ | 70% sát thương cho quái, chỉ nhận 50% sát thương |
| 🏃 Chạy | Thoát — không thưởng, không phạt |

Chiến đấu kéo dài tối đa **3 lượt**. Nếu không hạ được quái trong thời gian, bạn tự động thoát.

**Thắng:** 50–150 coin + bonus tầng, 10% cơ hội gem, 3% cơ hội rơi star.

**Thua (HP về 0):** Mất 100–200 coin, tầng reset về checkpoint. Lượt chơi kết thúc.

### Quái Vật

| Cấp | Tầng | Quái |
|-----|------|------|
| Cấp 1 | 1–5 | Chuột 🐀, Dơi 🦇, Slime 🟢, Goblin 👺, Nhện 🕷️ |
| Cấp 2 | 6–10 | Xương 💀, Zombie 🧟, Sói 🐺, Orc 👹, Ma 👻 |
| Cấp 3 | 11+ | Rồng 🐉, Quỷ 😈, Pháp sư 🧙, Thủy xà 🐍, Titan ⚡ |

### Thương Nhân NPC

Thương nhân cung cấp **một** dịch vụ mỗi lần gặp:

| Dịch Vụ | Chi Phí | Hiệu Ứng |
|----------|---------|-----------|
| 🧪 Hồi máu | 80 + tầng × 5 coin | Hồi 30 + tầng × 2 HP (tối đa 100) |
| ⚔️ Buff | 100 + tầng × 5 coin | Buff ngẫu nhiên cho các lượt còn lại |
| 💱 Đổi tiền | 300–600 coin | 1 gem |

**Loại buff:** Tấn công (sát thương ×1.3), Phòng thủ (nhận sát thương ×0.7), hoặc May mắn (nhiều kho báu hơn, ít bẫy hơn).

### Tiến Tầng

Tầng tăng khi thắng quái và tìm kho báu. Checkpoint tự động lưu tại **tầng số nguyên tố** (giống `/mine`). Khi chết, bạn quay về checkpoint cuối cùng.

### Luồng Chơi

Sau mỗi lượt gặp bạn chọn **Tiếp tục** (lượt tiếp theo) hoặc **Rời đi** (thoát với phần thưởng). Lượt chơi kết thúc khi bạn rời đi, hoàn thành 5 lượt, chết, hoặc hết 15 phút.

> **Mẹo:** Đừng tham lam — nếu HP thấp sau trận chiến khó, hãy cân nhắc rời đi để giữ phần thưởng. Hồi máu của thương nhân có thể cứu cả lượt chơi nếu bạn may mắn gặp được!
