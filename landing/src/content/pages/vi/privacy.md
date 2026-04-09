---
title: "Chính sách Bảo mật"
description: "Chính sách Bảo mật cho 3AT - Endless Paradox: dữ liệu Discord, MongoDB, Redis, XP, kinh tế, và cách liên hệ."
lastUpdated: "8 tháng 4, 2026"
---

Chính sách Bảo mật này giải thích cách các người vận hành **3AT - Endless Paradox** ("3AT," "chúng tôi") xử lý thông tin khi bạn sử dụng bot Discord 3AT, truy cập các trang landing chính thức (bao gồm **discords.sbs**), hoặc tương tác với dự án mã nguồn mở tại [3Tea/discord-bot](https://github.com/3Tea/discord-bot).

## 1. Chúng tôi là ai

3AT là một bot Discord cộng đồng. Mã nguồn được công khai trên GitHub; *bot live* mà bạn thêm vào server được vận hành bởi các nhà bảo trì dự án trên cơ sở hạ tầng họ kiểm soát (hoặc bởi bạn, nếu bạn tự host — xem bên dưới). Để biết câu hỏi về cách *phiên bản hosted* của chúng tôi xử lý dữ liệu, hãy sử dụng phần liên hệ.

Nếu bạn chạy bản sao bot từ mã nguồn, **bạn** chịu trách nhiệm về thông báo bảo mật và xử lý dữ liệu của riêng bạn; chính sách này mô tả dịch vụ công khai do dự án vận hành, không phải mọi triển khai riêng.

## 2. Phạm vi và Discord

Chính sách này bao gồm hành vi của 3AT trong các guild Discord cài đặt bot và việc sử dụng các trang tiếp thị hoặc tài liệu chính thức. Chính sách này **không** thay thế [Chính sách Bảo mật của Discord](https://discord.com/privacy) hoặc [Điều khoản Dịch vụ](https://discord.com/terms), vốn điều chỉnh tài khoản Discord và nền tảng Discord của bạn.

## 3. Thông tin chúng tôi xử lý

Những gì chúng tôi xử lý phụ thuộc vào tính năng nào server của bạn bật và cách bạn tương tác với bot.

### 3.1 Dữ liệu nền tảng Discord

Chúng tôi nhận dữ liệu từ API và sự kiện Discord khi bot hoạt động, ví dụ:

- **Định danh** — ID người dùng, ID guild (server), ID kênh, ID role, ID tin nhắn, và các ID kỹ thuật tương tự cần thiết để thực thi slash commands và các tính năng nền.
- **Trường hồ sơ Discord cung cấp** — như tên người dùng, tên hiển thị, avatar, hoặc huy hiệu khi API trả về cho embed, rank card, bảng xếp hạng, hoặc đầu ra lệnh.
- **Tương tác** — payload slash-command, nhấn button, và metadata liên quan Discord gửi với mỗi tương tác.
- **Tin nhắn và nội dung dạng tin nhắn** — chỉ khi Discord cung cấp nội dung cho bot theo intent và quyền của server bạn (ví dụ văn bản bạn gửi qua tùy chọn lệnh, hoặc nội dung tin nhắn khi bot được cấu hình với intent đặc quyền Message Content). Một số logic XP và chống spam có thể sử dụng độ dài tin nhắn, thời gian, hoặc **hash một chiều** của văn bản chuẩn hóa để phát hiện trùng lặp khi nội dung khả dụng; chúng tôi không lưu trữ nhật ký tin nhắn đầy đủ cho quảng cáo hoặc huấn luyện mô hình.
- **Trạng thái voice** — bạn có đang kết nối với kênh voice hay không (và các trường liên quan Discord cung cấp) cho các tính năng như XP voice hoặc kênh voice tạm thời, tùy thuộc cấu hình.
- **Reaction** — đủ thông tin để gán reaction cho người dùng và kênh cho XP dựa trên reaction hoặc tương tự, tuân theo cooldown và cài đặt server.

### 3.2 Dữ liệu chúng tôi lưu trong cơ sở dữ liệu ứng dụng (ví dụ MongoDB)

Các danh mục lưu trữ điển hình bao gồm:

- **Hồ sơ toàn cầu theo người dùng** — ID người dùng Discord, các trường XP/tiền tệ tổng hợp được sử dụng giữa các guild khi áp dụng, tùy chọn ngôn ngữ tùy chọn, dấu thời gian hoạt động, và cờ trạng thái tài khoản.
- **Tiến trình theo guild, theo thành viên** — XP, cấp độ, bộ đếm tin nhắn/voice/reaction, dấu thời gian cho cooldown, và (khi nội dung tin nhắn khả dụng) hash lưu trữ của nội dung tin nhắn cuối cùng chỉ được sử dụng để phát hiện tin nhắn spam lặp lại cho cùng thành viên.
- **Cấu hình guild** — ngôn ngữ server, điều chỉnh XP (số lượng, cooldown, kênh bị chặn), và các cài đặt liên quan.
- **Snapshot theo khoảng thời gian** — khóa kỳ (kiểu ngày/tuần/tháng/năm) cho bảng xếp hạng và tổng hợp thống kê server.
- **Kinh tế** — số dư theo guild (coin/gem), chuỗi và dấu thời gian cooldown pray/curse, mục cửa hàng do quản trị viên định nghĩa, và bản ghi giao dịch cho các hành động cửa hàng hoặc kinh tế.

Các trường chính xác phát triển theo phiên bản phần mềm được triển khai; kho lưu trữ mã nguồn công khai vẫn là tài liệu kỹ thuật chính xác nhất.

### 3.3 Cache và lưu trữ nhanh (ví dụ Redis hoặc bộ nhớ)

Chúng tôi sử dụng cache tạm thời cho khả năng phản hồi và phòng chống lạm dụng, chẳng hạn: tùy chọn ngôn ngữ đã phân giải, cache hình ảnh hoặc payload đã render, đánh dấu quyền sở hữu kênh voice, giới hạn tốc độ tương tác, và đánh dấu cooldown chống spam XP. TTL thường từ vài phút đến vài ngày tùy thuộc vào khóa. Dữ liệu cache được lấy từ các danh mục trên và không được bán.

### 3.4 Nhật ký và bảo mật

Nhật ký server hoặc ứng dụng có thể chứa lỗi, dấu thời gian thô, và chẩn đoán kỹ thuật. Chúng tôi tránh giữ lại nội dung tin nhắn đầy đủ trong nhật ký trừ khi tạm thời cần thiết để điều tra một sự cố cụ thể.

### 3.5 Khách truy cập trang web

Các trang landing tĩnh chính thức có thể ghi lại metadata máy chủ web tiêu chuẩn (ví dụ địa chỉ IP, user agent, đường dẫn yêu cầu) như một phần của hosting thông thường. Chúng tôi không sử dụng các trang đó để chạy mạng quảng cáo hành vi thay mặt cho các nhà quảng cáo bên thứ ba.

## 4. Mục đích xử lý

Chúng tôi xử lý thông tin để:

- Cung cấp slash commands, buttons, XP, kinh tế, tiện ích voice, luồng cửa hàng, và các tính năng liên quan.
- Render bảng xếp hạng, rank card, thống kê server, và các tóm tắt hiển thị cho người dùng khác.
- Áp dụng cooldown, loại bỏ trùng lặp, và giới hạn tốc độ để giảm spam và bảo vệ ổn định.
- Ghi nhớ tùy chọn bạn hoặc quản trị viên thiết lập (bao gồm ngôn ngữ).
- Vận hành, bảo mật, gỡ lỗi và cải thiện dịch vụ, bao gồm sao lưu khi sử dụng.

**Chúng tôi không bán thông tin cá nhân của bạn.** Chúng tôi không sử dụng dữ liệu Discord để huấn luyện mô hình machine learning thương mại cho các sản phẩm không liên quan.

## 5. Cơ sở pháp lý (khi áp dụng luật kiểu GDPR)

Khi luật Châu Âu hoặc tương tự yêu cầu "cơ sở pháp lý," chúng tôi dựa vào **thực hiện dịch vụ** mà bạn hoặc quản trị viên server yêu cầu bằng cách thêm bot, **lợi ích chính đáng** trong việc bảo mật và cải thiện bot (cân bằng với quyền của bạn), và, khi áp dụng, **đồng ý** cho các tương tác tùy chọn mà bạn khởi tạo rõ ràng.

## 6. Chia sẻ và bên xử lý phụ

Chúng tôi tiết lộ thông tin chỉ khi cần thiết:

- **Discord, Inc.** — chúng tôi gọi API Discord; họ xử lý dữ liệu theo chính sách của họ.
- **Nhà cung cấp cơ sở hạ tầng** — hosting, cơ sở dữ liệu, DNS, hoặc nhà cung cấp giám sát lưu trữ hoặc truyền dữ liệu thay mặt chúng tôi.
- **Nội dung hoặc API bên thứ ba** — một số lệnh có thể yêu cầu dịch vụ bên ngoài (ví dụ endpoint media hoặc dịch thuật). Chỉ các tham số cần thiết cho yêu cầu đó được gửi; các nhà cung cấp đó có chính sách riêng.
- **Pháp luật và an toàn** — khi pháp luật yêu cầu hoặc để bảo vệ quyền, an toàn và toàn vẹn.

## 7. Lưu giữ

Dữ liệu thường được giữ khi bot vẫn ở trong guild và các tính năng được sử dụng. Các mục kiểu Redis hết hạn tự động theo TTL. Bản ghi cơ sở dữ liệu có thể bị xóa khi không còn cần thiết, khi quản trị viên sử dụng các công cụ có sẵn, hoặc khi bạn liên hệ chúng tôi để yêu cầu xóa hợp lý mà chúng tôi có thể thực hiện trong ràng buộc Discord và vận hành. Bản sao còn lại có thể tồn tại trong thời gian hạn chế trong bản sao lưu.

## 8. Bảo mật

Chúng tôi áp dụng kiểm soát truy cập hợp lý, truyền tải mã hóa theo tiêu chuẩn, và phạm vi OAuth đặc quyền tối thiểu cho bot. Không có phương pháp lưu trữ nào hoàn toàn an toàn; hãy bảo vệ tài khoản Discord của bạn bằng xác thực hai yếu tố và xem xét các quyền bạn cấp khi mời 3AT.

## 9. Quyền và lựa chọn của bạn

- **Xóa bot** — quản trị viên có thể kick hoặc gỡ cài đặt 3AT để ngừng xử lý mới cho guild đó (tuân theo nhật ký/sao lưu).
- **Truy cập, sửa đổi, xóa** — liên hệ chúng tôi qua GitHub (bên dưới). Chúng tôi sẽ hỗ trợ khi có thể xác minh yêu cầu của bạn và nền tảng Discord cho phép thao tác.
- **Phản đối hoặc hạn chế** — bạn có thể phản đối một số xử lý khi luật địa phương cung cấp quyền đó; xóa bot hoặc tắt tính năng có thể là kết quả thực tế.
- **Khiếu nại** — bạn có thể nộp khiếu nại với cơ quan bảo vệ dữ liệu địa phương.

## 10. Chuyển dữ liệu quốc tế

Discord và các nhà cung cấp hosting của chúng tôi có thể xử lý dữ liệu tại nhiều quốc gia. Bằng việc sử dụng 3AT, bạn hiểu rằng thông tin có thể vượt qua biên giới đến các khu vực pháp lý có quy tắc bảo mật khác nhau.

## 11. Trẻ em

3AT không nhắm vào trẻ em dưới độ tuổi yêu cầu bởi Discord hoặc khu vực của bạn (thường 13+ tại Hoa Kỳ, cao hơn tại một số quốc gia EU). Nếu bạn tin rằng chúng tôi đã xử lý dữ liệu của trẻ em không đúng cách, hãy liên hệ chúng tôi.

## 12. Thay đổi

Chúng tôi có thể cập nhật chính sách này; ngày "Cập nhật lần cuối" phản ánh bản sửa đổi mới nhất. Việc tiếp tục sử dụng sau khi thay đổi có nghĩa bạn thừa nhận chính sách cập nhật khi pháp luật cho phép.

## 13. Liên hệ

Câu hỏi về bảo mật: [GitHub Issues](https://github.com/3Tea/discord-bot/issues) hoặc [Discussions](https://github.com/3Tea/discord-bot/discussions). Văn bản này chỉ mang tính minh bạch và không phải lời khuyên pháp lý.

Chính sách Bảo mật này là thông tin chung, không phải lời khuyên pháp lý. Người vận hành có thể điều chỉnh xử lý khi bot phát triển; hãy kiểm tra trang này và kho lưu trữ để biết hành vi hiện tại.
