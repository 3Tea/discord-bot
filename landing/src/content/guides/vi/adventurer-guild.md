---
title: "Hội Phiêu Lưu"
description: "Hướng dẫn đầy đủ về Hội Phiêu Lưu — hạng, nhiệm vụ, chi hội, và sự kiện thi đấu"
icon: "🏛️"
order: 21
relatedCommands: ["guild", "guild-admin"]
---

## Tổng Quan

Hội Phiêu Lưu là hệ thống tiến trình ngoài việc lên cấp nhân vật. Đăng ký để nhận nhiệm vụ hàng ngày, kiếm Điểm Hội (GP), leo qua 10 hạng, và thi đấu trong sự kiện hàng tháng. Nếu admin server thiết lập Chi Hội, bạn có thể tham gia nhiệm vụ hợp tác hàng tuần và thi đấu server chọi server.

## Bắt Đầu

Chạy `/guild register` để gia nhập Hội Phiêu Lưu. Bạn bắt đầu ở **Hạng F (Tân Binh)** với 0 GP. Từ đó, hoàn thành nhiệm vụ để kiếm GP và thăng hạng.

Dùng `/guild profile` để xem hạng, GP, tiến trình nhiệm vụ, và chỉ số.

## Các Hạng

Có **10 hạng**, mỗi hạng yêu cầu nhiều GP hơn, cấp nhân vật cao hơn, và nhiều boss kills hơn:

| Hạng | Danh Hiệu | Biểu Tượng | GP Cần | Cấp Tối Thiểu | Boss Kills Tối Thiểu |
|------|----------|-----------|--------|---------------|---------------------|
| F | Tân Binh | 🟤 | 0 | 1 | 0 |
| E | Mới Vào | ⚪ | 100 | 5 | 1 |
| D | Học Viên | 🟢 | 300 | 10 | 3 |
| C | Trung Cấp | 🔵 | 700 | 15 | 8 |
| B | Cao Cấp | 🟣 | 1.500 | 20 | 15 |
| A | Chuyên Gia | 🟡 | 3.000 | 25 | 25 |
| S | Tinh Anh | 🟠 | 6.000 | 30 | 40 |
| SS | Bậc Thầy | 🔴 | 12.000 | 35 | 60 |
| SSS | Đại Sư | ⭐ | 25.000 | 40 | 100 |
| Huyền Thoại | Truyền Thuyết | 👑 | 50.000 | 50 | 200 |

> **Mẹo:** Bạn phải đạt CẢ BA yêu cầu (GP, cấp, và boss kills) để thăng hạng. Tập trung đánh boss trong hầm ngục để giữ số boss kills tiến cùng GP.

## Hệ Thống Nhiệm Vụ

Hội cung cấp hai loại nhiệm vụ hàng ngày:

### Nhiệm Vụ Bảng (3 mỗi ngày)

Chia sẻ cho tất cả thành viên hội trong server. Ba nhiệm vụ xuất hiện hàng ngày trên bảng, mỗi nhiệm vụ yêu cầu hạng khác nhau:

- Nhiệm vụ 1: Từ **Hạng F**
- Nhiệm vụ 2: Từ **Hạng D**
- Nhiệm vụ 3: Từ **Hạng B**

Xem bảng với `/guild board`.

### Nhiệm Vụ Cá Nhân (2 mỗi ngày)

Riêng cho bạn, tạo dựa trên hạng hiện tại. Xem với `/guild quests`.

### Các Loại Hành Động Nhiệm Vụ

Có **12 loại hành động**:

| Hành Động | Mục Tiêu Ví Dụ |
|-----------|----------------|
| Hạ Quái Vật | Hạ 5–60 quái vật |
| Hạ Boss | Hạ 1–8 boss |
| Đạt Tầng | Đạt tầng 3–55 trong hầm ngục |
| Kiếm Vàng | Kiếm 200–25.000 Vàng |
| Chế Tạo Trang Bị | Chế 1–7 vật phẩm |
| Mở Rương | Mở 1–12 rương |
| Thu Thập Nguyên Liệu | Thu 5–200 nguyên liệu |
| Dùng Làm Việc | Dùng /work 2–12 lần |
| Dùng Câu Cá | Dùng /fish 2–12 lần |
| Gửi Tin Nhắn | Gửi 20–1.000 tin nhắn |
| Dùng Cầu Nguyện | Dùng /pray 1–10 lần |
| Hoàn Thành Nhiệm Vụ | Hoàn thành 2–8 nhiệm vụ khác |

Mục tiêu tăng theo hạng — hạng cao đối mặt mục tiêu lớn hơn nhưng nhận thưởng nhiều hơn.

### Phần Thưởng Nhiệm Vụ

Mỗi nhiệm vụ trao **Vàng, EXP, và GP**. Phần thưởng tăng theo hạng:

