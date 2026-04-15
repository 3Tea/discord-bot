---
title: Hướng Dẫn Thiết Lập Admin
description: Hướng dẫn thiết lập đầy đủ cho quản trị viên server — cấu hình kinh tế, XP, kênh thoại, confession, và nhiều hơn nữa.
icon: "🔧"
order: 1
relatedCommands: ["economy", "shop", "xp", "settings", "voice", "moderation", "confession"]
---

## Thêm Bot Vào Server

Mời bot qua liên kết trên [trang chủ](/) và cấp các quyền sau trong quá trình OAuth:

- **Send Messages** + **Embed Links** — bắt buộc cho tất cả phản hồi lệnh
- **Manage Roles** — bắt buộc cho vật phẩm role trong shop (gán role khi mua)
- **Connect** + **Speak** — bắt buộc cho tính năng kênh thoại

Nếu thiếu Manage Roles, vật phẩm loại role trong shop sẽ thất bại khi gán mà không có thông báo. Nếu thiếu Connect/Speak, sự kiện tạo kênh thoại sẽ không hoạt động đúng.

## Các Bước Đầu Tiên Sau Khi Thêm Bot

Chạy hai lệnh này ngay sau khi thêm bot:

**1. Đặt ngôn ngữ cho server:**
```
/settings server-language
```
Chọn trong 15 ngôn ngữ được hỗ trợ. Tất cả phản hồi của bot trong server sẽ dùng ngôn ngữ này theo mặc định. Người dùng có thể ghi đè bằng `/settings language` cho sở thích cá nhân.

**2. Kiểm tra những gì đã hoạt động sẵn:**

Tất cả trong danh sách này hoạt động ngay — không cần thiết lập:
- Lệnh kinh tế: `/pray`, `/curse`, `/work`, `/fish`, `/gamble`, `/gift`, `/rob`
- Kiếm XP từ tin nhắn, chat thoại, và reaction
- Nhiệm vụ hàng ngày (`/quest view`)
- Ví toàn cầu (`/wallet daily`)

Những gì **cần thiết lập thủ công**:
- Vật phẩm shop (mặc định trống — bạn phải tự thêm)
- Kênh log kinh tế (tùy chọn)
- Kênh thông báo chào mừng/tạm biệt/boost
- Kênh confession
- Kênh thoại join-to-create

## Cấu Hình Kinh Tế

Nhóm lệnh `/economy config` kiểm soát toàn bộ gameplay kinh tế. Các giá trị mặc định cân bằng cho hầu hết server và bạn không cần thay đổi để bắt đầu. Quay lại tinh chỉnh sau khi server đã chạy được một tuần.

| Nhóm Cấu Hình | Điều Chỉnh |
|---------------|-----------|
| `/economy config reward-view` | Thưởng coin/gem khi lên cấp, hoạt động chat thoại, và các mốc streak |
| `/economy config gambling-view` | Cược tối thiểu và tối đa, thời gian chờ cờ bạc, bật/tắt cờ bạc |
| `/economy config work-view` | Thời gian chờ làm việc/câu cá và khoảng thưởng coin |
| `/economy config social-view` | Giới hạn tặng, thời gian chờ cướp, tỉ lệ thành công, phần trăm cướp/phạt |

**Khi nào nên điều chỉnh:**
- Server lớn (500+ thành viên hoạt động) có thể muốn cược tối đa cao hơn để giữ người chơi nhiều coin
- Server nhỏ (dưới 50 thành viên) có thể tốt hơn với thời gian chờ work/fish ngắn hơn
- Nếu cờ bạc gây vấn đề cân bằng, tăng cược tối thiểu hoặc tạm thời vô hiệu hóa

Dùng lệnh `-view` để kiểm tra giá trị hiện tại trước khi thay đổi.

## Thiết Lập Shop

Shop trống theo mặc định. Dùng `/shop add` để tạo vật phẩm.

### Hướng dẫn: Thêm Vật Phẩm Đầu Tiên

