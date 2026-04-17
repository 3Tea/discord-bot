---
title: "Bắt Đầu RPG"
description: "Khởi đầu cuộc phiêu lưu — tạo nhân vật, chọn lớp nhân vật, và khám phá hầm ngục"
icon: "⚔️"
order: 18
relatedCommands: ["adventure", "dungeon", "guild"]
---

## Tổng Quan

Hệ thống RPG là một cuộc phiêu lưu giả tưởng hoàn chỉnh được tích hợp trong 3AT. Tạo nhân vật, chọn lớp, chiến đấu với quái vật trong hầm ngục dựa trên chỉ số, thu thập trang bị, chế tạo đồ, và leo hạng trong Hội Phiêu Lưu. Mọi thứ sử dụng đồng tiền **Vàng (Gold)** riêng biệt (không phải coin/gem của server), nên tiến trình RPG của bạn áp dụng toàn cầu trên mọi server.

## Bước 1: Tạo Nhân Vật

Chạy `/adventure create` và chọn một trong 6 lớp cơ bản. Nhân vật bắt đầu ở cấp 1 với vũ khí khởi đầu và áo giáp da.

> **Mẹo:** Bạn không thể đổi lớp cơ bản sau khi tạo, nhưng ở cấp 20 bạn có thể chuyển sang một trong hai chuyên môn hóa. Chọn dựa trên phong cách chơi bạn yêu thích.

## Bước 2: Chọn Lớp Nhân Vật

Mỗi lớp có chỉ số, kỹ năng và vai trò khác nhau trong chiến đấu:

| Lớp | Biểu Tượng | Vai Trò | Sát Thương Chính | Điểm Mạnh |
|-----|-----------|---------|-----------------|-----------|
| Kiếm Sĩ | ⚔️ | Cận chiến cân bằng | STR | Chỉ số đồng đều, phù hợp người mới |
| Đỡ Đòn | 🛡️ | Phòng thủ | STR | HP và DEF cao nhất, sống dai |
| Pháp Sư | 🔮 | Sát thương phép bùng | MAG | Sát thương phép cao nhất, mỏng giáp |
| Cung Thủ | 🏹 | Tầm xa nhanh | STR | Tốc độ cao, kỹ năng xuyên giáp |
| Sát Thủ | 🗡️ | Chí mạng & Tốc độ | STR | Lớp nhanh nhất, chuyên gia chí mạng |
| Pháp Sư Hồi | 💚 | Hỗ trợ | MAG | Tự hồi máu, phòng thủ cân bằng |

Để xem bảng chỉ số đầy đủ, kỹ năng, và lớp nâng cao, hãy xem [Hướng Dẫn Lớp RPG](/vi/guide/rpg-classes).

## Bước 3: Khám Phá Hầm Ngục

Chạy `/dungeon` để vào. Mỗi lượt chơi cho bạn tối đa 5 lượt gặp — quái vật, kho báu, bẫy và thương nhân. Chiến đấu dựa trên chỉ số và sử dụng chỉ số thực cùng trang bị của nhân vật.

### Hành Động Chiến Đấu

| Hành Động | MP Cần | Hiệu Ứng |
|-----------|--------|-----------|
| ⚔️ Tấn công | 0 | Đòn tấn công cơ bản dùng chỉ số chính |
| Kỹ năng 1 | 20 MP | Kỹ năng riêng lớp (VD: Đòn Mạnh, Cầu Lửa) |
| Kỹ năng 2 | 30 MP | Kỹ năng tiện ích riêng lớp |
| 🛡️ Phòng thủ | 0 | Nhận 50% sát thương, hồi +15 MP |
| 🏃 Chạy | 0 | Thoát khỏi trận |
| Tuyệt chiêu | 50 MP | Chỉ lớp nâng cao, năng lực mạnh dùng 1 lần/trận |

Hạ quái vật nhận **Vàng, EXP, nguyên liệu, và trang bị**. Boss xuất hiện mỗi 5 tầng với chỉ số gấp 2 và phần thưởng gấp 3.

