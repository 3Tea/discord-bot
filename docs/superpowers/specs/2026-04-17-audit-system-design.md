# Audit System — Design Spec

**Date**: 2026-04-17
**Status**: Draft → Awaiting user review
**Author**: Claude (brainstormed with @ds112)

## 1. Goal

Cung cấp một hệ thống **audit** cho bot 3AT để dev có thể debug và giám sát hoạt động runtime:

1. Biết bot đang có mặt ở những guild nào (tên, owner, member count, ngày join).
2. Nhận notification realtime khi bot join/leave guild.
3. Track command execution (ai, lệnh gì, ở guild nào, thành công hay lỗi).
4. Phát hiện sự cố sớm (command errors, background job errors, mass-leave event).
5. Xem trend member count theo thời gian (daily snapshot).

Access dev-only (giống `/commandlog`): cả slash command lẫn config chỉ dev user được dùng.

## 2. Scope

### In scope

- Dual Discord channel dispatcher (critical + commands) — bot gửi embed vào channel được setup qua slash command.
- 2 Mongoose model: `GuildAudit` (lifecycle metadata per guild) và `GuildSnapshot` (daily trend).
- 1 singleton model: `AuditConfig` (channel setup + toggles).
- 2 event handlers mới: `guildCreate`, `guildDelete`.
- Update `ready` event để reconcile guild list khi bot khởi động.
- Update `interactionCreate` để bridge command execution → audit dispatcher.
- 1 cron job: daily snapshot (24h interval).
- 1 slash command `/audit` với subcommand groups: `setup`, `query`.

### Out of scope

- Không thay thế `/commandlog` (đã tồn tại, vẫn dùng song song cho query chi tiết từ MongoDB).
- Không làm dashboard web/external — chỉ Discord.
- Không track voice state / message event / reaction event.
- Không export CSV / báo cáo PDF.
- Không có notification cho guild admin — feature này chỉ dành cho bot dev.

## 3. Architecture

```
Sources                          Core                       Destinations
─────────                        ─────                      ─────────────

guildCreate event ──┐
guildDelete event ──┤
ready event ────────┤
interactionCreate ──┼──▶  AuditService  ──┬──▶  MongoDB  (GuildAudit, GuildSnapshot)
premiumExpiry job ──┤         │           │
snapshot cron ──────┘         │           └──▶  AuditDispatcherService
                              │                       │
                         AuditConfig            ┌─────┴──────┐
                         (cached)               ▼            ▼
                                         #critical     #commands
                                         (text ch)     (text ch)
```

**Critical channel** nhận: bot join/leave guild, command errors, admin action commands, premium transaction events, background job errors, startup summary, daily snapshot summary.

**Commands channel** nhận: mọi slash command execute (success hoặc fail).

Cả hai đều là Discord text channel — bot post bằng `channel.send({ embeds: [...] })` thông qua Discord.js client.

## 4. Data Models

### 4.1 `AuditConfig` (singleton)

**File**: `src/models/auditConfig.model.ts`
**Collection**: `AuditConfigs` (chỉ chứa đúng 1 doc)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | String | yes | `"singleton"` | Force 1 doc duy nhất |
| `criticalChannelId` | String | no | `undefined` | Channel cho critical events |
| `commandsChannelId` | String | no | `undefined` | Channel cho command log |
| `snapshotEnabled` | Boolean | yes | `true` | Bật/tắt daily snapshot cron |
| `updatedBy` | String | no | — | Dev userId đổi config gần nhất |
| `createdAt` | Date | auto | — | Timestamps |
| `updatedAt` | Date | auto | — | Timestamps |

**Redis cache**: key `audit:config`, TTL 300s (5 min). Invalidate (delete key) khi có update.

### 4.2 `GuildAudit` (lifecycle metadata)