1. Chạy `/shop add` và điền các trường:
   - **item-id** — slug viết thường độc nhất (ví dụ: `active-role`)
   - **name** — tên hiển thị cho người dùng (ví dụ: "Thành Viên Tích Cực")
   - **price** — giá coin (ví dụ: `500`)
   - **type** — chọn `role` để thưởng role Discord
   - **role** — chọn role Discord sẽ gán khi mua
   - **stock** — giới hạn tùy chọn (để trống nếu không giới hạn)

2. Xác nhận và vật phẩm xuất hiện ngay trong `/shop view`.

### Vật Phẩm Đề Xuất Cho Người Mới

| Vật Phẩm | Loại | Giá Đề Xuất |
|----------|------|-------------|
| Role Thành Viên Tích Cực | Role | 500 coin |
| Role VIP | Role | 2.000 coin |
| Role màu (mỗi màu) | Role | 300 coin mỗi cái |
| Trang trí màu tên | Cosmetic | 800 coin |

**Mẹo:**
- Định giá role theo thời gian cần để kiếm đủ coin qua pray/work
- Dùng giới hạn số lượng cho role độc quyền — sự khan hiếm thúc đẩy tương tác
- Role màu sắc rất được ưa thích vì người dùng thu thập nhiều; hãy định giá vừa phải

## Thực Hành Tốt Nhất Về Kinh Tế

Kinh tế server lành mạnh cần cân bằng giữa nguồn coin (pray, work, fish, thưởng XP) và nơi tiêu coin (shop, cờ bạc, hình phạt cướp).

**Ngăn chặn lạm phát:**
- Cờ bạc là nơi tiêu coin tự nhiên — đừng vô hiệu hóa trừ khi có lạm dụng
- Cướp có kỳ vọng âm ròng — nó phân phối lại chứ không tạo ra coin
- Giữ thưởng work hợp lý so với giá vật phẩm trong shop

**Dấu hiệu lạm phát:**
- Dashboard hiển thị dòng chảy coin dương ròng liên tục qua từng tuần
- Người dùng hàng đầu tích lũy số dư lớn mà không có gì hấp dẫn để tiêu

**Khắc phục lạm phát:**
- Thêm vật phẩm shop hấp dẫn hơn (role độc quyền giá cao hoạt động tốt)
- Thắt chặt cấu hình cờ bạc (cược tối thiểu cao hơn)
- Thực hiện bulk tax một lần (xem Thao tác hàng loạt bên dưới) — dùng tiết kiệm

**Phân phối tài sản:**
- `/economy admin dashboard` hiển thị biểu đồ phân phối tài sản
- Kinh tế lành mạnh có hầu hết người dùng ở mức trung bình với một số ít người thu nhập cao
- Nếu 80%+ người dùng gần bằng 0, tỷ lệ kiếm tiền có thể quá thấp hoặc thời gian chờ quá dài

## Bảng Điều Khiển & Theo Dõi

Chạy `/economy admin dashboard` hàng tuần để kiểm tra sức khỏe server.

**Mỗi phần cho bạn biết:**
- **Lưu thông Coin/Gem** — tổng cung trong nền kinh tế hiện tại
- **Dòng chảy 24h** — coin ròng kiếm hoặc mất qua tất cả giao dịch hôm nay
- **Phân phối Tài sản** — biểu đồ coin được phân bổ thế nào trong số thành viên
- **So sánh Tuần trước** — xu hướng tăng (rủi ro lạm phát) hay giảm (rủi ro giảm phát)
- **Cảnh báo Bất thường** — hoạt động đáng ngờ được phát hiện tự động

**Cảnh báo bất thường kích hoạt khi:**
- Kiếm đột biến — người dùng kiếm hơn 3 lần trung bình hàng ngày của họ
- Lạm dụng cờ bạc — hơn 20 phiên cờ bạc mỗi ngày từ một người dùng
- Nhắm mục tiêu cướp — một người dùng bị cướp 3+ lần trong ngày

Khi cảnh báo kích hoạt, dùng các công cụ kiểm tra bên dưới để điều tra.

## Kiểm Tra & Điều Tra

