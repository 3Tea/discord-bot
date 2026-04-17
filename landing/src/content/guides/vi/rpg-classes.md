---
title: "Lớp Nhân Vật RPG"
description: "Hướng dẫn đầy đủ về 6 lớp cơ bản, 12 chuyên môn hóa nâng cao, kỹ năng và chỉ số"
icon: "🎭"
order: 19
relatedCommands: ["adventure"]
---

## Tổng Quan

Lớp nhân vật quyết định chỉ số, kỹ năng và vai trò chiến đấu của bạn. Có **6 lớp cơ bản** khi tạo nhân vật và **12 lớp nâng cao** (2 cho mỗi lớp cơ bản) mở khóa ở cấp 20.

## Lớp Cơ Bản

### Tổng Quan Chỉ Số

| Lớp | HP | STR | DEF | MAG | MAG_DEF | SPD | Chỉ Số Chính |
|-----|-----|-----|-----|-----|---------|-----|-------------|
| ⚔️ Kiếm Sĩ | 120 | 25 | 20 | 5 | 10 | 12 | STR |
| 🛡️ Đỡ Đòn | 180 | 15 | 30 | 5 | 15 | 8 | STR |
| 🔮 Pháp Sư | 80 | 5 | 8 | 30 | 20 | 10 | MAG |
| 🏹 Cung Thủ | 90 | 20 | 12 | 5 | 10 | 18 | STR |
| 🗡️ Sát Thủ | 85 | 22 | 10 | 8 | 12 | 25 | STR |
| 💚 Pháp Sư Hồi | 100 | 8 | 15 | 25 | 22 | 10 | MAG |

### Tốc Độ Phát Triển (mỗi cấp)

| Lớp | HP | STR | DEF | MAG | MAG_DEF | SPD |
|-----|-----|-----|-----|-----|---------|-----|
| ⚔️ Kiếm Sĩ | +12 | +4 | +3 | +1 | +1 | +2 |
| 🛡️ Đỡ Đòn | +18 | +2 | +5 | +1 | +2 | +1 |
| 🔮 Pháp Sư | +8 | +1 | +1 | +5 | +3 | +1 |
| 🏹 Cung Thủ | +9 | +3 | +2 | +1 | +1 | +3 |
| 🗡️ Sát Thủ | +8 | +4 | +1 | +1 | +2 | +4 |
| 💚 Pháp Sư Hồi | +10 | +1 | +2 | +4 | +3 | +1 |

## Vai Trò Và Phong Cách Chơi

### ⚔️ Kiếm Sĩ — Cận Chiến Cân Bằng

Nhân vật toàn diện. Chỉ số tốt toàn diện với kỹ năng vật lý mạnh. Xuất sắc cho người chơi muốn trải nghiệm đơn giản mà không lo về điểm yếu.

**Kỹ năng:**

| Kỹ Năng | Biểu Tượng | MP Cần | Loại | Hiệu Ứng |
|---------|-----------|--------|------|-----------|
| Đòn Mạnh | ⚡ | 20 | Vật lý | Hệ số sát thương 1.8x |
| Xoáy Gió | 🌀 | 30 | Vật lý | Sát thương 1.3x, bỏ qua 30% DEF |

### 🛡️ Đỡ Đòn — Phòng Thủ

Bức tường thành. HP và DEF cao nhất trong game, nhưng chậm nhất. Hoàn hảo cho người chơi muốn sống lâu hơn thay vì burst nhanh.

**Kỹ năng:**

| Kỹ Năng | Biểu Tượng | MP Cần | Loại | Hiệu Ứng |
|---------|-----------|--------|------|-----------|
| Đánh Khiên | 🔨 | 20 | Vật lý | Sát thương 1.4x + tự tăng DEF (20%, 2 lượt) |
| Kiên Cố | 🏰 | 30 | Hồi | Hồi 20% HP tối đa + tự tăng DEF (40%, 1 lượt) |

### 🔮 Pháp Sư — Sát Thương Phép Bùng

Khẩu đại bác thủy tinh. Sát thương phép cao nhất nhưng HP và DEF thấp nhất. Lý tưởng cho người chơi muốn kết thúc trận nhanh bằng phép thuật tàn phá.

**Kỹ năng:**