**File**: `src/models/guildAudit.model.ts`
**Collection**: `GuildAudits`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `guildId` | String | yes | — | Discord guild ID, unique index |
| `name` | String | yes | — | Guild name (last known) |
| `ownerId` | String | yes | — | Owner user ID |
| `memberCount` | Number | yes | 0 | Last known member count |
| `iconURL` | String | no | — | Guild icon |
| `joinedAt` | Date | yes | — | Khi bot join guild lần đầu |
| `leftAt` | Date | no | — | Khi bot leave (nullable) |
| `currentlyIn` | Boolean | yes | true | Bot còn trong guild hay không |
| `createdAt` | Date | auto | — | Timestamps |
| `updatedAt` | Date | auto | — | Timestamps |

**Indexes**:
- `{ guildId: 1 }` unique
- `{ currentlyIn: 1, updatedAt: -1 }` cho query danh sách guild hiện tại

**Upsert logic**:
- `guildCreate`: upsert doc (`joinedAt = now` nếu mới, `currentlyIn = true`, `leftAt = null`, refresh metadata).
- `guildDelete`: set `leftAt = now`, `currentlyIn = false` (giữ metadata cho lịch sử).
- `ready` reconcile: với mỗi guild trong `client.guilds.cache`, upsert/refresh. Với mỗi `GuildAudit` có `currentlyIn=true` nhưng không trong cache → mark `currentlyIn=false`, `leftAt=now`.

### 4.3 `GuildSnapshot` (daily trend)

**File**: `src/models/guildSnapshot.model.ts`
**Collection**: `GuildSnapshots`

| Field | Type | Required | Description |
|---|---|---|---|
| `guildId` | String | yes | Guild ID |
| `memberCount` | Number | yes | Member count tại thời điểm snapshot |
| `takenAt` | Date | yes | Thời điểm snapshot |
| `createdAt` | Date | auto | Timestamps |

**Indexes**:
- `{ guildId: 1, takenAt: -1 }` cho query trend per-guild

**Insert-only**. Không có TTL — 1 doc/guild/ngày rất nhỏ.

## 5. Services

### 5.1 `AuditConfigService`

**File**: `src/services/audit/auditConfig.service.ts`

| Function | Signature | Description |
|---|---|---|
| `getConfig` | `() => Promise<IAuditConfig>` | Load từ Redis cache, fallback Mongo, tạo singleton nếu chưa có |
| `setCriticalChannel` | `(channelId, updatedBy) => Promise<void>` | Update + invalidate cache |
| `setCommandsChannel` | `(channelId, updatedBy) => Promise<void>` | Update + invalidate cache |
| `clearChannel` | `(target: "critical" \| "commands", updatedBy) => Promise<void>` | Xóa channel (unset field) |
| `setSnapshotEnabled` | `(enabled, updatedBy) => Promise<void>` | Toggle snapshot cron |

### 5.2 `AuditDispatcherService`

**File**: `src/services/audit/auditDispatcher.service.ts`

Chịu trách nhiệm deliver embed tới channel. Buffered để không spam rate limit.

**State**:
- `criticalQueue: EmbedPayload[]`
- `commandsQueue: EmbedPayload[]`
- `flushTimer: NodeJS.Timeout | null`
- `channelCache: Map<string, TextChannel | null>` — cache channel object hoặc `null` nếu lookup fail (không retry mỗi lần flush)

**Config**:
- Flush interval: 2000ms
- Buffer threshold: 10 embeds → flush ngay
- Mỗi batch max 10 embeds (Discord cho phép 10 embed/message)

**Methods**:
| Function | Description |
|---|---|
| `init(client)` | Lưu `client` reference, start flush timer |
| `pushCritical(embed)` | Push vào critical queue |
| `pushCommands(embed)` | Push vào commands queue |
| `flush()` | Flush cả 2 queue, tối đa 10 embed/message |
| `invalidateChannelCache()` | Clear cache khi config đổi |

