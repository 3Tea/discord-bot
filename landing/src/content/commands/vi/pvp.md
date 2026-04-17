---
title: PvP
command: pvp
category: rpg
description: Đấu người chơi — thách đấu người chơi khác và theo dõi xếp hạng.
cooldown: "5m"
---

## Tổng quan

Lệnh `/pvp` cho phép bạn thách đấu người chơi khác trong trận 1v1 sử dụng nhân vật RPG. Chiến đấu dùng lượt đồng thời với hệ thống xếp hạng Elo.

## Lệnh con

| Lệnh con | Mô tả | Ví dụ |
|-----------|-------|-------|
| `challenge <user>` | Thách đấu người chơi khác | `/pvp challenge @player` |
| `stats` | Xem thống kê thắng/thua và xếp hạng | `/pvp stats` |

## Cách Hoạt Động

### Thách Đấu

Dùng `/pvp challenge @player` để gửi yêu cầu thách đấu. Người chơi mục tiêu phải:
- Có nhân vật RPG (tạo qua `/adventure create`)
- Chấp nhận thách đấu trong thời gian quy định

### Chiến Đấu

Chiến đấu PvP dùng cùng hệ thống chỉ số như hầm ngục, nhưng đấu với người chơi khác. Cả hai người chơi chọn hành động **đồng thời** mỗi lượt — không ai biết đối thủ chọn gì cho đến khi lượt kết thúc.

Các hành động:

| Hành Động | Hiệu Ứng |
|-----------|-----------|
| Tấn công | Đánh thường dựa trên STR/MAG |
| Kỹ năng 1 | Kỹ năng theo nghề (tốn MP) |
| Kỹ năng 2 | Kỹ năng theo nghề (tốn MP) |
| Phòng thủ | Giảm sát thương nhận vào |
| Tuyệt chiêu | Kỹ năng mạnh cho nghề nâng cao (cấp 20+) |

### Hệ Thống Xếp Hạng

PvP sử dụng hệ thống xếp hạng dựa trên Elo. Thắng đối thủ có xếp hạng cao hơn cho nhiều điểm hơn, trong khi thua đối thủ xếp hạng thấp hơn mất nhiều điểm hơn. Xếp hạng phản ánh vị trí cạnh tranh của bạn trong tất cả người chơi.

### Thống Kê

Dùng `/pvp stats` để xem:
- Tổng số thắng và thua
- Tỉ lệ thắng
- Xếp hạng Elo hiện tại
- Lịch sử trận đấu gần đây

> **Mẹo:** Tương quan nghề rất quan trọng — hãy tìm hiểu điểm mạnh và yếu của nghề bạn. Phòng thủ đúng lúc có thể lật ngược thế trận, đặc biệt khi đối đầu với các nghề sát thương bùng nổ như Pháp sư và Sát thủ.
