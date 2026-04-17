# Audit System

> Steering doc for AI assistants and contributors. Covers the dev-only audit pipeline: guild lifecycle tracking, command log bridging, daily snapshots, and the `/audit` slash command.

## Overview

Dual-channel dispatcher writes audit events to Discord text channels configured at runtime. Two MongoDB models (`GuildAudit`, `GuildSnapshot`) persist history; one singleton (`AuditConfig`) holds channel IDs and toggles. A 24h cron captures per-guild member-count snapshots for trend analysis.

## Access Control

All `/audit` subcommands require `isDevAuthorized()`:
- `interaction.guildId === GUILD_ID` (env)
- `interaction.user.id === DEV_USER_ID` (env)

All replies are ephemeral.

## Channels

| Channel | What it receives |
|---|---|
| `criticalChannelId` | Guild join/leave, command errors, admin-command actions, background job errors, startup/daily summaries |
| `commandsChannelId` | Every slash command execute (success or fail) |

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

## Data Models

### `AuditConfig` (singleton)

Collection: `AuditConfigs`. Single doc with `_id: "singleton"`.

| Field | Type | Description |
|---|---|---|
| `_id` | String | Always `"singleton"` |
| `criticalChannelId` | String? | Critical channel, null = disabled |
| `commandsChannelId` | String? | Commands channel, null = disabled |
| `snapshotEnabled` | Boolean | Toggle daily snapshot cron |
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

Index: `{guildId, takenAt: -1}`. No TTL.

## Commands

### `/audit setup`

| Subcommand | Behavior |
|---|---|
| `critical-channel channel:#x` | Save critical channel after perm check |
| `commands-channel channel:#x` | Save commands channel after perm check |
| `clear target:<critical\|commands>` | Unset the chosen channel |
| `snapshot enabled:<bool>` | Toggle snapshot cron |
| `view` | Show current config |

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

## Key Files

| File | Purpose |
|---|---|
| `src/models/auditConfig.model.ts` | Singleton config schema |
| `src/models/guildAudit.model.ts` | Guild lifecycle schema |
| `src/models/guildSnapshot.model.ts` | Daily trend schema |
| `src/services/audit/audit.service.ts` | Event orchestrator, admin command list |
| `src/services/audit/auditConfig.service.ts` | Config CRUD + Redis cache |
| `src/services/audit/auditDispatcher.service.ts` | Buffered dispatcher |
| `src/services/audit/auditEmbeds.ts` | Embed builders |
| `src/events/guildCreate.ts` | Join handler |
| `src/events/guildDelete.ts` | Leave handler |
| `src/commands/slash/audit.ts` | Dev slash command |
| `src/util/audit/snapshotJob.ts` | 24h cron |

## Cross-References

- [command-logging.md](command-logging.md) — `CommandLog` model + `/commandlog` (separate from `/audit`, coexists)
- [premium-system.md](premium-system.md) — pattern for Redis-cached config + background expiry