**Channel resolution**:
```typescript
async function resolveChannel(channelId: string): Promise<TextChannel | null> {
    if (channelCache.has(channelId)) return channelCache.get(channelId) ?? null;
    try {
        const ch = await client.channels.fetch(channelId);
        if (ch?.isTextBased() && !ch.isDMBased()) {
            channelCache.set(channelId, ch as TextChannel);
            return ch as TextChannel;
        }
    } catch { /* fallthrough */ }
    channelCache.set(channelId, null);
    logger.warn(`[AuditDispatcher] channel ${channelId} not reachable — disabling until restart or re-setup`);
    return null;
}
```

**Flush logic**:
- Load `AuditConfig` mỗi lần flush (cached, rẻ).
- Nếu `criticalChannelId` unset → drop critical queue (không lỗi).
- Nếu `commandsChannelId` unset → drop commands queue.
- Resolve channel qua cache. Nếu null → drop queue tương ứng lần này (sẽ thử lại sau khi re-setup).
- Send embeds. Nếu `DiscordAPIError.code === 50001 (Missing Access)` hoặc `50013 (Missing Permissions)` → log warning + null cache channel.

**Graceful shutdown**: thêm `drain()` gọi trong `SIGINT`/`SIGTERM` handler của `src/bin/www.ts`.

### 5.3 `AuditService`

**File**: `src/services/audit/audit.service.ts`

Orchestrator — nơi duy nhất các event handler gọi.

| Function | Signature | Description |
|---|---|---|
| `onGuildCreate` | `(guild: Guild) => Promise<void>` | Upsert GuildAudit, push embed critical |
| `onGuildDelete` | `(guild: Guild) => Promise<void>` | Mark `currentlyIn=false`, push embed critical |
| `onReady` | `(client: Client) => Promise<void>` | Reconcile GuildAudit, push startup summary critical |
| `onCommandExecuted` | `(entry: CommandLogEntry, client: Client) => void` | Push commands embed; nếu error hoặc admin cmd → push critical embed |
| `snapshotAllGuilds` | `(client: Client) => Promise<void>` | Bulk insert GuildSnapshot, update GuildAudit.memberCount, push summary critical |
| `logBackgroundError` | `(jobName: string, error: Error) => void` | Helper cho premium expiry / stats aggregator bắt lỗi |

**Admin command list** (post vào critical webhook):
- `economy` + subcommand group `admin` hoặc `bulk`
- `guild-admin` (mọi subcommand)
- `commandlog` (mọi subcommand)
- `audit` (mọi subcommand)

Định nghĩa là array const trong `audit.service.ts` — dễ thêm sau này.

### 5.4 `auditEmbeds.ts`

**File**: `src/services/audit/auditEmbeds.ts`

Pure functions build embed — không i18n (dev-facing, English only). Keep colors consistent:
- Green `#22c55e` — bot joined guild
- Red `#ef4444` — bot left guild, command error, background error
- Blue `#3b82f6` — command success
- Purple `#a855f7` — admin action
- Yellow `#eab308` — startup summary, snapshot summary

| Function | Input | Output |
|---|---|---|
| `guildJoinEmbed` | `guild, totalGuildsNow` | EmbedBuilder |
| `guildLeaveEmbed` | `guildAudit, totalGuildsNow` | EmbedBuilder |
| `commandSuccessEmbed` | `entry` | EmbedBuilder |
| `commandErrorEmbed` | `entry` | EmbedBuilder |
| `adminActionEmbed` | `entry` | EmbedBuilder |
| `startupSummaryEmbed` | `{ totalGuilds, totalMembers, topGuilds }` | EmbedBuilder |
| `snapshotSummaryEmbed` | `{ totalGuilds, totalMembers, delta, top5 }` | EmbedBuilder |
| `backgroundErrorEmbed` | `jobName, error` | EmbedBuilder |

## 6. Events

### 6.1 `src/events/guildCreate.ts` (new)

```typescript
import { Events, Guild } from "discord.js";
import { AuditService } from "../services/audit/audit.service";

export default {
    name: Events.GuildCreate,
    once: false,
    async execute(guild: Guild) {
        await AuditService.onGuildCreate(guild);
    },
};
```

