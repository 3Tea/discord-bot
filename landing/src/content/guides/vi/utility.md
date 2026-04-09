---
title: Lệnh Tiện Ích
description: Công cụ hữu ích cho dịch thuật, tra thời tiết và kiểm tra bot.
icon: "🔧"
order: 7
relatedCommands: ["ping", "trans", "weather"]
---

## Tổng Quan

3AT bao gồm các lệnh tiện ích cho công việc hàng ngày — dịch văn bản, tra thời tiết, hoặc kiểm tra tốc độ kết nối bot.

## Ping

Kiểm tra độ trễ bot với `/ping`. Phản hồi hiển thị:

| Chỉ Số | Đo Lường |
|--------|----------|
| WebSocket | Độ trễ heartbeat giữa bot và Discord gateway |
| API | Thời gian khứ hồi cho lệnh gọi Discord API |

Hữu ích để chẩn đoán khi bot cảm thấy chậm.

## Dịch Thuật

Dùng `/trans` để dịch văn bản giữa các ngôn ngữ.

```
/trans word:Hello, how are you?
```

| Tùy Chọn | Bắt Buộc | Mô Tả |
|----------|----------|--------|
| `word` | Có | Văn bản cần dịch |

Bot tự động phát hiện ngôn ngữ nguồn và dịch sang tiếng Việt mặc định. Hỗ trợ 100+ ngôn ngữ qua Google Translate.

## Thời Tiết

Xem thời tiết hiện tại cho bất kỳ thành phố nào với `/weather`.

```
/weather location:Tokyo
```

Phản hồi bao gồm:
- **Nhiệt độ** (°C)
- **Điều kiện** (nắng, mây, mưa, v.v.) với biểu tượng
- **Độ ẩm** phần trăm
- **Tốc độ gió**

## Bảng Lệnh

| Lệnh | Mô Tả | Ví Dụ |
|-------|--------|--------|
| `/ping` | Kiểm tra độ trễ bot | `/ping` |
| `/trans` | Dịch văn bản | `/trans word:Bonjour` |
| `/weather` | Tra thời tiết | `/weather location:London` |