### Lịch Sử Giao Dịch
```
/economy admin history user:@nghi_van
```
Mở nhật ký giao dịch phân trang. Lọc theo loại giao dịch (pray, work, gamble, v.v.) hoặc khoảng thời gian để thu hẹp hoạt động đáng ngờ.

### Đảo Ngược Giao Dịch
```
/economy admin reverse id:<transaction-id>
```
Hoàn tác một giao dịch cụ thể. Lấy ID giao dịch từ lịch sử. Lưu ý: một số loại giao dịch (như thưởng XP) không thể đảo ngược.

### Đóng Băng Người Dùng
```
/economy admin freeze user:@nghi_van
```
Chặn người dùng khỏi tất cả lệnh kinh tế (pray, curse, work, fish, gamble, gift, rob, shop, mine, dungeon) trong khi điều tra. Dùng `/economy admin unfreeze` để khôi phục quyền truy cập.

**Khi nào dùng các công cụ này:** Nghi ngờ tự động hóa bot, nông coin bằng tài khoản phụ, báo cáo lỗi, hoặc tranh chấp giữa người chơi.

## Đặt Lại & Khôi Phục

> **Lưu ý:** Chỉ dùng reset cho sự cố kinh tế nghiêm trọng. Không thể hoàn tác cho những người dùng bị ảnh hưởng.

```
/economy admin reset scope:coin
/economy admin reset scope:gem
/economy admin reset scope:streak
/economy admin reset scope:all
```

Reset có thể nhắm vào một người dùng hoặc toàn bộ server. **Snapshot tự động được lưu trước mỗi lần reset** — bạn có thể rollback nếu cần:

```
/economy admin rollback id:<snapshot-id>
```

ID rollback xuất hiện trong tin nhắn xác nhận sau khi reset. Lưu lại cho đến khi bạn chắc chắn reset đã đạt kết quả mong muốn.

**Khi nào reset:** Kinh tế server bị hỏng nghiêm trọng do khai thác hàng loạt, lỗi phân phối quá nhiều coin, hoặc sự kiện khởi động lại server mới.

## Thao Tác Hàng Loạt

Dùng `/economy bulk` cho các thay đổi tiền tệ hàng loạt — phần thưởng sự kiện, đặt lại mùa, điều chỉnh kinh tế.

### Phân Phối Phần Thưởng
```
/economy bulk distribute
```
Tặng coin hoặc gem cho **tất cả thành viên** hoặc **một role cụ thể**. Hữu ích cho:
- Phần thưởng hoàn thành sự kiện ("mọi người tham gia giải đấu nhận 500 coin")
- Bonus đầu mùa
- Bồi thường thành viên sau sự cố phía server

### Thu Tiền Tệ
```
/economy bulk tax
```
Thu một phần trăm hoặc số tiền cố định từ tất cả thành viên. Hữu ích cho:
- Tái cân bằng kinh tế khi phát hiện lạm phát
- Phí đăng ký sự kiện ("trả 100 coin để tham gia giải đấu")

Cả hai thao tác đều yêu cầu xác nhận trước khi thực hiện và có thời gian chờ 60 giây giữa các lần dùng. Tất cả hành động bulk được tự động ghi vào kênh log kinh tế (nếu đã cấu hình).

## Kênh Log Kinh Tế

Thiết lập kênh log chuyên dụng để nhận thông báo về các sự kiện kinh tế quan trọng:

```
/economy admin log-setup channel:#economy-logs
```

Sau đó cấu hình những gì được ghi:
```
/economy admin log-config
```

**Ngưỡng đề xuất:**
- Chuyển coin lớn: mặc định 500 (hạ xuống 200 cho server nhỏ)
- Chuyển gem lớn: mặc định 5
- Thắng cờ bạc: mặc định 1.000
- Bật: cướp thành công, hành động admin, thao tác bulk

**Thực hành tốt nhất:** Tạo kênh riêng `#economy-logs` chỉ hiển thị cho admin và mod. Điều này giữ nhật ký kiểm tra khỏi tầm nhìn công cộng và giúp dễ phát hiện hoạt động bất thường ngay lập tức.