### 6.2 `src/events/guildDelete.ts` (new)

```typescript
import { Events, Guild } from "discord.js";
import { AuditService } from "../services/audit/audit.service";

export default {
    name: Events.GuildDelete,
    once: false,
    async execute(guild: Guild) {
        await AuditService.onGuildDelete(guild);
    },
};
```

### 6.3 `src/events/ready.ts` (update)

Sau existing logic, thêm:
```typescript
await AuditService.onReady(client);
AuditDispatcherService.init(client);
```

### 6.4 `src/events/interactionCreate.ts` (update)

Sau `CommandLogService.pushLog(entry)`, thêm:
```typescript
AuditService.onCommandExecuted(entry, interaction.client);
```

Fire-and-forget, không await để không block interaction response.

## 7. Cron Job

**File**: `src/util/audit/snapshotJob.ts`

```typescript
import { Client } from "discord.js";
import { AuditService } from "../../services/audit/audit.service";
import { AuditConfigService } from "../../services/audit/auditConfig.service";
import { logger } from "../log/logger.mixed";

const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

let timer: ReturnType<typeof setInterval> | null = null;

export function startAuditSnapshotJob(client: Client): void {
    if (timer) return;
    timer = setInterval(async () => {
        try {
            const config = await AuditConfigService.getConfig();
            if (!config.snapshotEnabled) return;
            await AuditService.snapshotAllGuilds(client);
        } catch (error) {
            logger.error(`[auditSnapshotJob] ${error instanceof Error ? error.message : "Unknown"}`);
        }
    }, INTERVAL_MS);
}
```

Khởi động trong `src/bin/www.ts` sau khi mongo connect (giống `startPremiumExpiry`).

**Lần đầu chạy sau 24h kể từ startup** — không chạy ngay (vì đã có startup summary ở `onReady`).

## 8. Slash Command `/audit`

**File**: `src/commands/slash/audit.ts`
**Access**: Dev-only (reuse `isDevAuthorized()` từ `/commandlog`)

### 8.1 Subcommand groups

```
/audit setup critical-channel channel:<#channel>
/audit setup commands-channel channel:<#channel>
/audit setup clear target:<critical|commands>
/audit setup snapshot enabled:<bool>
/audit setup view

/audit query guilds page:<int>
/audit query guild target:<string guild-id>
/audit query history limit:<int 1-25>
/audit query summary
```

### 8.2 Detailed behavior

**`/audit setup critical-channel channel:#x`**
- Permission check: bot phải có `ViewChannel | SendMessages | EmbedLinks` trong `#x`.
- Nếu thiếu → ephemeral reply "Bot is missing permissions in that channel".
- `AuditConfigService.setCriticalChannel(channelId, userId)` + invalidate cache + invalidate dispatcher channel cache.
- Reply success ephemeral.

**`/audit setup commands-channel channel:#x`**: giống trên.

**`/audit setup clear target:critical|commands`**
- `AuditConfigService.clearChannel(target, userId)`.
- Reply confirm.

**`/audit setup snapshot enabled:true|false`**
- Toggle `AuditConfig.snapshotEnabled`.

**`/audit setup view`**
- Reply embed hiện trạng: critical channel (mention hoặc "not set"), commands channel, snapshot enabled/disabled, updatedBy, updatedAt.

**`/audit query guilds page:1`**
- Aggregate `GuildAudit.find({ currentlyIn: true }).sort({ memberCount: -1 }).skip(10*(page-1)).limit(10)`.
- Embed: table (guild name, member count, owner, joined ago).
- Total count ở footer.

**`/audit query guild target:<guildId>`**
- Fetch `GuildAudit` + last 30 `GuildSnapshot` của guild đó.
- Embed: metadata + sparkline member count (text bar chart — 30 ký tự Unicode block ▁▂▃...).

**`/audit query history limit:N`** (default 20, max 25)
- `GuildAudit.find().sort({ updatedAt: -1 }).limit(N)`.
- Embed: list các event join/leave gần nhất. Mỗi row: icon (🟢/🔴) + guild name + timestamp relative.