Để xem hướng dẫn hầm ngục đầy đủ, hãy xem [Hướng Dẫn Hầm Ngục](/vi/guide/dungeon).

## Bước 4: Quản Lý Trang Bị

Dùng `/adventure inventory` để xem đồ và nguyên liệu. Các lệnh trang bị chính:

| Lệnh | Chức Năng |
|-------|-----------|
| `/adventure equip` | Trang bị vật phẩm từ kho |
| `/adventure unequip` | Tháo trang bị về kho |
| `/adventure craft` | Chế tạo trang bị từ nguyên liệu + Vàng |
| `/adventure crate` | Mở rương nhận trang bị ngẫu nhiên |
| `/adventure shop` | Mua rương bằng Vàng |

Trang bị có 6 cấp độ hiếm từ Thường (chỉ số 1x) đến Huyền Thoại (chỉ số 3.2x). Đồ hiếm hơn rơi ở tầng hầm ngục sâu hơn. Xem [Hướng Dẫn Trang Bị & Chế Tạo](/vi/guide/rpg-equipment) để biết chi tiết.

## Bước 5: Tham Gia Hội Phiêu Lưu

Chạy `/guild register` để tham gia. Hội cho bạn:

- **Nhiệm vụ hàng ngày** để nhận Vàng, EXP, và Điểm Hội (GP)
- **Thăng hạng** từ F (Tân binh) đến Huyền Thoại
- **Sự kiện chi hội** nếu admin server thiết lập

Hoàn thành nhiệm vụ và thăng hạng mở khóa phần thưởng tốt hơn. Xem [Hướng Dẫn Hội Phiêu Lưu](/vi/guide/adventurer-guild).

## Tiếp Theo?

Khi đã quen với cơ bản, hãy khám phá các hệ thống này:

- **[Lớp RPG](/vi/guide/rpg-classes)** — Chi tiết tất cả 6 lớp cơ bản và 12 chuyên môn hóa nâng cao
- **[Trang Bị & Chế Tạo](/vi/guide/rpg-equipment)** — Công thức chế tạo, cấp rương, farm nguyên liệu
- **[Hội Phiêu Lưu](/vi/guide/adventurer-guild)** — Hạng, nhiệm vụ, chi hội, sự kiện hàng tháng
- **[PvP](/vi/guide/pvp)** — Thách đấu người chơi khác trong chiến đấu đồng thời
- **[Hầm Ngục](/vi/guide/dungeon)** — Chiến thuật hầm ngục nâng cao và hầm ngục đội

## Mẹo Cho Người Mới

1. **Làm nhiệm vụ hội hàng ngày** — nguồn Vàng và EXP ổn định nhất
2. **Đừng bán nguyên liệu** — bạn sẽ cần chúng để chế đồ tốt hơn
3. **Nâng cấp vũ khí trước** — ảnh hưởng lớn nhất đến hiệu quả chiến đấu
4. **Phòng thủ khi HP thấp** — hồi MP từ phòng thủ cho phép dùng kỹ năng lượt sau
5. **Tiết kiệm Vàng cho rương** — rương Bạc và Vàng cho trang bị tốt hơn nhiều so với Đồng
6. **Kiểm tra hồ sơ** bằng `/adventure profile` để theo dõi cấp, chỉ số, và trang bị

## Bảng Lệnh

| Lệnh | Mô Tả |
|-------|--------|
| `/adventure create` | Tạo nhân vật RPG |
| `/adventure profile` | Xem chỉ số và trang bị nhân vật |
| `/adventure equip` | Trang bị vật phẩm |
| `/adventure unequip` | Tháo trang bị |
| `/adventure inventory` | Xem kho đồ và nguyên liệu |
| `/adventure craft` | Chế tạo trang bị từ nguyên liệu |
| `/adventure crate` | Mở rương nhận đồ ngẫu nhiên |
| `/adventure shop` | Mua rương bằng Vàng |
| `/adventure advance` | Chuyển lớp nâng cao (cấp 20+) |
| `/dungeon` | Vào hầm ngục |
| `/guild register` | Tham gia Hội Phiêu Lưu |
| `/pvp challenge` | Thách đấu người chơi khác |
