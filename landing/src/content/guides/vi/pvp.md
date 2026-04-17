---
title: "PvP Đấu Trường"
description: "Thách đấu người chơi khác trong chiến đấu đồng thời — hành động, chiến lược, và hệ thống xếp hạng"
icon: "⚔️"
order: 22
relatedCommands: ["pvp", "adventure"]
---

## Tổng Quan

PvP cho phép bạn thách đấu người chơi khác trong trận 1v1 sử dụng chỉ số và kỹ năng nhân vật RPG. Cả hai người chơi chọn hành động đồng thời mỗi lượt, biến nó thành trò chơi dự đoán và chiến lược thay vì thuần chỉ số.

## Cách Thách Đấu

Dùng `/pvp challenge @user` để thách đấu người chơi khác. Cả hai phải có nhân vật RPG (tạo qua `/adventure create`). Người bị thách có 60 giây để chấp nhận hoặc từ chối.

**Yêu cầu:**
- Cả hai người chơi phải có nhân vật RPG
- Không ai đang trong trận PvP
- Thời gian chờ 5 phút giữa các trận

## Cơ Chế Chiến Đấu

### Lượt Đồng Thời

Khác với hầm ngục nơi bạn hành động trước, PvP dùng **lượt đồng thời**. Cả hai người chọn hành động bí mật, sau đó hành động thực hiện cùng lúc. Tốc độ (SPD) quyết định ai đi trước khi thứ tự quan trọng (VD: nếu cả hai cùng chết, người nhanh hơn thắng).

### Số Lượt Tối Đa

Trận đấu kéo dài tối đa **10 lượt**. Nếu không ai bị hạ, người có **phần trăm HP cao hơn** thắng. Nếu cùng HP%, đó là hòa.

### Các Hành Động

| Hành Động | MP Cần | Hiệu Ứng |
|-----------|--------|-----------|
| ⚔️ Tấn Công | 0 | Đòn tấn công cơ bản dùng chỉ số chính |
| Kỹ Năng 1 | 20 MP | Kỹ năng đầu tiên của lớp |
| Kỹ Năng 2 | 30 MP | Kỹ năng thứ hai của lớp |
| 🛡️ Phòng Thủ | 0 | Nhận 50% sát thương + hồi 5% HP tối đa + hồi thêm 15 MP |
| Tuyệt Chiêu | 50 MP | Chỉ lớp nâng cao, 1 lần mỗi trận |

> **Mẹo:** Nếu không đủ MP cho kỹ năng, hành động tự động chuyển thành Tấn Công cơ bản. Phòng Thủ miễn phí và hồi thêm MP — dùng nó để chuẩn bị cho lượt kỹ năng lớn.

### Hệ Số Sát Thương PvP

Mọi sát thương trong PvP nhân với **0.6x** so với hầm ngục. Điều này làm trận đấu kéo dài hơn và chiến lược hơn, thay vì hạ gục tức thì.

### Hệ Thống MP

- MP cơ bản: 50 + (cấp x 5)
- Hồi MP mỗi lượt: 5 (tự động)
- Bonus hồi MP khi Phòng Thủ: +15 (tổng 20 MP khi phòng thủ)
- Kỹ năng tốn 20/30/50 MP

### Hiệu Ứng Trạng Thái

Kỹ năng gây hiệu ứng trong hầm ngục hoạt động giống trong PvP:

| Hiệu Ứng | Mô Tả |
|-----------|--------|
| Tăng DEF | Tăng DEF theo phần trăm chỉ định |
| Giảm SPD | Giảm SPD đối thủ |
| Nhiễm Độc | Gây % HP tối đa mỗi lượt |

### Tự Phòng Thủ & Bỏ Cuộc

Nếu người chơi không chọn hành động trong thời hạn, họ tự động **Phòng Thủ**. Ba lần tự phòng thủ liên tiếp tính là **bỏ cuộc**, kết thúc trận thua.

## Phần Thưởng

### Thắng

| Phần Thưởng | Số Lượng |
|------------|----------|
| Vàng | 100 |
| GP | 20 |
| Rating | +25 |

### Thua

| Phần Thưởng | Số Lượng |
|------------|----------|
| GP | 5 |
| Rating | -10 (tối thiểu 0) |

### Hòa

Cả hai nhận 5 GP. Không thay đổi Vàng hay rating.

## Hệ Thống Xếp Hạng

PvP có hệ thống rating đơn giản bắt đầu từ 0. Thắng được **+25 rating**, thua mất **-10 rating** (không bao giờ dưới 0). Kiểm tra rating với `/pvp stats`.

Hệ thống rating thưởng cho việc chơi PvP tích cực — ngay cả tỉ lệ thắng 50% cũng sẽ leo rating theo thời gian.

## Mẹo Chiến Lược

### Chiến Lược Chung

1. **Mở đầu bằng Phòng Thủ** để tích MP, rồi dùng kỹ năng lượt 2–3
2. **Theo dõi MP đối thủ** — nếu họ vừa dùng kỹ năng lớn, có lẽ lượt sau không đủ dùng tiếp
3. **Dự đoán lượt Phòng Thủ** — nếu đối thủ HP thấp, họ sẽ có khả năng Phòng Thủ. Dùng kỹ năng để xuyên qua giảm sát thương
4. **Tốc độ quan trọng** — người nhanh hơn hành động trước khi cả hai cùng chết

### Mẹo Đấu Theo Lớp

- **vs Đỡ Đòn**: Dùng kỹ năng xuyên giáp (Cung Thủ/Kiếm Sĩ) hoặc sát thương phép (Pháp Sư) để vượt DEF cao
- **vs Sát Thủ**: Phòng Thủ thường xuyên để sống qua burst. Độc sẽ hết — sống lâu hơn họ
- **vs Pháp Sư Hồi**: Gây áp lực bằng sát thương liên tục. Đừng để họ thoải mái hồi máu mỗi lượt
- **vs Pháp Sư**: Rush nhanh — HP thấp nghĩa là không thể chịu sát thương kéo dài. Đòn vật lý bỏ qua MAG_DEF
- **vs Kiếm Sĩ**: Trận cân. Kỹ năng lớp vượt trội hoặc dùng Tuyệt Chiêu thường quyết định

### Tuyệt Chiêu Lớp Nâng Cao Trong PvP

- **Hồi Sinh của Mục Sư** là tuyệt chiêu PvP mạnh nhất — cho bạn mạng thứ hai
- **Bắn Đầu của Xạ Thủ** (sát thương 5.0x) có thể kết thúc trận ngay
- **Đòn Bóng Tối của Bóng Ma** bỏ qua 100% DEF — hủy diệt Đỡ Đòn
- **Khiên Thần của Thánh Kỵ** hồi 50% HP — gấp đôi HP còn lại
- **Thiêu Hồn của Phù Thủy** (sát thương phép 4.0x) tan chảy mọi lớp không phải Đỡ Đòn

## Bảng Lệnh

| Lệnh | Mô Tả |
|-------|--------|
| `/pvp challenge @user` | Thách đấu người chơi |
| `/pvp stats` | Xem thành tích và rating PvP |
| `/adventure profile` | Kiểm tra chỉ số nhân vật trước khi đấu |
