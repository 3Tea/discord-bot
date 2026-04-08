# Confession Moderation Tools — Sub-project 3

**Date:** 2026-04-08
**Status:** Approved
**Scope:** Confession Ban, Keyword Filter, Categories/Tags

## Summary

Add moderation and organization tools to the confession system: ban users from confessing, auto-reject confessions containing blacklisted keywords, and optional category tags on confessions for visual organization.

## Confession Ban

### Subcommands

| Subcommand | Description | Permission |
|------------|-------------|------------|
| `/confession ban <user> [duration] [reason]` | Ban user from confession system | Manage Guild OR Manage Messages |
| `/confession unban <user>` | Remove confession ban | Manage Guild OR Manage Messages |

### Duration Options

String choice on `duration` option:

| Value | Label |
|-------|-------|
| `1h` | 1 hour |
| `6h` | 6 hours |
| `1d` | 1 day |
| `7d` | 7 days |
| `30d` | 30 days |
| *(empty)* | Permanent |

If omitted, ban is permanent (no expiry).

### Data Model — ConfessionBan (new)

```typescript
interface IConfessionBan extends Document {
    guildId: string;
    userId: string;
    moderatorId: string;
    reason: string | null;
    expiresAt: Date | null;   // null = permanent
    active: boolean;          // false when unbanned
}
```

**Indexes:**
- Compound: `{ guildId, userId, active }` — fast lookup during submit

### Ban Check in Submit Flow

Insert ban check **before** cooldown check in `executeSubmit`:

1. Query `ConfessionBan.findOne({ guildId, userId, active: true })`
2. If found and `expiresAt === null` (permanent) → reject with "banned" message
3. If found and `expiresAt > now` → reject with "banned" message showing remaining time
4. If found and `expiresAt <= now` → auto-deactivate ban (`active: false`), proceed normally
5. If not found → proceed normally

### Ban Behavior

- User does NOT know they're banned until they attempt to submit
- Ban applies to confession submit only — voting and replying are unaffected
- Unban sets `active: false` on the ban record (soft delete, preserves audit trail)
- Multiple bans possible (only active one matters)

## Keyword Filter

### Subcommands

| Subcommand | Description | Permission |
|------------|-------------|------------|
| `/confession filter-add <keyword>` | Add keyword to blacklist | Manage Guild |
| `/confession filter-remove <keyword>` | Remove keyword from blacklist | Manage Guild |
| `/confession filter-list` | View all blocked keywords | Manage Guild |

Note: Flat subcommand names (`filter-add` not `filter add`) because Discord.js doesn't allow subcommand groups when the command already has flat subcommands.

### Storage

Add to `GuildConfessionConfig` model:

```typescript
blockedKeywords: { type: [String], default: [] }
```

**Constraints:**
- Each keyword: lowercase, max 50 characters, trimmed
- Maximum 50 keywords per server
- Duplicate keywords rejected

### Matching Logic

- **Case-insensitive:** Both content and keywords compared in lowercase
- **Substring match:** Keyword matches if it appears anywhere in the confession text
- **Check point:** After content validation, before cooldown check in submit flow
- **Scope:** Only confession submit content (not replies)

### Rejection Behavior

- Ephemeral error: "Your confession contains content that is not allowed." (generic, does not reveal which keyword matched)
- No cooldown consumed, no currency deducted

### Filter Subcommand Behavior

- `filter-add`: Lowercase + trim the keyword, check duplicates, check max 50 limit, add to array
- `filter-remove`: Remove from array, error if keyword not found
- `filter-list`: Show all keywords in ephemeral embed, or "No keywords configured" if empty

## Categories/Tags

### Submit Option

Add optional string choice to `/confession submit`:

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `tag` | String | No | Category tag for the confession |

**Choices:**

| Value | EN Label | VI Label |
|-------|----------|----------|
| `heartfelt` | Heartfelt | Tâm sự |
| `funny` | Funny | Hài hước |
| `question` | Question | Hỏi đáp |
| `sharing` | Sharing | Chia sẻ |
| `other` | Other | Khác |

### Data Model

Add to Confession model:

```typescript
tag: { type: String, default: null }
```

Values: `"heartfelt" | "funny" | "question" | "sharing" | "other" | null`

### Display on Embed

Tag shown as a badge on the first line of the confession embed description:

```
Standard confession:
  Color: #9B59B6
  Title: Anonymous Confession (#42)
  Description:
    [🏷️ Heartfelt]
    Your confession text here...

VIP confession:
  Color: #F1C40F
  Title: ✨ Confession (#42)
  Description:
    [🏷️ Funny]
    Your confession text here...
```

If no tag selected, description shows content only (no badge line).