| Kỹ Năng | Biểu Tượng | MP Cần | Loại | Hiệu Ứng |
|---------|-----------|--------|------|-----------|
| Cầu Lửa | 🔥 | 20 | Phép | Hệ số sát thương 2.0x |
| Mảnh Băng | ❄️ | 30 | Phép | Sát thương 1.5x + giảm SPD địch (30%, 2 lượt) |

### 🏹 Cung Thủ — Tầm Xa Nhanh

Chiến binh chính xác. Tốc độ cao nghĩa là bạn tấn công trước, và kỹ năng xuyên giáp bỏ qua phòng thủ. Tuyệt vời để hạ kẻ thù giáp nặng.

**Kỹ năng:**

| Kỹ Năng | Biểu Tượng | MP Cần | Loại | Hiệu Ứng |
|---------|-----------|--------|------|-----------|
| Bắn Chính Xác | 🎯 | 20 | Vật lý | Sát thương 1.8x, bỏ qua 50% DEF |
| Bắn Nhanh | 💨 | 30 | Vật lý | Sát thương 1.2x, bắn 2 lần |

### 🗡️ Sát Thủ — Chí Mạng & Tốc Độ

Chuyên gia chí mạng. Lớp nhanh nhất với tiềm năng burst cao nhất. Rủi ro cao, phần thưởng cao — HP thấp nhưng có thể hạ gục tức thì bằng đòn chí mạng.

**Kỹ năng:**

| Kỹ Năng | Biểu Tượng | MP Cần | Loại | Hiệu Ứng |
|---------|-----------|--------|------|-----------|
| Đâm Lén | 🗡️ | 20 | Vật lý | Sát thương 2.2x, 30% cơ hội chí mạng (hệ số 3x) |
| Lưỡi Độc | 💀 | 30 | Vật lý | Sát thương 1.0x + nhiễm độc (10% HP/lượt, 3 lượt) |

### 💚 Pháp Sư Hồi — Hỗ Trợ

Kẻ sống sót. Chỉ số phép cân bằng với tự hồi máu. Không phải kẻ giết nhanh nhất, nhưng cực kỳ khó hạ. Tốt nhất cho người chơi thận trọng muốn đi sâu trong hầm ngục.

**Kỹ năng:**

| Kỹ Năng | Biểu Tượng | MP Cần | Loại | Hiệu Ứng |
|---------|-----------|--------|------|-----------|
| Ánh Sáng | ✨ | 20 | Phép | Hệ số sát thương 1.6x |
| Hồi Máu | 💚 | 30 | Hồi | Hồi 30% HP tối đa |

## Lớp Nâng Cao

Ở **cấp 20**, bạn có thể chuyển sang chuyên môn hóa. Mỗi lớp cơ bản có hai nhánh: **tấn công** và **phòng thủ**.

### Yêu Cầu

Để chuyển lớp, bạn cần:
- Cấp nhân vật **20**
- **5x Lõi Sử Thi** + **10x Tinh Chất Hiếm** (nguyên liệu)
- **3.000 Vàng**

Dùng `/adventure advance` để chọn nhánh.

### Bảng Lớp Nâng Cao

| Lớp Cơ Bản | Nhánh Tấn Công | Nhánh Phòng Thủ |
|------------|----------------|-----------------|
| ⚔️ Kiếm Sĩ | Cuồng Chiến ⚔️ | Hiệp Sĩ 🛡️ |
| 🛡️ Đỡ Đòn | Pháo Đài 🏰 | Thánh Kỵ ✨ |
| 🔮 Pháp Sư | Phù Thủy 😈 | Đại Pháp Sư 🔮 |
| 🏹 Cung Thủ | Xạ Thủ 🎯 | Du Hiệp 🌿 |
| 🗡️ Sát Thủ | Bóng Ma 👻 | Ám Ảnh 🌑 |
| 💚 Pháp Sư Hồi | Druid 🌱 | Mục Sư 🙏 |

### Bonus Chỉ Số

Lớp nâng cao nhận bonus chỉ số theo phần trăm (áp dụng trên chỉ số hiện tại):