**`/audit query summary`**
- Realtime từ `client.guilds.cache`:
   - Total guilds, total members
   - Top 10 guild theo memberCount
   - Count of guilds bot từng ở (`currentlyIn: false`)
- Embed với fields.

## 9. Config (env vars)

**Bỏ** (không cần):
- Không thêm env var nào cho audit. Tất cả config qua `/audit setup`.

**Giữ nguyên** (đã có sẵn):
- `DEV_USER_ID` — authorization check.
- `GUILD_ID` — authorization check (chỉ chạy `/audit` trong dev guild).

## 10. File Changes

### New files

| File | Purpose |
|---|---|
| `src/models/auditConfig.model.ts` | Singleton config schema |
| `src/models/guildAudit.model.ts` | Guild lifecycle schema |
| `src/models/guildSnapshot.model.ts` | Daily trend schema |
| `src/services/audit/audit.service.ts` | Event orchestrator |
| `src/services/audit/auditConfig.service.ts` | Config CRUD + cache |
| `src/services/audit/auditDispatcher.service.ts` | Buffered channel dispatcher |
| `src/services/audit/auditEmbeds.ts` | Embed builders |
| `src/events/guildCreate.ts` | Join event handler |
| `src/events/guildDelete.ts` | Leave event handler |
| `src/commands/slash/audit.ts` | Dev slash command |
| `src/util/audit/snapshotJob.ts` | Daily cron |
| `docs/steering/audit-system.md` | Steering doc |

### Modified files

| File | Change |
|---|---|
| `src/events/ready.ts` | Call `AuditService.onReady(client)` + `AuditDispatcherService.init(client)` |
| `src/events/interactionCreate.ts` | Call `AuditService.onCommandExecuted(entry, client)` after `pushLog` |
| `src/services/premium/premiumExpiry.ts` | Wrap catch → `AuditService.logBackgroundError("premiumExpiry", err)` |
| `src/util/xp/guildStatsAggregator.ts` | Same wrap for background errors |
| `src/services/commandLog.service.ts` | Same wrap for flush errors |
| `src/bin/www.ts` | `startAuditSnapshotJob(client)` after mongo connect |
| `src/util/help/commandCategories.ts` | Add `/audit` to Dev category |
| `src/commands/slash/commandlog.ts` | (no change — still exists) |
| `CHANGELOG.md` | Add entry under `[Unreleased]` |
| `CLAUDE.md` | Add reference to audit system in services section + doc table |

## 11. Data flow scenarios

### Scenario A: Bot được invite vào guild mới

1. Discord fires `guildCreate` → `src/events/guildCreate.ts` → `AuditService.onGuildCreate(guild)`.
2. Upsert `GuildAudit` (new doc: `joinedAt=now`, `currentlyIn=true`, memberCount).
3. `AuditDispatcherService.pushCritical(guildJoinEmbed(guild, totalGuildsNow))`.
4. Sau ≤2s, dispatcher flush vào critical channel.

### Scenario B: User chạy `/pray @target` fail

1. `interactionCreate` bắt interaction, execute command fail.
2. `CommandLogService.pushLog(entry)` — lưu Mongo.
3. `AuditService.onCommandExecuted(entry, client)`:
    - Vì `entry.success === false` → `pushCommands(commandErrorEmbed(entry))` + `pushCritical(commandErrorEmbed(entry))` (cùng embed, post vào cả 2 channel).
    - Nếu success: chỉ `pushCommands(commandSuccessEmbed(entry))`. Riêng admin command → thêm `pushCritical(adminActionEmbed(entry))`.
4. Dispatcher flush.

### Scenario C: Daily snapshot (24h sau startup)

1. Cron tick → `AuditService.snapshotAllGuilds(client)`.
2. Iterate `client.guilds.cache`:
    - BulkWrite: insert `GuildSnapshot` doc (guildId, memberCount, takenAt=now) cho mỗi guild.
    - Update `GuildAudit.memberCount` để keep metadata fresh.
