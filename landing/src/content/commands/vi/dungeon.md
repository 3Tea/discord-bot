---
title: Hầm ngục
command: dungeon
category: rpg
description: Khám phá hầm ngục với chiến đấu RPG dựa trên chỉ số, kỹ năng nghề, boss và chơi nhóm để nhận Gold, EXP và trang bị.
cooldown: "1h"
---

## Cách dùng

```
/dungeon
/dungeon team
```

## Lệnh con

| Lệnh con | Mô tả |
|-----------|-------|
| `/dungeon` | Vào hầm ngục chơi đơn |
| `/dungeon team` | Tạo hoặc tham gia hầm ngục nhóm (2–4 người) |

> **Yêu cầu nhân vật RPG.** Dùng `/adventure create` trước nếu chưa có.

## Cách hoạt động

Bước vào hầm ngục và đối mặt tối đa **5 lượt gặp** mỗi lần chơi. Mỗi lượt có thể là trận chiến quái vật, rương kho báu, bẫy, hoặc thương nhân NPC. HP nhân vật của bạn được giữ nguyên trong suốt lượt chơi, hãy quản lý khéo léo.

### Các Loại Lượt Gặp

| Lượt Gặp | Tỉ Lệ | Điều Gì Xảy Ra |
|-----------|--------|----------------|
| Quái vật | 50% | Chiến đấu dựa trên chỉ số với kỹ năng nghề |
| Kho báu | 25% | Gold, nguyên liệu hoặc trang bị, tiến tầng |
| Bẫy | 15% | Mất HP, giữ nguyên tầng |
| Thương nhân | 10% | Mua hồi máu, buff, hoặc đổi Gold lấy gem |

### Chiến Đấu

Chiến đấu quái vật bằng các nút hành động gắn liền với nghề RPG:

| Hành Động | Hiệu Ứng |
|-----------|-----------|
| ⚔️ Tấn công | Đánh thường dựa trên STR/MAG |
| 🎯 Kỹ năng 1 | Kỹ năng theo nghề (tốn MP) |
| 🔥 Kỹ năng 2 | Kỹ năng theo nghề (tốn MP) |
| 🛡️ Phòng thủ | Giảm sát thương nhận vào |
| 🏃 Chạy | Thoát — không thưởng, không phạt |
| 💥 Tuyệt chiêu | Kỹ năng mạnh cho nghề nâng cao (cấp 20+) |

MP bắt đầu ở 50 + cấp x 5. Kỹ năng tốn MP — hãy quản lý tài nguyên qua các lượt gặp.

**Thắng:** Gold + EXP + nguyên liệu + cơ hội rơi trang bị + rương. Boss mỗi 5 tầng.

**Thua (HP về 0):** Tầng reset về checkpoint. Lượt chơi kết thúc.

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
| 🧪 Hồi máu | 80 + tầng x 5 Gold | Hồi HP theo độ sâu tầng |
| ⚔️ Buff | 100 + tầng x 5 Gold | Buff ngẫu nhiên cho các lượt còn lại |
| 💱 Đổi tiền | 300–600 Gold | 1 gem |

**Loại buff:** Tấn công (sát thương x1.3), Phòng thủ (nhận sát thương x0.7), hoặc May mắn (nhiều kho báu hơn, ít bẫy hơn).

### Tiến Tầng

Tầng tăng khi thắng quái và tìm kho báu. Checkpoint tự động lưu tại **tầng số nguyên tố** (giống `/mine`). Khi chết, bạn quay về checkpoint cuối cùng.

### Luồng Chơi

Sau mỗi lượt gặp bạn chọn **Tiếp tục** (lượt tiếp theo) hoặc **Rời đi** (thoát với phần thưởng). Lượt chơi kết thúc khi bạn rời đi, hoàn thành 5 lượt, chết, hoặc hết 15 phút.

### Hầm Ngục Nhóm

Dùng `/dungeon team` để tạo hoặc tham gia nhóm 2–4 người. Tất cả thành viên phải có nhân vật RPG. Quái vật được tăng sức mạnh theo số người. Lượt chơi đồng thời — tất cả người chơi chọn hành động cùng lúc.

> **Mẹo:** Đừng tham lam — nếu HP thấp sau trận chiến khó, hãy cân nhắc rời đi để giữ phần thưởng. Hồi máu của thương nhân có thể cứu cả lượt chơi nếu bạn may mắn gặp được!
