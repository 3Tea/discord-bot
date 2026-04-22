# Audit System

> Steering doc for AI assistants and contributors. Covers the dev-only audit pipeline: guild lifecycle tracking, command log bridging, daily snapshots, and the `/audit` slash command.

## Overview

Dual-channel dispatcher writes audit events to Discord text channels configured at runtime. Two MongoDB models (`GuildAudit`, `GuildSnapshot`) persist history; one singleton (`AuditConfig`) holds channel IDs, snapshot toggle, and alert thresholds. A 24h cron captures per-guild member-count snapshots for trend analysis and feeds threshold checks.

## Access Control

All `/audit` subcommands require `isDevAuthorized()`:
- `interaction.guildId === GUILD_ID` (env)
- `interaction.user.id === DEV_USER_ID` (env)

All replies are ephemeral.

## Channels

| Channel | What it receives |
|---|---|
| `criticalChannelId` | Guild join/leave, command errors, admin-command actions, background job errors, startup/daily summaries |
| `commandsChannelId` | Every slash command execute (success or fail). Thread under each batched message replays the bot's reply. |
| `outputsChannelId` | Every non-command bot output: DMs, welcome/goodbye/boost/level-up/milestone notifications, confession posts and replies. Thread under each batched message replays the payload. |

Admin commands that also post to critical: `economy`, `guild-admin`, `commandlog`, `audit` (matched by top-level command name in `AuditService.ADMIN_COMMAND_NAMES`).

Channels are text channels in any guild the bot can reach. Bot must have `ViewChannel | SendMessages | EmbedLinks` — the `/audit setup critical-channel` / `commands-channel` handlers check this before saving.

## Pipeline

### Sources

| Source | Calls |
|---|---|
| `src/events/guildCreate.ts` | `AuditService.onGuildCreate(guild)` |
| `src/events/guildDelete.ts` | `AuditService.onGuildDelete(guild)` |
| `src/events/ready.ts` | `AuditDispatcherService.init(client)` + `AuditService.onReady(client)` |
| `src/events/interactionCreate.ts` | `AuditService.onCommandExecuted(entry)` after `CommandLogService.pushLog(entry)` |
| `src/util/audit/snapshotJob.ts` | `AuditService.snapshotAllGuilds(client)` (24h) |
| `premiumExpiry`, `guildStatsAggregator`, `commandLog.service` | `AuditService.logBackgroundError(jobName, err)` |

### Dispatcher

`AuditDispatcherService` (`src/services/audit/auditDispatcher.service.ts`) buffers embeds per channel (critical / commands). Flush triggers:

| Trigger | Condition |
|---|---|
| Threshold | Queue reaches **10 embeds** |
| Interval | Every **2000 ms** |

Channels are resolved via `client.channels.fetch(channelId)` and cached in memory. Resolution failure (missing channel, no access) nulls the cache entry — subsequent flushes for that channel are dropped until `invalidateChannelCache()` or process restart.

On `SIGINT`/`SIGTERM`, `AuditDispatcherService.drain()` flushes remaining buffers before exit.

## Output Capture

Captures what the bot sends to users — independent of the commands channel which records *what command ran*. Two capture mechanisms coexist:

**Prototype wraps** (applied once in `AuditDispatcherService.init(client)` via `BotOutputAudit.init(client)`):

- `CommandInteraction.prototype.reply` / `editReply` / `followUp`
- `MessageComponentInteraction.prototype.reply` / `editReply` / `followUp`
- `ModalSubmitInteraction.prototype.reply` / `editReply` / `followUp`
- `User.prototype.send` (DMs)

Idempotency: a Symbol marker on the patched prototype prevents double-wrapping.

**Explicit helper** (`BotOutputAudit.record(captured)`):

- `notificationService.sendNotification(guild, channelId, embed, type)` — records after welcome/goodbye/boost/level-up/milestone sends. The `type` parameter feeds the captured `source`.
- `confession.service.ts` — both `sendAnonymousConfessionToChannel` (post) and the reply thread send are recorded.