| Hạng | GP mỗi NV | Hệ Số Vàng | Hệ Số EXP | Cơ Hội Nguyên Liệu | Cơ Hội Rương |
|------|----------|-----------|----------|-------------------|-------------|
| F | 10 | 1.0x | 1.0x | 20% | 0% |
| E | 15 | 1.2x | 1.2x | 30% | 5% |
| D | 20 | 1.4x | 1.4x | 40% | 10% |
| C | 30 | 1.6x | 1.6x | 50% | 15% |
| B | 45 | 1.8x | 1.8x | 60% | 20% |
| A | 65 | 2.0x | 2.0x | 70% | 25% |
| S | 90 | 2.5x | 2.5x | 80% | 35% |
| SS | 120 | 3.0x | 3.0x | 90% | 45% |
| SSS | 160 | 3.5x | 3.5x | 95% | 55% |
| Huyền Thoại | 200 | 4.0x | 4.0x | 100% | 70% |

Bạn có thể giữ tối đa **3 nhiệm vụ đang hoạt động** cùng lúc.

## Chi Hội

Chi Hội là phần mở rộng theo server của Hội Phiêu Lưu, thiết lập bởi admin server dùng `/guild-admin setup`.

### Chi Hội Là Gì

Chi Hội đại diện cho chi nhánh server của bạn trong Hội Phiêu Lưu toàn cầu. Thành viên đóng góp vào mục tiêu chung và thi đấu với server khác.

### Nhiệm Vụ Hợp Tác Hàng Tuần

Mỗi tuần, chi hội nhận **3 nhiệm vụ hợp tác** mà tất cả thành viên cùng đóng góp. Loại nhiệm vụ gồm:

- Hạ Quái Vật (mục tiêu cơ bản: 100)
- Hạ Boss (mục tiêu cơ bản: 15)
- Kiếm Vàng (mục tiêu cơ bản: 10.000)
- Thu Thập Nguyên Liệu (mục tiêu cơ bản: 50)
- Hoàn Thành Nhiệm Vụ (mục tiêu cơ bản: 30)
- Chế Tạo Trang Bị (mục tiêu cơ bản: 10)

Mục tiêu tăng theo số thành viên (mục tiêu cơ bản x ceil(thành viên / 5), tối đa 20x).

#### Cấp Thưởng Hàng Tuần

| NV Hoàn Thành | Vàng | EXP | GP | Rương |
|--------------|------|-----|----|-------|
| 3 trên 3 | 50 | 30 | 15 | Bạc 🥈 |
| 2 trên 3 | 30 | 20 | 10 | — |
| 1 trên 3 | 15 | 10 | 5 | — |

### Sự Kiện Thi Đấu Hàng Tháng

Mỗi tháng, sự kiện thi đấu theo chủ đề đặt các chi hội đối đầu nhau. Chủ đề xoay qua 6 lựa chọn:

| Chủ Đề | Hành Động | Biểu Tượng |
|--------|-----------|-----------|
| Diệt Boss | Hạ Boss | ⚔️ |
| Đổ Vàng | Kiếm Vàng | 🪙 |
| Thợ Săn Quái | Hạ Quái Vật | 🐉 |
| Thợ Rèn Bậc Thầy | Chế Tạo Trang Bị | 🔨 |
| Vô Địch Nhiệm Vụ | Hoàn Thành Nhiệm Vụ | 📜 |
| Nhà Sưu Tập Nguyên Liệu | Thu Thập Nguyên Liệu | 💎 |

Tính điểm dùng **điểm bình quân đầu người** (tổng điểm / số thành viên) nên server nhỏ vẫn có thể cạnh tranh công bằng.

#### Phần Thưởng Sự Kiện (mỗi thành viên)

| Xếp Hạng | Vàng | EXP | GP | Rương |
|----------|------|-----|----|-------|
| Hạng 1 | 200 | 100 | 50 | Vàng 🥇 |
| Hạng 2 | 100 | 50 | 25 | Bạc 🥈 |
| Hạng 3 | 50 | 25 | 10 | Đồng 🟫 |
| Hạng 4–10 | 25 | 15 | 5 | — |

Xem sự kiện với `/guild event` và bảng xếp hạng server với `/guild ranking`.

## Bảng Lệnh Hội

| Lệnh | Mô Tả |
|-------|--------|
| `/guild register` | Gia nhập Hội Phiêu Lưu |
| `/guild profile` | Xem hạng hội, GP, và chỉ số |
| `/guild board` | Xem nhiệm vụ bảng hàng ngày |
| `/guild quests` | Xem nhiệm vụ cá nhân |
| `/guild ranking` | Xem bảng xếp hạng hội |
| `/guild branch` | Xem thông tin chi hội server |
| `/guild event` | Xem sự kiện thi đấu hàng tháng |

### Lệnh Quản Trị

| Lệnh | Mô Tả |
|-------|--------|
| `/guild-admin setup` | Tạo chi hội cho server |
| `/guild-admin config` | Cấu hình chi hội |
| `/guild-admin disband` | Giải tán chi hội |