3. Query snapshot hôm qua để tính delta.
4. `pushCritical(snapshotSummaryEmbed({ totalGuilds, totalMembers, delta, top5 }))`.

### Scenario D: Dev setup channel lần đầu

1. `/audit setup critical-channel channel:#bot-audit`.
2. `isDevAuthorized()` pass.
3. Permission check: `channel.permissionsFor(client.user)` has `ViewChannel | SendMessages | EmbedLinks`.
4. `AuditConfigService.setCriticalChannel(channel.id, interaction.user.id)`.
5. Reply ephemeral "Critical channel set to #bot-audit".
6. Queued embeds từ bot startup (nếu có) giờ sẽ flush thành công.

## 12. Testing Strategy

No test framework configured → manual test checklist:

1. Setup channel via `/audit setup critical-channel`, verify `AuditConfig` doc trong Mongo.
2. Restart bot, verify startup summary post vào critical channel.
3. Bot được invite vào test guild → verify join embed.
4. Bot bị kick khỏi test guild → verify leave embed + `GuildAudit.currentlyIn=false`.
5. Chạy command bất kỳ → verify commands channel nhận embed.
6. Chạy `/economy admin dashboard` → verify cả critical lẫn commands channel nhận embed.
7. Force command throw → verify error embed vào cả 2 channel.
8. Tạm set `INTERVAL_MS=60000` (1 phút) trong snapshotJob, chờ 1 phút → verify snapshot summary + `GuildSnapshot` docs mới.
9. `/audit query guilds` → verify list match thực tế.
10. `/audit query guild target:<id>` → verify sparkline hiển thị đúng.
11. `/audit setup clear target:commands` → verify commands embeds không còn được post.
12. Set channel tới channel bot không có quyền send → verify graceful disable + warning log.

## 13. Open Questions / Assumptions

Assumptions đã fix trong design:

1. **Admin command list**: `economy admin/bulk`, `guild-admin`, `commandlog`, `audit` — có thể thêm sau qua const array.
2. **Webhook failure**: channel không reach được → null cache, drop queue, không retry trong session. Re-setup qua `/audit setup ...` để reset.
3. **Snapshot retention**: không TTL, giữ mãi. ~50 guild × 365 ngày = 18k doc/năm — negligible.
4. **Dev-only**: cả setup lẫn query đều require `isDevAuthorized()`. Guild admin không có access.
5. **Locale**: embeds English only (dev-facing).
6. **Startup summary không chờ dispatcher ready**: `onReady` trigger trước `DispatcherService.init(client)` nhưng queue được init sẵn → push vào queue OK, flush sau khi init.

Chưa giải quyết:
- Nếu bot scale lên 1000+ guild, snapshot bulkWrite nặng → **out of scope** cho version này, sẽ throttle nếu cần.
- Privacy/GDPR cho `CommandLog` + `GuildAudit` — giả định dev self-hosted, không public.

## 14. Rollout

Single PR, single version bump (`v5.7.0` theo semver — minor feature).

Order khi implement:
1. Models (3 files).
2. AuditConfigService + AuditDispatcherService.
3. AuditService + auditEmbeds.
4. Events (guildCreate, guildDelete) + wire `ready`, `interactionCreate`.
5. snapshotJob + wire `www.ts`.
6. Slash command `/audit` với setup subcommands.
7. Slash command `/audit query` subcommands.
8. Steering doc + CHANGELOG + CLAUDE.md update.
9. Deploy commands (`npm run start:dev`).

## 15. References

- `docs/steering/command-logging.md` — pattern cho dev-only command + buffered writes.
- `docs/steering/premium-system.md` — pattern cho Redis-cached config + background job expiry.
- `src/services/commandLog.service.ts` — reference implementation cho buffered flush.
- `src/services/premium/premiumExpiry.ts` — reference cho background cron job.
