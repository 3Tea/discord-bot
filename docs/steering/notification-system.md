# Notification System

> Steering doc for AI assistants and contributors. Covers guild notifications -- welcome, goodbye, level-up, boost, and milestone -- with per-guild configuration, Redis caching, and locale-aware embeds.

## Overview

Each server can enable five notification types independently. Notifications are sent as embeds to a configured text channel. All user-facing text uses `resolveGuildLocale()` for locale resolution. Configuration is stored per-guild per-type in MongoDB with a 5-minute Redis cache layer.

## Notification Types

| Type | Value | Trigger Event | Default State | Channel Fallback |
|------|-------|---------------|---------------|------------------|
| **Welcome** | `welcome` | `GuildMemberAdd` | Disabled | None (requires config) |
| **Goodbye** | `goodbye` | `GuildMemberRemove` | Disabled | None (requires config) |
| **Level Up** | `level_up` | XP level change in `MessageCreate` / `VoiceStateUpdate` | Disabled | Current channel (message XP only) |
| **Boost** | `boost` | `GuildMemberUpdate` (new boost detected) | Disabled | None (requires config) |
| **Milestone** | `milestone` | `GuildMemberAdd` (member count hits threshold) | Disabled | None (requires config) |

All types require both `enabled: true` and a valid `channelId` to fire, except level-up from message XP which falls back to the message's channel when `channelId` is null.

## Configuration (`/settings notifications`)

All notification subcommands require `ManageGuild` permission. Responses are ephemeral.

| Subcommand | Parameters | Action |
|------------|-----------|--------|
| `view` | None | Shows all 5 types with enabled/disabled status, channel, and milestone thresholds |
| `toggle` | `type` (required) | Atomically flips `enabled` for the given type |
| `channel` | `type` (required), `channel` (required, text only) | Sets target channel; validates bot has `SendMessages` + `EmbedLinks` before saving |
| `milestone-thresholds` | `thresholds` (required, comma-separated) | Parses, validates (>0, <=1,000,000), sorts ascending, stores on milestone config |

### Toggle Behavior

Toggle uses a two-step MongoDB update: first upserts the document (ensuring it exists), then atomically flips `enabled` via aggregation pipeline (`$not`). Cache is invalidated after every write.

### Channel Validation

Before saving a channel assignment, the bot checks its own permissions in the target channel. If `SendMessages` or `EmbedLinks` is missing, the command returns an error and does not save.

## Embed Builders

All builders are in `src/services/notification/notificationEmbeds.ts`. Each accepts a `SupportedLocale` and returns an `EmbedBuilder`. The `sendNotification` function appends the global footer if the embed has no footer set.

| Builder | Color | Thumbnail | Dynamic Interpolations |
|---------|-------|-----------|----------------------|
| `buildWelcomeEmbed` | `0x57F287` (green) | Member avatar (256px) | `user` (mention), `server` (guild name), `memberCount` |
| `buildGoodbyeEmbed` | `0xED4245` (red) | Member avatar (256px) | `username`, `server` (guild name) |
| `buildLevelUpEmbed` | `0xFEE75C` (yellow) | User avatar (256px) | `user` (mention), `level`, `progressBar` (block chars), `currentXP`, `requiredXP` |
| `buildBoostEmbed` | `0xF47FFF` (pink) | Member avatar (256px) | `user` (mention), `boostCount` (server total) |
| `buildMilestoneEmbed` | `0x5865F2` (blurple) | Guild icon (256px, if set) | `server` (guild name), `memberCount` |

### Level-Up Progress Bar

Uses `progressToNextLevel()` from `src/util/xp/calculator.ts`. Renders a 10-character bar with filled blocks and empty blocks based on percentage to next level.

### Translation Keys

All embed text uses keys under `notification.*`:

| Key Pattern | Used By |
|-------------|---------|
| `notification.welcome.title` / `.description` | Welcome embed |
| `notification.goodbye.title` / `.description` | Goodbye embed |
| `notification.level_up.title` / `.description` | Level-up embed |
| `notification.boost.title` / `.description` | Boost embed |
| `notification.milestone.title` / `.description` | Milestone embed |
| `notification.settings.*` | Settings subcommand responses |

See [i18n section in CLAUDE.md](../../CLAUDE.md) for locale resolution and key conventions.

## Events

### `guildMemberAdd.ts`

Fires on `Events.GuildMemberAdd`. Handles two notification types in sequence:

1. **Welcome**: Fetches welcome config, sends `buildWelcomeEmbed` if enabled + channel set
2. **Milestone**: Fetches milestone config, checks `memberCount` against thresholds (default `[50, 100, 250, 500, 1000]`), sends `buildMilestoneEmbed` on exact match

Both configs are fetched independently. Locale resolved once via `resolveGuildLocale(guildId)`.

### `guildMemberRemove.ts`

Fires on `Events.GuildMemberRemove`. Skips partial members. Sends `buildGoodbyeEmbed` if goodbye config is enabled + channel set.

### `guildMemberUpdate.ts`

Fires on `Events.GuildMemberUpdate`. Detects new boosts only:

- Fetches full member if partial (`oldMember.partial` -> `oldMember.fetch()`)
- Condition: `oldMember.premiumSince === null` AND `newMember.premiumSince !== null`
- Sends `buildBoostEmbed` if boost config is enabled + channel set

Does not fire for existing boosters or when a boost is removed.

### Level-Up Notifications (in XP events)

Handled inline in `messageCreate.ts` and `voiceStateUpdate.ts`, not in a dedicated event file:

- **Message XP**: After level-up detection, checks level-up config. Falls back to `message.channel.id` if `channelId` is null
- **Voice XP**: After level-up detection, checks level-up config. Requires `channelId` to be set (no fallback channel available)

## Data Model

### GuildNotificationConfig

Collection: `GuildNotificationConfigs`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `guildId` | String | required | Discord guild ID |
| `type` | String (enum) | required | `welcome` / `goodbye` / `level_up` / `boost` / `milestone` |
| `enabled` | Boolean | `false` | Whether this notification type is active |
| `channelId` | String / null | `null` | Target text channel ID |
| `options.thresholds` | Number[] | `undefined` | Milestone-only: member count thresholds |
| `createdAt` | Date | auto | Mongoose timestamp |
| `updatedAt` | Date | auto | Mongoose timestamp |

**Indexes**: Unique compound `(guildId, type)` -- one config document per notification type per guild.

**Upsert pattern**: All reads and writes use `findOneAndUpdate` with `$setOnInsert` and `upsert: true`, so config documents are created on first access with defaults.

## Redis Caching

| Key Pattern | Value | TTL |
|-------------|-------|-----|
| `notification_config:{guildId}:{type}` | Full config object (JSON) | 300s (5 min) |

### Cache Flow

1. `getNotificationConfig()` checks Redis first
2. On miss: queries MongoDB (upserts if absent), caches result
3. On hit: returns cached object directly

### Invalidation

`invalidateNotificationCache(guildId, type)` deletes the Redis key. Called after every settings mutation (`toggle`, `channel`, `milestone-thresholds`).

## Permission Requirements

### Bot Permissions

The bot requires both permissions in the target notification channel:

| Permission | Flag | Required For |
|------------|------|-------------|
| `SendMessages` | `PermissionFlagsBits.SendMessages` | Sending the notification embed |
| `EmbedLinks` | `PermissionFlagsBits.EmbedLinks` | Rich embed rendering |

Checked at two points:
1. **Configuration time**: `/settings notifications channel` validates before saving
2. **Send time**: `sendNotification()` checks before each send; silently returns `false` on failure

### User Permissions

| Command | Required Permission |
|---------|-------------------|
| `/settings notifications view` | `ManageGuild` |
| `/settings notifications toggle` | `ManageGuild` |
| `/settings notifications channel` | `ManageGuild` |
| `/settings notifications milestone-thresholds` | `ManageGuild` |

### Intent Requirements

The `GuildMembers` privileged intent is required for `GuildMemberAdd`, `GuildMemberRemove`, and `GuildMemberUpdate` events. This intent must be enabled in the Discord Developer Portal.

## Service Architecture

### `notificationService.ts`

| Export | Signature | Description |
|--------|-----------|-------------|
| `getNotificationConfig` | `(guildId: string, type: NotificationType) => Promise<IGuildNotificationConfig>` | Redis-cached config lookup with upsert-on-miss |
| `invalidateNotificationCache` | `(guildId: string, type: NotificationType) => Promise<void>` | Deletes Redis cache key for a specific config |
| `sendNotification` | `(guild: Guild, channelId: string, embed: EmbedBuilder) => Promise<boolean>` | Validates channel + permissions, appends footer, sends embed. Returns `false` on any failure |

### `notificationEmbeds.ts`

Five pure builder functions (no side effects, no DB calls). Each takes typed parameters and a `SupportedLocale`, returns an `EmbedBuilder`. All user-facing strings resolved via `t(locale, key, interpolations)`.

### Error Handling

- Event handlers wrap all logic in try/catch, log errors via `logger.error()`, and never throw to the Discord.js event loop
- `sendNotification()` catches all errors internally, returns `boolean` success indicator
- Partial members are handled: `guildMemberRemove` skips partials, `guildMemberUpdate` fetches full member

## File Map

| File | Purpose |
|------|---------|
| `src/models/guildNotificationConfig.model.ts` | Mongoose schema, `NotificationType` enum, `IGuildNotificationConfig` interface |
| `src/services/notification/notificationService.ts` | Config retrieval, cache management, embed delivery |
| `src/services/notification/notificationEmbeds.ts` | Embed builders for all 5 notification types |
| `src/events/guildMemberAdd.ts` | Welcome + milestone notifications |
| `src/events/guildMemberRemove.ts` | Goodbye notification |
| `src/events/guildMemberUpdate.ts` | Boost detection + notification |
| `src/events/messageCreate.ts` | Level-up notification (message XP path) |
| `src/events/voiceStateUpdate.ts` | Level-up notification (voice XP path) |
| `src/commands/slash/settings.ts` | `/settings notifications` subcommand group |