### Tag in Review Mode

Review embed also shows the tag badge so moderators can see it before approving.

### No Other Impact

Tags are display-only. They do not affect voting, replies, pricing, or any other behavior.

## i18n Keys (New)

| Key | EN | VI |
|-----|----|----|
| `cmd.confession.ban.desc` | Ban a user from the confession system | Cấm người dùng khỏi hệ thống confession |
| `cmd.confession.ban.user.desc` | User to ban | Người dùng cần cấm |
| `cmd.confession.ban.duration.desc` | Ban duration (empty = permanent) | Thời hạn cấm (bỏ trống = vĩnh viễn) |
| `cmd.confession.ban.reason.desc` | Reason for ban | Lý do cấm |
| `cmd.confession.unban.desc` | Remove a confession ban | Gỡ lệnh cấm confession |
| `cmd.confession.unban.user.desc` | User to unban | Người dùng cần gỡ cấm |
| `confession.ban_success` | **{{user}}** has been banned from confessions{{duration}}. | **{{user}}** đã bị cấm confession{{duration}}. |
| `confession.ban_duration` | ` for {{time}}` | ` trong {{time}}` |
| `confession.unban_success` | **{{user}}** has been unbanned from confessions. | **{{user}}** đã được gỡ cấm confession. |
| `confession.unban_not_found` | This user is not banned from confessions. | Người dùng này không bị cấm confession. |
| `confession.banned` | You are banned from confessions on this server. | Bạn đã bị cấm confession trong server này. |
| `confession.banned_until` | You are banned from confessions until **{{time}}**. | Bạn bị cấm confession đến **{{time}}**. |
| `cmd.confession.filter_add.desc` | Add a keyword to the confession blacklist | Thêm từ khóa vào danh sách chặn confession |
| `cmd.confession.filter_add.keyword.desc` | Keyword to block | Từ khóa cần chặn |
| `cmd.confession.filter_remove.desc` | Remove a keyword from the blacklist | Xóa từ khóa khỏi danh sách chặn |
| `cmd.confession.filter_remove.keyword.desc` | Keyword to remove | Từ khóa cần xóa |
| `cmd.confession.filter_list.desc` | View all blocked keywords | Xem tất cả từ khóa bị chặn |
| `confession.filter_added` | Keyword **{{keyword}}** added to blacklist. | Đã thêm từ khóa **{{keyword}}** vào danh sách chặn. |
| `confession.filter_removed` | Keyword **{{keyword}}** removed from blacklist. | Đã xóa từ khóa **{{keyword}}** khỏi danh sách chặn. |
| `confession.filter_not_found` | Keyword **{{keyword}}** is not in the blacklist. | Từ khóa **{{keyword}}** không có trong danh sách chặn. |
| `confession.filter_duplicate` | Keyword **{{keyword}}** is already blocked. | Từ khóa **{{keyword}}** đã bị chặn rồi. |
| `confession.filter_max` | Maximum 50 keywords allowed. | Tối đa 50 từ khóa. |
| `confession.filter_list_title` | Blocked Keywords | Từ khóa bị chặn |
| `confession.filter_list_empty` | No keywords configured. | Chưa có từ khóa nào. |
| `confession.keyword_blocked` | Your confession contains content that is not allowed. | Confession của bạn chứa nội dung không được phép. |
| `cmd.confession.submit.tag.desc` | Category tag for your confession | Danh mục cho confession |
| `confession.tag.heartfelt` | Heartfelt | Tâm sự |
| `confession.tag.funny` | Funny | Hài hước |
| `confession.tag.question` | Question | Hỏi đáp |
| `confession.tag.sharing` | Sharing | Chia sẻ |
| `confession.tag.other` | Other | Khác |

## Files Changed

### New Files

| File | Responsibility |
|------|---------------|
| `src/models/confessionBan.model.ts` | ConfessionBan schema + interface |

### Modified Files

| File | Change |
|------|--------|
| `src/models/confession.model.ts` | Add `tag: string \| null` field |
| `src/models/guildConfessionConfig.model.ts` | Add `blockedKeywords: string[]` field |
| `src/services/confession/constants.ts` | Add `CONFESSION_TAGS`, `CONFESSION_KEYWORD_MAX_LENGTH`, `CONFESSION_KEYWORDS_MAX_COUNT` |
| `src/services/confession/confession.service.ts` | Add ban check, keyword filter, tag embed logic, filter-add/remove/list functions |
| `src/commands/slash/confession.ts` | Add 6 new subcommands (ban, unban, filter-add, filter-remove, filter-list, tag option on submit) |
| `src/locales/*.json` (15 files) | Add ~30 new i18n keys |
