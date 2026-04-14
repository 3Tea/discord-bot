# XP & Leveling System

> Steering doc for AI assistants and contributors. Covers the full XP system — earning, leveling, leaderboards, snapshots, server ranking, and admin tools.

## Overview

Members earn XP from three sources: messages, voice activity, and reactions. XP is tracked per-member per-guild (`MemberXP`) with global aggregation (`User.totalPoint`). Period-based snapshots enable daily/weekly/monthly/yearly leaderboards. Server-wide stats are aggregated for cross-server ranking.

## XP Sources

### Message XP (`messageCreate` event)

| Setting | Default | Configurable |
|---------|---------|-------------|
| XP per message | 20 (±5 variance = 15-25) | Yes (`xpPerMessage`) |
| Cooldown | 60 seconds | Yes (`messageCooldown`) |
| Min message length | 3 characters | Yes (`minMessageLength`) |

**Anti-spam checks** (all must pass):
1. Message length >= `minMessageLength` (skip if MessageContent intent unavailable)
2. Message hash (MD5 of lowercased, trimmed content) != `lastMessageHash` (skip if content empty)
3. Time since `lastMessageAt` >= `messageCooldown` seconds

**Flow**: Validate guild + non-bot + not webhook -> Load config -> Check enabled + not blacklisted -> Anti-spam -> Award XP -> Sync snapshots + guild stats -> Level-up check

### Voice XP (`voiceStateUpdate` event)

| Setting | Default | Configurable |
|---------|---------|-------------|
| XP per minute | 5 | Yes (`xpPerVoiceMinute`) |
| Check interval | 60 seconds | No (hardcoded) |
| Min members | 2+ non-bot OR 1+ non-bot with bot present | No (hardcoded) |

**Session tracking**: Redis set `voice_xp_sessions` with entries `guildId:userId:channelId`.

**Session starts when**: User joins voice with 2+ non-bot members (or 1+ non-bot with a bot present) AND is not server-deafened.
**Session stops when**: User leaves, becomes server-deafened, or channel drops below eligibility threshold.

Every 60 seconds, all active sessions receive XP. Level-up checked on each award.

### Reaction XP (`messageReactionAdd` event)

| Setting | Default | Configurable |
|---------|---------|-------------|
| XP per reaction | 3 | Yes (`xpPerReaction`) |
| Cooldown | 30 seconds per user per guild | No (hardcoded) |

**Rules**: Cannot earn XP from reacting to own messages. Cooldown tracked in Redis (`reaction_xp:guildId:userId`).

## Level Formula

```
XP required for Level N = N² × 50
Level from XP = floor(sqrt(XP / 50))
```

| Level | Total XP Required |
|-------|-------------------|
| 1 | 50 |
| 2 | 200 |
| 3 | 450 |
| 5 | 1,250 |
| 10 | 5,000 |
| 20 | 20,000 |
| 50 | 125,000 |

**XP variance**: `randomXP(base, variance = 5)` = `base - variance` to `base + variance` (inclusive).

## Level-Up Notification

Triggered when `levelFromXP(newXP) > member.level`. Sends embed to the channel where the XP was earned, showing new level, global rank, and guild name.

## Guild XP Configuration (`GuildXPConfig`)

Per-server settings, created with defaults on first XP event if missing.

| Field | Default | Description |
|-------|---------|-------------|
| `xpPerMessage` | 20 | Base XP per valid message |
| `xpPerVoiceMinute` | 5 | XP per minute in voice |
| `xpPerReaction` | 3 | XP per valid reaction |
| `messageCooldown` | 60 | Seconds between earning message XP |
| `minMessageLength` | 3 | Minimum characters for message XP |
| `blacklistedChannels` | [] | Channel IDs that earn 0 XP |
| `enabled` | true | Master switch for XP system |

## Period Snapshots (`XPSnapshot`)

Every XP change syncs to snapshots for 4 periods (guild-scoped + global):

| Period | Key Format | Example |
|--------|------------|---------|
| Daily | `YYYY-MM-DD` | `2026-04-06` |
| Weekly | `YYYY-WNN` (ISO 8601) | `2026-W15` |
| Monthly | `YYYY-MM` | `2026-04` |
| Yearly | `YYYY` | `2026` |

**Weekly**: ISO 8601 — Week 1 contains the first Thursday, weeks start Monday.

Each snapshot tracks: `xp`, `messageCount`, `voiceMinutes`, `reactionCount`. Upserted via `$inc` on the unique key `(userId, guildId, period, periodKey)`. Global snapshots use `guildId = null`.

## Server Stats

### GuildStats (real-time totals)

