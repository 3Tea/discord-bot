---
title: Shop Toàn Cầu
description: Mua vật phẩm độc quyền bằng star — trang trí, tiện ích và nhiều hơn từ shop xuyên server.
icon: "🛒"
order: 4
relatedCommands: ["global-shop", "global-inventory", "wallet"]
---

## Tổng Quan

**Shop Toàn Cầu** là cửa hàng vật phẩm xuyên server của 3AT. Khác với shop theo server dùng coin, shop toàn cầu dùng **star** ⭐ — tiền tệ toàn cầu hoạt động trên tất cả server.

Vật phẩm bạn mua được lưu trong **kho đồ toàn cầu** và có thể dùng ở mọi nơi.

## Loại Vật Phẩm

| Loại | Mô Tả | Ví Dụ |
|------|--------|-------|
| Cosmetic Identity | Vật phẩm tùy chỉnh giao diện | Huy hiệu, danh hiệu, trang trí hồ sơ |
| Utility Token | Vật phẩm chức năng có hiệu ứng | Booster, token truy cập đặc biệt |

Vật phẩm có thể có **số lượng giới hạn** — hết hàng thì phải đợi bổ sung. Kiểm tra shop thường xuyên để tìm vật phẩm mới.

## Cách Mua

### Bước 1: Kiểm tra số dư star

Dùng `/wallet view` để xem bạn có bao nhiêu star. Nếu cần thêm, kiếm qua:
- `/wallet daily` — 1-3 star mỗi ngày (+ bonus streak)
- Rơi ngẫu nhiên từ pray, curse, work, fish, mine, dungeon
- Mốc thành tích

Xem [Hướng dẫn Star](/vi/guide/star) để biết chi tiết đầy đủ.

### Bước 2: Duyệt danh mục

```
/global-shop view
```

Duyệt vật phẩm với giá và tình trạng tồn kho. Lọc theo loại với tùy chọn `type`, hoặc chuyển trang với `page`.

### Bước 3: Mua hàng

```
/global-shop buy item-id:badge_gold
```

Chỉ định ID vật phẩm và tùy chọn số lượng (1-10). Star được trừ ngay lập tức. Nếu mua thất bại vì bất kỳ lý do nào, star được hoàn tự động.

### Bảo Vệ

- **Thời gian chờ 3 giây** giữa các lần mua tránh mua nhầm
- **Phát hiện trùng lặp** đảm bảo cùng một lần mua không xử lý hai lần
- **Hoàn tiền tự động** nếu có lỗi xảy ra giữa chừng

## Kiểm Tra Kho Đồ

Dùng `/global-inventory view` để xem tất cả vật phẩm bạn sở hữu. Vật phẩm sắp xếp theo mua gần nhất, 10 vật phẩm mỗi trang.

## Bảng Lệnh

| Lệnh | Mô Tả |
|------|--------|
| `/global-shop view` | Duyệt danh mục vật phẩm (lọc theo loại, phân trang) |
| `/global-shop buy item-id:<id>` | Mua vật phẩm (tùy chọn số lượng 1-10) |
| `/global-inventory view` | Xem vật phẩm bạn sở hữu (phân trang) |
| `/wallet view` | Kiểm tra số dư star |
