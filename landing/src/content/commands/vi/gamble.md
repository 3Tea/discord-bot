---
title: Cờ bạc
command: gamble
category: economy
description: Mini-game cờ bạc — đặt cược coin với tung đồng xu, máy xèng, hoặc xúc xắc.
cooldown: "30s (tùy chỉnh)"
---

## Cách dùng

```
/gamble coinflip bet:100
/gamble slots bet:50
/gamble dice bet:100 mode:high
```

## Lệnh con

| Lệnh con | Mô tả |
|-----------|-------|
| `coinflip` | Tung đồng xu — 50/50 cơ hội nhân đôi cược |
| `slots` | Quay máy xèng — trùng biểu tượng để thắng đến ×20 |
| `dice` | Tung 2 xúc xắc — đoán cao (≥8) hoặc thấp (≤6) để thắng ×2 |

## Cách hoạt động

### Tung đồng xu
50/50 cơ hội. Thắng = nhân đôi cược. Trò chơi công bằng với 0% lợi thế nhà cái.

### Máy xèng
7 kết quả có thể với các mức thưởng khác nhau:

| Combo | Thưởng |
|-------|--------|
| 7️⃣ 7️⃣ 7️⃣ | ×20 (Jackpot!) |
| 💎 💎 💎 | ×8 |
| 🔔 🔔 🔔 | ×4 |
| 🍋 🍋 🍋 | ×2 |
| 🍒 🍒 🍒 | ×1.5 |
| 🍒 🍒 ✖ | ×0.5 (hoàn một phần) |
| Không trùng | Mất cược |

### Xúc xắc
Tung 2 xúc xắc (2d6). Chọn **cao** (tổng ≥ 8) hoặc **thấp** (tổng ≤ 6). Tổng 7 luôn thua — đó là lợi thế nhà cái.

> **Lưu ý:** Cờ bạc là nơi tiêu coin — bạn sẽ mất coin trung bình theo thời gian. Đặt cược có trách nhiệm!

### Cấu hình Server
Admin có thể cấu hình cược tối thiểu/tối đa, thời gian chờ qua lệnh `/economy gambling-config-*`.
