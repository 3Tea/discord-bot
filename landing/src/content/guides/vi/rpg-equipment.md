---
title: "Trang Bị & Chế Tạo"
description: "Làm chủ hệ thống trang bị — ô trang bị, độ hiếm, công thức chế tạo, rương, và farm nguyên liệu"
icon: "🛡️"
order: 20
relatedCommands: ["adventure", "dungeon"]
---

## Tổng Quan

Trang bị là cách chính để tăng sức mạnh nhân vật RPG. Mỗi món đồ cung cấp bonus chỉ số cộng vào chỉ số cơ bản. Trang bị tốt hơn tạo ra khác biệt lớn hơn cả lên cấp — một nhân vật trang bị tốt ở cấp 15 có thể mạnh hơn nhân vật trang bị kém ở cấp 25.

## Ô Trang Bị

Nhân vật có **6 ô trang bị**:

| Ô | Chỉ Số Chính | Ghi Chú |
|---|-------------|---------|
| Vũ Khí | STR hoặc MAG | Giới hạn theo lớp (mỗi lớp có loại vũ khí riêng) |
| Khiên | DEF, MAG_DEF | Giới hạn theo lớp (Sát Thủ không mang được khiên) |
| Mũ | DEF, MAG_DEF | Dùng chung |
| Giáp | DEF, HP | Dùng chung |
| Giày | SPD, DEF | Dùng chung |
| Phụ Kiện | Đa dạng | Dùng chung |

### Loại Vũ Khí Theo Lớp

| Lớp | Loại Vũ Khí |
|-----|------------|
| Kiếm Sĩ | Kiếm, Đại Kiếm |
| Đỡ Đòn | Chùy, Búa |
| Pháp Sư | Gậy, Đũa Phép |
| Cung Thủ | Cung, Nỏ |
| Sát Thủ | Dao, Katana |
| Pháp Sư Hồi | Gậy, Quyền Trượng |

### Loại Khiên Theo Lớp

| Lớp | Loại Khiên |
|-----|-----------|
| Kiếm Sĩ | Khiên |
| Đỡ Đòn | Khiên Nặng |
| Pháp Sư | Sách Phép |
| Cung Thủ | Ống Tên |
| Sát Thủ | (không có) |
| Pháp Sư Hồi | Sách Thánh |

## Cấp Độ Hiếm

Trang bị có **6 cấp độ hiếm**, mỗi cấp có hệ số chỉ số áp dụng lên chỉ số cơ bản của vật phẩm:

| Độ Hiếm | Biểu Tượng | Màu | Hệ Số Chỉ Số | Tỉ Lệ Rơi |
|---------|-----------|-----|-------------|-----------|
| Thường | ⬜ | Xám | 1.0x | 45% |
| Không Thường | 🟩 | Xanh lá | 1.3x | 25% |
| Hiếm | 🟦 | Xanh dương | 1.6x | 15% |
| Sử Thi | 🟪 | Tím | 2.0x | 10% |
| Huyền Thoại | 🟨 | Vàng | 2.5x | 4% |
| Thần Thoại | 🟥 | Đỏ | 3.2x | 1% |

> **Mẹo:** Hệ số chỉ số cực lớn ở cấp cao. Vũ khí Thần Thoại có chỉ số gấp 3.2 lần so với Thường. Ngay cả nâng một cấp hiếm cũng đáng đầu tư.

## Cách Nhận Trang Bị

### Rơi Từ Hầm Ngục

Quái vật và kho báu trong hầm ngục có thể rơi trang bị:

| Nguồn | Tỉ Lệ Rơi | Ghi Chú |
|-------|-----------|---------|
| Hạ quái | 10% | Trận thường |
| Rương kho báu | 15% | Không cần chiến đấu |
| Hạ boss | 50% | Mỗi 5 tầng, tỉ lệ cao hơn nhiều |

Độ hiếm trang bị rơi theo bảng tỉ lệ chuẩn — đa số sẽ là Thường/Không Thường. Boss là nguồn đồ hiếm tốt nhất.

### Rơi Ưu Tiên Theo Lớp

Trang bị rơi **ưu tiên theo lớp** của bạn. Có 70% cơ hội rơi đúng lớp, và ô trang bị được ưu tiên dựa trên lớp:

| Lớp | Ô Ưu Tiên (40% / 35% / 25%) |
|-----|-------------------------------|
| Kiếm Sĩ | Vũ Khí, Giáp, Khiên |
| Đỡ Đòn | Khiên, Giáp, Mũ |
| Pháp Sư | Vũ Khí, Phụ Kiện, Khiên |
| Cung Thủ | Vũ Khí, Giày, Phụ Kiện |
| Sát Thủ | Vũ Khí, Giày, Phụ Kiện |
| Pháp Sư Hồi | Vũ Khí, Khiên, Mũ |

### Chế Tạo

Dùng `/adventure craft` để tạo trang bị từ nguyên liệu và Vàng. Xem phần chế tạo bên dưới.

### Rương

Dùng `/adventure crate` để mở rương nhận trang bị ngẫu nhiên. Rương có thể mua từ cửa hàng hoặc nhận từ hầm ngục.

## Công Thức Chế Tạo

Chế tạo trang bị theo độ hiếm bằng nguyên liệu thu từ hầm ngục:

