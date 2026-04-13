---
title: Manga & NSFW
description: Duyệt manga và doujinshi từ nhiều nguồn với tìm kiếm, phân trang và chọn ngẫu nhiên.
icon: "📚"
order: 6
relatedCommands: ["nhentai", "3hentai", "asmhentai", "hentaifox", "nhentai-lite", "pururin", "hentai2read", "simply-hentai"]
---

## Tổng Quan

3AT có **8 lệnh nguồn manga** để duyệt doujinshi và manga. Tất cả lệnh manga là **chỉ NSFW** — chỉ hoạt động trong kênh được đánh dấu NSFW trong cài đặt Discord.

## Các Nguồn

| Lệnh | Nguồn | Tính Năng |
|-------|--------|----------|
| `/nhentai` | nhentai.net | Tìm theo tag, đọc theo ID, ngẫu nhiên |
| `/3hentai` | 3hentai | Tìm theo tag, đọc theo ID, ngẫu nhiên |
| `/asmhentai` | asmhentai | Doujinshi ngẫu nhiên |
| `/hentaifox` | hentaifox | Doujinshi ngẫu nhiên |
| `/nhentai-lite` | nhentai (lite) | Phiên bản nhẹ — phản hồi nhanh hơn, cùng nội dung |
| `/pururin` | pururin | Doujinshi ngẫu nhiên |
| `/hentai2read` | hentai2read | Tìm kiếm và đọc (không có ngẫu nhiên) |
| `/simply-hentai` | simply-hentai | Tìm kiếm và đọc (không có ngẫu nhiên) |

## Cách Sử Dụng

Hầu hết các lệnh hỗ trợ hai lệnh con. Các nguồn đánh dấu "không có ngẫu nhiên" chỉ hỗ trợ `read`:

| Lệnh Con | Mô Tả | Ví Dụ |
|----------|--------|--------|
| `read` | Đọc doujinshi theo ID hoặc tìm kiếm theo tag | `/nhentai read query:english` |
| `random` | Lấy doujinshi ngẫu nhiên | `/nhentai random` |

### Đọc

Khi mở doujinshi, bot hiển thị bìa với thông tin (tiêu đề, tag, số trang). Dùng nút **Previous** và **Next** để lật trang, hoặc nhảy đến trang cụ thể.

### Tìm Kiếm

Dùng tùy chọn `query` để tìm theo tag, tác giả hoặc ngôn ngữ. Kết quả hiển thị dạng danh sách — chọn một để bắt đầu đọc.

## Chi Phí Star

Các lệnh manga sử dụng **hệ thống tính phí star**:

- **3 lượt miễn phí mỗi ngày** — reset lúc nửa đêm UTC
- Sau khi hết lượt miễn phí, mỗi lệnh tốn **1 star** ⭐
- Cả 8 nguồn manga **dùng chung bộ đếm** — dùng `/nhentai` tính cùng 3 lượt miễn phí với `/3hentai`
- Nếu lệnh lỗi (API error, timeout), star hoặc lượt miễn phí sẽ được **hoàn tự động**

Dùng `/wallet view` để xem số dư star. Xem [Hướng dẫn Star](/vi/guide/star) để biết tất cả cách kiếm star.

## An Toàn NSFW

- Tất cả lệnh manga **chỉ hoạt động trong kênh NSFW** — bot kiểm tra `channel.nsfw` trước khi phản hồi
- Nếu dùng trong kênh không phải NSFW, bot sẽ trả lời thông báo lỗi
- Admin server kiểm soát kênh nào là NSFW qua cài đặt kênh Discord

> **Cho Admin:** Để bật lệnh manga, nhấp chuột phải vào kênh text → Chỉnh Sửa Kênh → bật "Age-Restricted Channel".