| Lớp | Bonus Chỉ Số |
|-----|-------------|
| Cuồng Chiến | STR +20%, HP -10% |
| Hiệp Sĩ | DEF +15%, STR +5% |
| Pháo Đài | DEF +25%, SPD -15% |
| Thánh Kỵ | HP +20%, MAG_DEF +15% |
| Phù Thủy | MAG +25%, HP -15% |
| Đại Pháp Sư | MAG +10%, MAG_DEF +20% |
| Xạ Thủ | STR +15%, SPD +10%, DEF -15% |
| Du Hiệp | SPD +20%, DEF +10% |
| Bóng Ma | STR +20%, SPD +10%, HP -20% |
| Ám Ảnh | SPD +15%, MAG +10% |
| Druid | MAG +15%, HP +10% |
| Mục Sư | HP +15%, MAG +10%, MAG_DEF +15% |

### Tuyệt Chiêu

Mỗi lớp nâng cao mở khóa **Tuyệt Chiêu** mạnh mẽ (tốn 50 MP, dùng 1 lần mỗi trận):

| Lớp | Tuyệt Chiêu | Biểu Tượng | Loại | Hiệu Ứng |
|-----|-------------|-----------|------|-----------|
| Cuồng Chiến | Cuồng Nộ Máu | 🩸 | Vật lý | Sát thương 3.0x |
| Hiệp Sĩ | Lời Thề Hộ Vệ | ⚔️ | Vật lý | Sát thương 1.5x + tăng DEF (100%, 3 lượt) |
| Pháo Đài | Tường Đá | 🪨 | Buff | Buff phòng thủ |
| Thánh Kỵ | Khiên Thần | ✨ | Hồi | Hồi 50% HP tối đa |
| Phù Thủy | Thiêu Hồn | 💀 | Phép | Sát thương 4.0x |
| Đại Pháp Sư | Rào Cản Huyền Bí | 🌟 | Phép | Sát thương 2.5x + tăng DEF (100%, 2 lượt) |
| Xạ Thủ | Bắn Đầu | 💥 | Vật lý | Sát thương 5.0x |
| Du Hiệp | Mưa Tên | 🏹 | Vật lý | Sát thương 1.0x, bắn 5 lần |
| Bóng Ma | Đòn Bóng Tối | 🌀 | Vật lý | Sát thương 3.5x, bỏ qua 100% DEF |
| Ám Ảnh | Mây Độc | ☠️ | Vật lý | Nhiễm độc (20% HP/lượt, 4 lượt) |
| Druid | Cuồng Nộ Thiên Nhiên | 🌿 | Phép | Sát thương 2.5x + hồi 25% HP + độc (10%, 3 lượt) |
| Mục Sư | Hồi Sinh | 💫 | Buff | Tự hồi sinh khi HP về 0 |

## Nên Chọn Lớp Nào?

### Cho Người Mới

**Kiếm Sĩ** hoặc **Đỡ Đòn** — cả hai đều khoan dung với chỉ số cơ bản mạnh. Kiếm Sĩ gây sát thương nhiều hơn, Đỡ Đòn sống lâu hơn. Chọn lớp nào cũng tốt.

### Cho Người Thích Sát Thương

**Pháp Sư** cho sát thương phép cao ổn định, **Sát Thủ** cho đòn chí mạng bùng. Pháp Sư an toàn hơn vì phép bỏ qua DEF vật lý; Sát Thủ mạo hiểm hơn nhưng có thể hạ boss tức thì bằng chí mạng.

### Cho Sống Sót

**Pháp Sư Hồi** là lớp trâu nhất lâu dài — tự hồi máu cộng sát thương phép ổn nghĩa là hiếm khi chết. **Đỡ Đòn** phòng thủ thuần nhưng thiếu tự hồi.

### Cho Tốc Độ

**Sát Thủ** và **Cung Thủ** là nhanh nhất. Tốc độ quyết định thứ tự lượt trong PvP và giúp bạn hành động trước kẻ thù trong hầm ngục. Cung Thủ có sát thương ổn định hơn, Sát Thủ có tiềm năng burst.

### Cho PvP

**Sát Thủ** (nhánh Bóng Ma) cho hạ gục nhanh, **Pháp Sư** (nhánh Phù Thủy) cho sát thương đơn đòn cao nhất, hoặc **Pháp Sư Hồi** (nhánh Mục Sư) cho tuyệt chiêu Hồi Sinh cho bạn mạng thứ hai trong PvP.

## Bảng Lệnh

| Lệnh | Mô Tả |
|-------|--------|
| `/adventure create` | Tạo nhân vật và chọn lớp |
| `/adventure profile` | Xem chỉ số, lớp, và trang bị hiện tại |
| `/adventure advance` | Chuyển lớp nâng cao ở cấp 20 |