Loop prevention: captures whose destination channel is an audit channel (or the bot's own user) are short-circuited via `BotOutputAudit.isAuditTarget(channelId, userId)`.

Capture timing: the wrapped methods run the original call first, then await its Promise before recording. Rejected sends (rate limit, token expired) produce no audit entry.

TTL sweep: `interactionCaptures` orphans older than 60s are pruned by a 30s interval registered in `BotOutputAudit.init`.

### Flush logic for the outputs channel

Same threaded pattern as the commands channel:

1. Batch up to 10 entries per flush (or flush when buffer reaches 10 / interval elapses).
2. Send parent message with all audit embeds.
3. `parent.startThread({ autoArchiveDuration: ThreadAutoArchiveDuration.OneDay })` — 24h archive.
4. For each captured output, post a replay message inside the thread with header `↳ Reply to embed #N · source · target [· 👻 ephemeral]`, then the original content / embeds / components (disabled via `disableAll`) / attachments (reused Discord CDN URLs).
5. On attachment send failure: retry once without files, log a warn.
6. On thread creation failure: parent stands, replay dropped, warn logged.

Thread-creation rate limit: 50 threads per 5 minutes per channel. The 2-second flush interval caps audit-channel threads at 30/min per channel under steady state.

Bursts > 10 entries per flush are chunked — each chunk gets its own parent message + thread (not silently dropped).

## Data Models

### `AuditConfig` (singleton)

Collection: `AuditConfigs`. Single doc with `_id: "singleton"`.

| Field | Type | Description |
|---|---|---|
| `_id` | String | Always `"singleton"` |
| `criticalChannelId` | String? | Critical channel, null = disabled |
| `commandsChannelId` | String? | Commands channel, null = disabled |
| `outputsChannelId` | String? | Bot-output audit channel, null = disabled |
| `snapshotEnabled` | Boolean | Toggle daily snapshot cron |
| `alertMemberDropPct` | Number | Member drop % threshold (default 20, 0 = disabled) |
| `alertBgErrorsPerHour` | Number | Background errors/hour threshold (default 10, 0 = disabled) |
| `alertGuildLeavesPerHour` | Number | Guild leaves/hour threshold (default 3, 0 = disabled) |
| `alertRoleId` | String? | Role to ping on alert, null = fall back to `DEV_USER_ID` mention |
| `alertCooldownMinutes` | Number | Cooldown between same-type alerts (default 60) |
| `updatedBy` | String? | Dev userId that last changed config |

Redis cache: key `audit:config`, TTL 300s. Invalidated on any setter.

### `GuildAudit`

Collection: `GuildAudits`. One doc per guild the bot has ever been in.

| Field | Type | Description |
|---|---|---|
| `guildId` | String | Unique |
| `name` | String | Last known name |
| `ownerId` | String | Owner user ID |
| `memberCount` | Number | Last known member count |
| `iconURL` | String? | Guild icon |
| `joinedAt` | Date | When bot first joined |
| `leftAt` | Date? | When bot most recently left |
| `currentlyIn` | Boolean | Bot still in guild |

Indexes: `{guildId}` unique, `{currentlyIn, updatedAt: -1}`.

`onReady` reconciles: upserts guilds in cache, marks guilds not in cache as `currentlyIn=false`.

### `GuildSnapshot`

Collection: `GuildSnapshots`. Insert-only, one doc per guild per day.

| Field | Type |
|---|---|
| `guildId` | String |
| `memberCount` | Number |
| `takenAt` | Date |

Indexes: `{guildId, takenAt: -1}`, `{takenAt: 1}` with `expireAfterSeconds: 90d` (MongoDB TTL monitor drops old docs every 60s).

## Commands

### `/audit setup`

| Subcommand | Behavior |
|---|---|
| `critical-channel channel:#x` | Save critical channel after perm check |
| `commands-channel channel:#x` | Save commands channel after perm check |
| `outputs-channel channel:#x` | Save outputs channel after perm check (requires thread perms: CreatePublicThreads, SendMessagesInThreads) |
| `clear target:<critical\|commands\|outputs>` | Unset the chosen channel |
| `snapshot enabled:<bool>` | Toggle snapshot cron |
| `alert [member-drop-pct] [bg-errors-per-hour] [guild-leaves-per-hour] [role] [clear-role] [cooldown-minutes]` | Update any subset of alert thresholds. Set any threshold to `0` to disable that alert. Provide `role` to set the ping target, or `clear-role:true` to clear it (falls back to dev DM mention). |
| `view` | Show current config + alert thresholds |

### `/audit query`

| Subcommand | Output |
|---|---|
| `guilds page:N` | Paginated list of `currentlyIn: true` guilds sorted by memberCount desc |
| `guild target:<id>` | Metadata + sparkline of last 30 snapshots |
| `history limit:N` | Recent join/leave events |
| `summary` | Realtime totals from `client.guilds.cache` + ever-left count from Mongo |

## Embeds

Pure functions in `src/services/audit/auditEmbeds.ts` (English only — dev facing):

- `guildJoinEmbed` (green)
- `guildLeaveEmbed` (red)
- `commandSuccessEmbed` (blue)
- `commandErrorEmbed` (red)
- `adminActionEmbed` (purple)
- `startupSummaryEmbed` (yellow)
- `snapshotSummaryEmbed` (yellow)
- `backgroundErrorEmbed` (red)
- `memberDropAlertEmbed` (dark red) — triggered by snapshot member-drop threshold
- `rateExceededAlertEmbed` (dark red) — triggered by bg-error or guild-leave per-hour thresholds

## Threshold Alerts

`AlertService` (`src/services/audit/alert.service.ts`) runs in three hot paths and sends **role/user-mention + embed** directly to the critical channel (bypasses buffer) so pings are instant.

| Trigger | Source | Behavior |
|---|---|---|
| Member drop | `AuditService.snapshotAllGuilds` (24h) | Per-guild compares current snapshot vs. the latest prior snapshot in the last 2 days. Guilds whose `dropPct >= alertMemberDropPct` are aggregated into one embed. |
| Background errors/hour | `AuditService.logBackgroundError` | Redis key `audit:alert:counter:bg_errors` (1h TTL). When counter ≥ `alertBgErrorsPerHour`, fires alert. |
| Guild leaves/hour | `AuditService.onGuildDelete` | Redis key `audit:alert:counter:guild_leaves` (1h TTL). Same shape as bg errors. |

Cooldown is per-alert-type via Redis keys:
- `audit:alert:cooldown:member_drop`
- `audit:alert:cooldown:bg_errors`
- `audit:alert:cooldown:guild_leaves`

TTL = `alertCooldownMinutes * 60`. While the cooldown key exists, subsequent trigger events are suppressed (the counter keeps ticking, but no embed is sent). Setting a threshold to `0` disables that alert entirely.

Mention target: `alertRoleId` (`<@&id>`) if set, otherwise `<@DEV_USER_ID>`. `allowedMentions` explicitly permits roles + users so the ping fires even from bot messages.

## Key Files

| File | Purpose |
|---|---|
| `src/models/auditConfig.model.ts` | Singleton config schema |
| `src/models/guildAudit.model.ts` | Guild lifecycle schema |
| `src/models/guildSnapshot.model.ts` | Daily trend schema |
| `src/services/audit/audit.service.ts` | Event orchestrator, admin command list, member-drop detection hook |
| `src/services/audit/auditConfig.service.ts` | Config CRUD + Redis cache (incl. alert thresholds) |
| `src/services/audit/auditDispatcher.service.ts` | Buffered dispatcher + `sendAlert()` direct-send path |
| `src/services/audit/alert.service.ts` | Threshold checks, counters, cooldowns |
| `src/services/audit/auditEmbeds.ts` | Embed builders (incl. alert embeds) |
| `src/services/audit/botOutputAudit.service.ts` | Capture layer: prototype patches + record() helper for outputs audit |
| `src/events/guildCreate.ts` | Join handler |
| `src/events/guildDelete.ts` | Leave handler |
| `src/commands/slash/audit.ts` | Dev slash command |
| `src/util/audit/snapshotJob.ts` | 24h cron |

## Cross-References

- [command-logging.md](command-logging.md) — `CommandLog` model + `/commandlog` (separate from `/audit`, coexists)
- [premium-system.md](premium-system.md) — pattern for Redis-cached config + background expiry