Updated on every XP event: `totalXP`, `totalMessages`, `totalVoiceMinutes`, `totalReactions`. `activeMembers` count aggregated by cron every 10 minutes.

### GuildStatsSnapshot (period-based)

Same period structure as XP snapshots. Tracks `xp`, `messageCount`, `voiceMinutes`, `reactionCount`, `activeMembers` per period per guild. Used for cross-server period leaderboards.

### Guild Stats Aggregator (cron)

Runs every 10 minutes (initial run 5s after startup). Counts members with `xp > 0` per guild and updates `GuildStats.activeMembers` and `GuildStatsSnapshot.activeMembers` for all active periods.

## Commands

### `/rank`

Displays canvas rank card (image) with embed fallback. Shows:
- User level and XP progress bar
- Server rank (#N of M members)
- Global rank
- Premium badge (Star/Galaxy) if user has active premium subscription
- Message count, voice minutes, reaction count
- Period activity stats (daily, weekly, monthly)

Premium users get a tier badge on the card and Galaxy tier uses an alternate gold/purple color theme. See [canvas-rendering.md](canvas-rendering.md) for rendering details.

### `/leaderboard`

Paginated with interactive buttons. 10 entries per page, max 100 results.

**Modes**:
- `server` (default) — Members of current guild ranked by XP
- `global` — All users across all guilds ranked by total XP
- `servers` — All guilds ranked by total XP (from GuildStats/GuildStatsSnapshot)

**Period buttons**: All, Daily, Weekly, Monthly, Yearly. Switching period resets to page 1. 60-second idle timeout disables buttons.

### `/server-rank`

Displays canvas server rank card (image) with embed fallback. Shows:
- Server's total XP and global rank among all servers
- Total messages, voice minutes, reactions
- Active member count
- Period breakdowns (daily, weekly, monthly)

### `/xp` (Admin — requires Manage Guild)

| Subcommand | Action | Snapshot sync |
|------------|--------|---------------|
| `set` | Set absolute XP value | Syncs delta (new - old) |
| `add` | Add XP amount | Syncs amount |
| `remove` | Remove XP amount | Syncs negative amount |
| `channel-blacklist add` | Blacklist channel from XP | N/A |
| `channel-blacklist remove` | Remove blacklist | N/A |

Admin XP changes use source `"admin"` — no counter increments (messageCount, etc.), only XP.

## Data Models

### MemberXP

| Field | Type | Default |
|-------|------|---------|
| `guildId` | String | required |
| `userId` | String | required |
| `xp` | Number | 0 |
| `level` | Number | 0 |
| `messageCount` | Number | 0 |
| `voiceMinutes` | Number | 0 |
| `reactionCount` | Number | 0 |
| `lastMessageAt` | Date | null |
| `lastMessageHash` | String | "" |

**Indexes**: Unique `(guildId, userId)`, `(guildId, xp: -1)` for leaderboard.

### XPSnapshot

| Field | Type | Default |
|-------|------|---------|
| `userId` | String | required |
| `guildId` | String | null (null = global) |
| `period` | Enum | `daily` / `weekly` / `monthly` / `yearly` |
| `periodKey` | String | required |
| `xp` | Number | 0 |
| `messageCount` | Number | 0 |
| `voiceMinutes` | Number | 0 |
| `reactionCount` | Number | 0 |

**Indexes**: Unique `(userId, guildId, period, periodKey)`, `(guildId, period, periodKey, xp: -1)` for leaderboard.

### GuildStats

| Field | Type | Default |
|-------|------|---------|
| `guildId` | String | unique, required |
| `totalXP` | Number | 0 |
| `totalMessages` | Number | 0 |
| `totalVoiceMinutes` | Number | 0 |
| `totalReactions` | Number | 0 |
| `activeMembers` | Number | 0 |
| `lastAggregatedAt` | Date | null |

**Index**: `(totalXP: -1)` for server ranking.

### GuildStatsSnapshot

| Field | Type | Default |
|-------|------|---------|
| `guildId` | String | required |
| `period` | Enum | `daily` / `weekly` / `monthly` / `yearly` |
| `periodKey` | String | required |
| `xp` | Number | 0 |
| `messageCount` | Number | 0 |
| `voiceMinutes` | Number | 0 |
| `reactionCount` | Number | 0 |
| `activeMembers` | Number | 0 |

**Indexes**: Unique `(guildId, period, periodKey)`, `(period, periodKey, xp: -1)` for cross-server ranking.

## Canvas Rendering

Rank cards (`canvasRankCard.ts`) and server rank cards (`canvasServerRankCard.ts`) generate images via `@napi-rs/canvas`. Shared helpers in `canvasHelpers.ts` handle text rendering. If canvas fails, falls back to standard Discord embed.