## Cấu Hình Hệ Thống XP

Điều chỉnh tốc độ kiếm XP và hành vi bằng `/xp config`:

| Cài Đặt | Mặc Định | Mô Tả |
|---------|---------|--------|
| XP mỗi tin nhắn | 20 | XP được thưởng cho mỗi tin nhắn đủ điều kiện |
| XP mỗi phút thoại | 5 | XP mỗi phút trong kênh thoại |
| XP mỗi reaction | 3 | XP mỗi lần react |
| Thời gian chờ tin nhắn | 60 giây | Thời gian tối thiểu giữa các tin nhắn kiếm XP |
| Độ dài tin nhắn tối thiểu | 3 ký tự | Ngưỡng lọc spam |

**Thông báo lên cấp** được gửi tự động trong kênh nơi tin nhắn lên cấp được gửi. Không cần thiết lập kênh.

**Blacklist kênh:** Thêm các kênh lưu lượng cao (như `#bot-spam` hoặc kênh thông báo) vào blacklist XP để hoạt động ở đó không làm phồng số XP.

**Thưởng kinh tế thụ động gắn với XP:** Cấu hình thưởng coin khi lên cấp và thưởng coin mỗi khoảng thời gian chat thoại trong `/economy config reward-view`.

## Kênh Thoại

Thiết lập kênh thoại join-to-create để thành viên có thể tạo kênh tạm thời ngay lập tức:

```
/voice setup
```

Chọn kênh thoại người dùng sẽ tham gia để kích hoạt tạo kênh. Khi thành viên tham gia, họ ngay lập tức nhận kênh mới với bảng điều khiển đầy đủ để lock/hide/đổi tên/giới hạn.

Không cần cấu hình admin thêm — bảng điều khiển là tự phục vụ cho chủ kênh. Kênh tự xóa khi trống.

## Kiểm Duyệt Confession

Thiết lập hệ thống confession:

```
/confession config
```

Cấu hình:
- **Kênh confession** — nơi confession được duyệt đăng công khai
- **Chế độ phê duyệt** — khi bật, confession vào kênh kiểm duyệt mod riêng trước. Mod duyệt hoặc từ chối trước khi đăng.

**Cấm người dùng đăng confession:**
```
/confession ban user:@user
```
Ngăn người dùng gửi confession mới. Dùng cho vi phạm quy tắc lặp lại.

**Lưu ý:** Confession âm thanh là tính năng premium (chỉ dành cho gói Star/Galaxy). Confession văn bản và hình ảnh khả dụng cho tất cả thành viên.

## Thiết Lập Thông Báo

Cấu hình tin nhắn chào mừng, tạm biệt, và boost:

```
/settings notification
```

Cho mỗi loại thông báo (chào mừng, tạm biệt, server boost):
1. Đặt kênh đích
2. Bật thông báo
3. Tùy chọn tùy chỉnh tin nhắn embed với các biến như `{{user}}`, `{{server}}`, `{{memberCount}}`

Tất cả ba loại thông báo độc lập — bạn có thể chỉ bật tin nhắn chào mừng và để các loại khác bị tắt.

## Tham Khảo Nhanh

| Công Việc | Lệnh |
|-----------|------|
| Đặt ngôn ngữ server | `/settings server-language` |
| Xem bảng điều khiển kinh tế | `/economy admin dashboard` |
| Cấu hình thưởng | `/economy config reward-view` |
| Cấu hình cờ bạc | `/economy config gambling-view` |
| Cấu hình làm việc/câu cá | `/economy config work-view` |
| Cấu hình tặng/cướp | `/economy config social-view` |
| Thêm vật phẩm shop | `/shop add` |
| Thiết lập kênh log | `/economy admin log-setup` |
| Đóng băng người dùng | `/economy admin freeze user:@user` |
| Đặt lại kinh tế | `/economy admin reset` |
| Phân phối hàng loạt | `/economy bulk distribute` |
| Xem lịch sử người dùng | `/economy admin history user:@user` |