| Độ Hiếm Mục Tiêu | Nguyên Liệu Cần | Giá Vàng |
|-------------------|-----------------|----------|
| ⬜ Thường | 5x Mảnh Thường | 50 |
| 🟩 Không Thường | 3x Mảnh Không Thường + 5x Mảnh Thường | 150 |
| 🟦 Hiếm | 3x Tinh Chất Hiếm + 5x Mảnh Không Thường | 500 |
| 🟪 Sử Thi | 3x Lõi Sử Thi + 5x Tinh Chất Hiếm | 1.500 |
| 🟨 Huyền Thoại | 3x Linh Hồn Huyền Thoại + 5x Lõi Sử Thi | 5.000 |
| 🟥 Thần Thoại | 3x Trái Tim Thần Thoại + 5x Linh Hồn Huyền Thoại | 15.000 |

Trang bị chế tạo phù hợp lớp và ưu tiên ô giống trang bị rơi từ hầm ngục.

## Nguyên Liệu

Sáu cấp nguyên liệu, mỗi loại rơi từ độ sâu hầm ngục khác nhau:

| Nguyên Liệu | Biểu Tượng | Tầng Tối Thiểu | Tỉ Lệ Rơi | Số Lượng |
|-------------|-----------|----------------|-----------|----------|
| Mảnh Thường | ⬜ | Tầng 1 | 60% | 2–4 |
| Mảnh Không Thường | 🟩 | Tầng 3 | 35% | 1–3 |
| Tinh Chất Hiếm | 🟦 | Tầng 6 | 20% | 1–2 |
| Lõi Sử Thi | 🟪 | Tầng 10 | 10% | 1 |
| Linh Hồn Huyền Thoại | 🟨 | Tầng 15 | 5% | 1 |
| Trái Tim Thần Thoại | 🟥 | Tầng 20 | 2% | 1 |

Nguyên liệu rơi từ hạ quái (30% cơ bản) và rương kho báu (50% cơ bản). Boss đảm bảo rơi nguyên liệu.

> **Mẹo:** Nếu cần nguyên liệu cấp cụ thể, farm hầm ngục ở hoặc trên tầng tối thiểu cho nguyên liệu đó. Tầng 10+ là điểm ngọt cho Lõi Sử Thi.

## Rương

Ba cấp rương với phân bố độ hiếm khác nhau:

### Rương Đồng 🟫 (200 Vàng)

| Độ Hiếm | Tỉ Lệ |
|---------|--------|
| Thường | 50% |
| Không Thường | 35% |
| Hiếm | 15% |

### Rương Bạc 🥈 (800 Vàng)

| Độ Hiếm | Tỉ Lệ |
|---------|--------|
| Không Thường | 40% |
| Hiếm | 35% |
| Sử Thi | 25% |

### Rương Vàng 🥇 (2.500 Vàng)

| Độ Hiếm | Tỉ Lệ |
|---------|--------|
| Hiếm | 35% |
| Sử Thi | 30% |
| Huyền Thoại | 25% |
| Thần Thoại | 10% |

### Rương Rơi Từ Hầm Ngục

Rương cũng có thể rơi trong hầm ngục:

| Nguồn | Đồng | Bạc | Vàng |
|-------|------|-----|------|
| Hạ quái | 5% | — | — |
| Rương kho báu | 15% | 5% | — |
| Hạ boss | — | 50% | 15% |

## Mẹo Chiến Lược

### Chế Tạo Gì Trước

1. **Vũ Khí** — tăng sát thương lớn nhất, ảnh hưởng trực tiếp mọi trận đấu
2. **Giáp** — bonus DEF + HP giúp sống lâu hơn
3. **Giày** — SPD quyết định thứ tự lượt, quan trọng cho PvP và né đòn

### Khi Nào Dùng Rương

- **Rương Đồng** đầu game (cấp 1–10) để nâng cấp nhanh
- **Rương Bạc** giữa game (cấp 10–20) khi cần đồ Sử Thi để chuyển lớp
- **Rương Vàng** cuối game — cách đáng tin cậy duy nhất để có đồ Huyền Thoại/Thần Thoại ngoài chế tạo

### Farm Nguyên Liệu

- Chạy hầm ngục đều đặn — tầng 6+ cho Tinh Chất Hiếm, tầng 10+ cho Lõi Sử Thi
- Boss (mỗi 5 tầng) đảm bảo rơi nguyên liệu và có tỉ lệ rơi trang bị tốt nhất
- Đừng lãng phí nguyên liệu cho đồ Thường/Không Thường khi đã farm được nguyên liệu Hiếm+

### Quản Lý Kho

- Giữ mọi nguyên liệu — luôn cần cho chế tạo cấp cao
- Trang bị đồ tốt nhất ngay — không có lợi ích gì khi để dành
- Bán trang bị độ hiếm thấp trùng lặp khi đã có đồ tốt hơn ở ô đó

## Bảng Lệnh

| Lệnh | Mô Tả |
|-------|--------|
| `/adventure inventory` | Xem tất cả trang bị và nguyên liệu |
| `/adventure equip` | Trang bị vật phẩm từ kho |
| `/adventure unequip` | Tháo trang bị về kho |
| `/adventure craft` | Chế tạo trang bị từ nguyên liệu |
| `/adventure crate` | Mở rương nhận trang bị ngẫu nhiên |
| `/adventure shop` | Mua rương bằng Vàng |
| `/adventure profile` | Xem trang bị đang mang |
| `/dungeon` | Farm nguyên liệu và trang bị |
