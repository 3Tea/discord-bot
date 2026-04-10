# Guild Notification System Design

**Date**: 2026-04-10
**Status**: Approved
**Scope**: Server notification system with admin-configurable toggles and channels

---

## Overview

Add a centralized notification system that allows guild admins to configure 5 types of server notifications: welcome, goodbye, level-up, boost, and milestone. Each type can be independently enabled/disabled and assigned to a specific channel.

**Release strategy**: Level-up ships immediately (no extra intents needed). Welcome, goodbye, boost, and milestone are fully coded but require `GuildMembers` privileged intent to be enabled in the Discord Developer Portal before they become functional.

---

## Data Model

### `GuildNotificationConfig`

One document per (guildId, type) pair. Max 5 documents per guild.

```typescript
const NotificationType = {
  Welcome: "welcome",
  Goodbye: "goodbye",
  LevelUp: "level_up",
  Boost: "boost",
  Milestone: "milestone",
} as const;

type NotificationType = typeof NotificationType[keyof typeof NotificationType];

interface IGuildNotificationConfig extends Document {
  guildId: string;
  type: NotificationType;
  enabled: boolean;          // default: false
  channelId: string | null;  // null = level_up sends in current channel; other types skip
  options: {
    thresholds?: number[];   // only used by milestone type, default: [50, 100, 250, 500, 1000]
  };
}
```

- **Unique compound index**: `{ guildId: 1, type: 1 }`
- **Upsert-on-access**: `findOneAndUpdate({ guildId, type }, { $setOnInsert: { guildId, type } }, { upsert: true, new: true })`
- **Redis cache**: key `notification_config:${guildId}:${type}`, TTL 5 minutes
- **Cache invalidation**: on admin config change via `/settings notifications`

---

## Notification Types & Triggers

| Type | Discord Event | Trigger | Needs GuildMembers? |
|------|--------------|---------|---------------------|
| welcome | `guildMemberAdd` | New member joins | Yes |
| goodbye | `guildMemberRemove` | Member leaves | Yes |
| level_up | (existing) `messageCreate` + `voiceStateUpdate` | `newLevel > oldLevel` | No |
| boost | `guildMemberUpdate` | `premiumSince` changes from null to value | Yes |
| milestone | `guildMemberAdd` | `guild.memberCount` matches a threshold in `options.thresholds` | Yes |

---

## Notification Flow

```
1. Event fires
2. Fetch config: Redis cache → DB fallback (upsert if not exists)
3. Check: config.enabled === true
4. Resolve channelId:
   - If channelId is set → use it
   - If channelId is null AND type is level_up → use current channel
   - If channelId is null AND type is NOT level_up → skip (don't send)
5. Verify bot permissions: SEND_MESSAGES + EMBED_LINKS in target channel
6. Resolve locale via resolveGuildLocale(guildId)
7. Build embed from template
8. Send embed
```

---

## Embed Templates

### Welcome
- **Color**: `#57F287` (Green)
- **Thumbnail**: member avatar
- **Title**: `t(locale, "notification.welcome.title")`
- **Description**: mention user + server name + member count
- **Footer**: timestamp

### Goodbye
- **Color**: `#ED4245` (Red)
- **Thumbnail**: member avatar
- **Title**: `t(locale, "notification.goodbye.title")`
- **Description**: username + server name
- **Footer**: timestamp

### Level-up
- **Color**: `#FEE75C` (Yellow)
- **Thumbnail**: user avatar
- **Title**: `t(locale, "notification.level_up.title")`
- **Description**: mention user + new level + progress bar
- **Footer**: timestamp

### Boost
- **Color**: `#F47FFF` (Boost Pink)
- **Thumbnail**: user avatar
- **Title**: `t(locale, "notification.boost.title")`
- **Description**: mention user + thank boost + server boost count
- **Footer**: timestamp

### Milestone
- **Color**: `#5865F2` (Blurple)
- **Thumbnail**: server icon
- **Title**: `t(locale, "notification.milestone.title")`
- **Description**: server name + member count reached
- **Footer**: timestamp

All strings use `t(locale, key)` — keys added to all 15 locale files.

---

## Admin Command: `/settings notifications`

Added as a subcommand group under the existing `/settings` command. Requires `ManageGuild` permission.

### Subcommands

| Command | Description |
|---------|-------------|
| `/settings notifications view` | View all 5 notification configs in one embed |
| `/settings notifications toggle <type>` | Toggle a notification type on/off |
| `/settings notifications channel <type> <channel>` | Set the target channel for a type |
| `/settings notifications milestone-thresholds <thresholds>` | Set milestone thresholds (comma-separated, e.g. `50,100,500,1000`) |

### `type` option

String choice with values: `welcome`, `goodbye`, `level_up`, `boost`, `milestone`.

### View embed example

```
📥 Welcome     — ✅ Enabled  → #welcome
📤 Goodbye     — ❌ Disabled → Not set
⬆️ Level Up    — ✅ Enabled  → Current channel
🚀 Boost       — ❌ Disabled → Not set
🎯 Milestone   — ✅ Enabled  → #general (50, 100, 500)
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/models/guildNotificationConfig.model.ts` | Mongoose model, interface, NotificationType const |
| `src/services/notification/notificationService.ts` | `getConfig()`, `sendNotification()`, `invalidateCache()` |
| `src/services/notification/notificationEmbeds.ts` | Embed builders for all 5 types |
| `src/events/guildMemberAdd.ts` | Welcome + milestone trigger |
| `src/events/guildMemberRemove.ts` | Goodbye trigger |
| `src/events/guildMemberUpdate.ts` | Boost detection |

## Files to Modify

| File | Change |
|------|--------|
| `src/commands/slash/settings.ts` | Add `notifications` subcommand group (view, toggle, channel, milestone-thresholds) |
| `src/events/messageCreate.ts` | Add level-up notification call after level-up detection |
| `src/events/voiceStateUpdate.ts` | Add level-up notification in voice XP interval |
| `src/locales/*.json` (15 files) | Add `notification.*` and `cmd.settings-notifications.*` keys |
| `src/client.ts` | TODO comment for `GatewayIntentBits.GuildMembers` — not enabled yet |

---

## Release Strategy

| Type | Ready to use? | Blocker |
|------|--------------|---------|
| **level_up** | Yes | None |
| welcome | Code complete | Enable `GuildMembers` intent in Developer Portal |
| goodbye | Code complete | Enable `GuildMembers` intent in Developer Portal |
| boost | Code complete | Enable `GuildMembers` intent in Developer Portal |
| milestone | Code complete | Enable `GuildMembers` intent in Developer Portal |

---

## Out of Scope

- Custom message templates (v1 uses default embeds only)
- DM notifications
- Master toggle (each type toggles independently)
- Canvas-based notification images
