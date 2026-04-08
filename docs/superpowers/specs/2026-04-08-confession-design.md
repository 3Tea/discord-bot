# Confession System — Design (MVP)

## Overview

Tính năng **confession (ẩn danh)** cho bot 3AT: người dùng gửi nội dung (và tùy chọn một ảnh) qua slash command; server cấu hình **đăng ngay** hoặc **duyệt trước**. Tham chiếu hành vi tổng quát từ các bot confession phổ biến (ví dụ [confessions.bot](https://confessions.bot/), [ConfessionBot](https://github.com/yiays/ConfessionBot)) — **không** sao chép branding hay tên thương hiệu bên thứ ba.

### Requirements đã chốt (brainstorming)

| Topic | Decision |
|-------|----------|
| Chế độ đăng | **Cấu hình theo server:** `instant` hoặc `review` |
| Nội dung | **Văn bản** + **tối đa một ảnh** (optional) |
| Báo cáo user | **Không** trong MVP — mod xử lý qua từ chối trong hàng đợi hoặc xóa tay bài đã đăng |
| Cooldown | **Mặc định** + **admin chỉnh** trong khoảng **1–120 phút** |
| Kênh duyệt | Mod **thấy** `authorId` / mention nội bộ để xử lý vi phạm; **kênh công khai** chỉ hiển thị nội dung ẩn danh |

## Architecture

- **MongoDB** — nguồn sự thật cho cấu hình per-guild và lifecycle confession (`pending` → `published` / `rejected`).
- **Redis** — chỉ **cooldown** gửi theo `(guildId, userId)` (TTL giây = `cooldownMinutes * 60`), cùng phong cách với các tính năng khác trong repo.
- **Discord.js v14** — slash commands; **buttons** cho Approve/Reject trong kênh duyệt (loader `buttons/` + `BUTTON_ID` trong `util/config/button.ts`).

### Layers

- **Models** — Mongoose: `GuildConfessionConfig`, `Confession`.
- **Services** (optional nhưng khuyến nghị) — `services/confession/` hoặc tương đương: tạo confession, counter, transition trạng thái, build embed; logic không phụ thuộc trực tiếp vào `ChatInputCommandInteraction` ngoài tham số đã parse.
- **Commands** — `commands/slash/confession.ts`: thin wrapper, `resolveLocale`, `t()`, `Reply.embed` / ephemeral.
- **Buttons** — `buttons/confessionApprove.button.ts`, `buttons/confessionReject.button.ts` (hoặc một file với prefix id): kiểm tra quyền mod, idempotent.

## Data Models

### GuildConfessionConfig (`guildConfessionConfig.model.ts`)

| Field | Type | Description |
|-------|------|-------------|
| guildId | string | Unique — một document mỗi guild |
| enabled | boolean | Bật/tắt tính năng |
| mode | `"instant"` \| `"review"` | Đăng thẳng hoặc qua duyệt |
| publicChannelId | string | Kênh đăng confession công khai (embed ẩn danh) |
| reviewChannelId | string \| null | Bắt buộc khi `mode === "review"`; kênh chỉ mod duyệt |
| cooldownMinutes | number | 1–120; default đề xuất **10** |
| createdAt / updatedAt | Date | Timestamps |

- Index: `{ guildId }` unique.
- Validation ở tầng setup: nếu `review` mà không có `reviewChannelId` thì **không** lưu (hoặc từ chối command).

### Confession (`confession.model.ts`)

| Field | Type | Description |
|-------|------|-------------|
| guildId | string | Server |
| number | number | Số confession tăng dần **theo guild** (hiển thị trên embed công khai) |
| authorId | string | Người gửi (dùng trong kênh duyệt; không lộ ra public) |
| content | string | Nội dung text; giới hạn độ dài an toàn cho embed (ví dụ ≤ 3500 ký tự cho field/description — chốt khi implement theo giới hạn Discord) |
| image | object \| null | Optional: URL và/hoặc metadata cần để **đăng lại** lên kênh công khai (tải buffer / attachment khi publish nếu cần) |
| status | `"pending"` \| `"published"` \| `"rejected"` | Lifecycle |
| reviewMessageId | string \| null | Message id trong kênh duyệt (khi có) |
| publicMessageId | string \| null | Message id bài đã đăng công khai |
| createdAt | Date | Tạo |
| resolvedAt | Date \| null | Khi publish hoặc reject |

- Index: `{ guildId, status }`, `{ guildId, number }` unique compound.
- Counter `number`: dùng **atomic update** (findOneAndUpdate với `$inc`) hoặc sequence document riêng per guild để tránh trùng số khi concurrent.

## Slash Commands

- **`/confession submit`**
  - Options: `content` (string, required), `image` (attachment, optional, tối đa **một** file ảnh).
  - Kiểm tra: guild đã có config `enabled`, kênh hợp lệ theo mode; cooldown Redis; validate độ dài / loại file.
  - Response: ephemeral xác nhận đã gửi / đã vào hàng đợi (không leak nội dung ra nơi không cần thiết nếu design muốn tối giản — có thể chỉ “Đã gửi”).

- **`/confession setup`**
  - Permission: **Manage Guild**, nhất quán với các lệnh cấu hình server khác trong repo.
  - Options gợi ý: `enabled`, `mode`, `public_channel`, `review_channel` (required nếu mode review), `cooldown_minutes` (1–120).
  - Upsert `GuildConfessionConfig`.

Command/option **names** giữ tiếng Anh; **mô tả** localize qua `descriptionLocales` + key `cmd.*` trong 15 locale files (theo CLAUDE.md).

## Flows

### Instant mode

1. User `/confession submit` → pass validation + cooldown.
2. Atomic tăng `number`, tạo `Confession` với `status: published` (hoặc `published` ngay sau khi gửi message thành công).
3. Bot gửi message/embed (**ẩn danh**) vào `publicChannelId` kèm ảnh nếu có; lưu `publicMessageId`.
4. Set Redis cooldown.

### Review mode

1. User submit → tạo `Confession` `pending`, tăng `number`.
2. Bot gửi embed vào `reviewChannelId` gồm: nội dung, ảnh (nếu có), **mention hoặc user id người gửi** cho mod, số confession, nút **Approve** / **Reject**.
3. **Approve:** gửi embed **chỉ ẩn danh** (số + text + ảnh) tới `publicChannelId`; cập nhật `status`, `publicMessageId`, `resolvedAt`; vô hiệu hóa nút hoặc sửa embed trạng thái “Đã duyệt”.
4. **Reject:** set `status: rejected`, `resolvedAt`; cập nhật embed trong kênh duyệt; không đăng public.
5. Cooldown: set **sau khi** accept submission thành công (tạo pending hoặc publish — chốt nhất quán: khuyến nghị set cooldown khi **bắt đầu** xử lý submit thành công để chống spam hàng đợi).

### Button handlers

- Custom id: prefix cố định + `confessionId` (và có thể `guildId` nếu cần lookup nhanh trong giới hạn độ dài Discord).
- Quyền: thành viên có **Manage Messages** mới được Approve/Reject **trong guild đó** (điều hợp lý cho nội dung cần kiểm duyệt).
- Idempotent: nếu `status !== pending` → reply ephemeral “Đã xử lý” / cập nhật message không crash.

## Error Handling & Edge Cases

| Situation | Behavior |
|-----------|----------|
| Chưa setup / không có config | Ephemeral: hướng dẫn admin chạy `/confession setup` |
| `enabled: false` | Ephemeral: tính năng đang tắt |
| Mode review nhưng thiếu `reviewChannelId` (data hỏng) | Từ chối submit; log nội bộ; admin phải setup lại |
| Bot không có quyền gửi file / embed tại kênh đích | Bắt `DiscordAPIError`; ephemeral cho user/mod tùy ngữ cảnh |
| Cooldown active | Ephemeral báo đang trong thời gian chờ |
| Không phải ảnh hoặc >1 attachment | Từ chối với hướng dẫn rõ |
| Text rỗng / quá dài | Validate trước khi tạo document |
| Approve/Reject nhầm guild hoặc confession đã đóng | Từ chối an toàn, idempotent |

## i18n

- Mọi chuỗi user-facing qua `t(locale, key)`; thêm key vào **cả 15** file locale (`en`, `vi`, …) với prefix `confession.*` và `cmd.confession.*`.

## Out of Scope (MVP)

- User-facing `/report` hoặc nút Report trên embed công khai.
- Reply ẩn danh theo thread/message.
- Nhiều kênh confession, custom embed premium, author log cho public.

## Testing & Verification

- `npm run build` phải pass.
- Kiểm tra thủ công trên guild dev: setup instant + review; cooldown; reject/approve; double-click nút; ảnh + text; quyền mod.

## Approval

Design này đã được đồng ý qua brainstorming (Phần 1 + Phần 2). Bước tiếp theo: **implementation plan** (`writing-plans` skill), sau đó code.
