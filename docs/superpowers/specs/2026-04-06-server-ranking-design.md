# Server Ranking System Design

**Date:** 2026-04-06
**Status:** Approved

## Overview

Global server (guild) ranking system that ranks servers against each other based on multiple metrics: total XP, active members, messages, voice minutes, and reactions. Provides both a detailed server stats card (`/server-rank`) and a multi-server leaderboard (`/leaderboard mode:servers`), with period-based filtering (daily/weekly/monthly/yearly/all-time).

## Data Models

### GuildStats

Real-time server stats, incremented each time a member earns XP.

| Field | Type | Description |
|-------|------|-------------|
| `guildId` | String (unique) | Guild ID |
| `totalXP` | Number (default 0) | Cumulative XP across all members |
| `totalMessages` | Number (default 0) | Total messages that earned XP |
| `totalVoiceMinutes` | Number (default 0) | Total voice minutes that earned XP |
| `totalReactions` | Number (default 0) | Total reactions that earned XP |
| `activeMembers` | Number (default 0) | Members with XP > 0 (updated by cron) |
| `lastAggregatedAt` | Date (default null) | Last time cron ran aggregation |

**File:** `src/models/guildStats.model.ts`
**Collection:** `GuildStats`
**Indexes:** `{ guildId: 1 }` unique, `{ totalXP: -1 }` for ranking queries.

### GuildStatsSnapshot

Period-based snapshots following the existing `XPSnapshot` pattern.

| Field | Type | Description |
|-------|------|-------------|
| `guildId` | String | Guild ID |
| `period` | "daily" \| "weekly" \| "monthly" \| "yearly" | Period type |
| `periodKey` | String | e.g. "2026-04-06", "2026-W15", "2026-04", "2026" |
| `xp` | Number (default 0) | XP earned in this period |
| `messageCount` | Number (default 0) | Messages in this period |
| `voiceMinutes` | Number (default 0) | Voice minutes in this period |
| `reactionCount` | Number (default 0) | Reactions in this period |
| `activeMembers` | Number (default 0) | Active members in this period (updated by cron) |

**File:** `src/models/guildStatsSnapshot.model.ts`
**Collection:** `GuildStatsSnapshots`
**Indexes:**
- `{ guildId: 1, period: 1, periodKey: 1 }` unique (upsert key)
- `{ period: 1, periodKey: 1, xp: -1 }` for leaderboard queries

## Data Sync

### Real-time (on every XP event)

Extend `src/util/xp/snapshotSync.ts` to also sync guild stats. When a member earns XP:

1. **GuildStats**: `$inc` the relevant counters (totalXP + source-specific counter)
2. **GuildStatsSnapshot**: Upsert for all 4 periods with `$inc` (same pattern as user XPSnapshot)

Since `bulkWrite` is per-model, this requires two additional `bulkWrite` calls:
- `GuildStats.bulkWrite([1 updateOne])` — single upsert for guild counters
- `GuildStatsSnapshot.bulkWrite([4 updateOne])` — upsert for each period

Total per XP event: 3 `bulkWrite` calls (existing XPSnapshot + GuildStats + GuildStatsSnapshot).

Note: The `/xp` admin command (`src/commands/slash/xp.ts`) also calls `syncSnapshots`, so admin XP changes will automatically sync to guild stats as well.

### Periodic cron (every 10 minutes)

New file: `src/util/xp/guildStatsAggregator.ts`

Aggregates complex metrics that are too expensive for real-time:

- **GuildStats.activeMembers**: Count `MemberXP` documents with `xp > 0` per guild
- **GuildStatsSnapshot.activeMembers**: Count distinct `userId` in `XPSnapshot` per guild/period/periodKey

Runs via `setInterval` (10 minutes), imported and started from `src/bin/www.ts` (entry point).

Updates `GuildStats.lastAggregatedAt` after each run.

## Commands

### `/server-rank`

Displays detailed stats for the current server.

**File:** `src/commands/slash/server-rank.ts`

**Command registration:**
- `setDescription("View this server's XP stats and ranking")`
- `setDescriptionLocalizations({ vi: "Xem thống kê XP và xếp hạng server", ... })` for all 7 locales

**Behavior:**
- No options required, uses `interaction.guildId` and `interaction.guild`
- Calls `deferReply()`, then builds canvas card or embed fallback
- Shows: server name, icon, total XP, rank among all servers, active members, messages, voice minutes, reactions
- Shows period stats (daily/weekly/monthly XP gain) from GuildStatsSnapshot
- Server "level" uses the same `levelFromXP()` formula as users
- Server rank calculated by counting GuildStats documents with higher totalXP

**Error handling:**
- Used in DM: ephemeral error message
- No GuildStats data yet: show zeroed stats (not an error)
- Canvas render fails: fallback to embed

### `/leaderboard mode:servers`

Extends the existing `/leaderboard` command.

**File:** Modify `src/commands/slash/leaderboard.ts`

**Changes:**
- Add `{ name: "Servers", value: "servers" }` choice to the `mode` option
- When `mode === "servers"`:
  - All-time: query `GuildStats` sorted by `totalXP` desc
  - Period: query `GuildStatsSnapshot` sorted by `xp` desc
  - Each entry: `#rank Server Name — 1,234 XP (15 members)`
  - Resolve server names via `client.guilds.cache.get(guildId)`, skip servers bot is no longer in
- Period buttons work identically to existing leaderboard
- Pagination: 10 per page, max 100 results

## Canvas Server Rank Card

**File:** `src/util/xp/canvasServerRankCard.ts`

Dimensions: 934x360 pixels (same as user rank card).

```
+------------------------------------------------------+
|  [Server Icon]   Server Name                         |
|  (circular)      Rank #3 / 25 servers                |
|                                                      |
|  ████████████████████░░░░  Level 12                  |
|  45,230 / 50,000 XP                                  |
|                                                      |
|  Messages 12,340  Voice 8,760m  Reactions 3,120  Members 45  |
|                                                      |
|  Period Stats:  Daily +120  Weekly +890  Monthly +3.2k|
+------------------------------------------------------+
```

- Reuses visual style from `canvasRankCard.ts` (dark anime-themed, gradients, particles)
- Server icon rendered as circular image (same technique as user avatar)
- Extract shared drawing helpers to `src/util/xp/canvasHelpers.ts`:
  - `drawBackground()`, `drawParticles()`, `drawCircularImage()`, `drawProgressBar()`, `drawStatBox()`
  - Both `canvasRankCard.ts` and `canvasServerRankCard.ts` import from this shared module

## Embed Builders

**File:** Modify `src/util/xp/rankCard.ts`

New exports:
- `buildServerRankEmbed()` — embed fallback for `/server-rank`
- `buildServerLeaderboardEmbed()` — embed for `/leaderboard mode:servers` (all-time)
- `buildServerPeriodLeaderboardEmbed()` — embed for `/leaderboard mode:servers` (period)

## i18n

Add translation keys to all 7 locale files: `en.json`, `vi.json`, `ja.json`, `ko.json`, `zh.json`, `id.json`, `es.json`.

### New translation keys

```
server_rank.title
server_rank.rank                — "Rank #{rank} / {total} servers"
server_rank.level               — "Level {level}"
server_rank.total_xp            — "Total XP"
server_rank.active_members      — "Active Members"
server_rank.messages            — "Messages"
server_rank.voice_minutes       — "Voice Minutes"
server_rank.reactions           — "Reactions"
server_rank.period_daily        — "Daily"
server_rank.period_weekly       — "Weekly"
server_rank.period_monthly      — "Monthly"
server_rank.no_data             — "No data available yet"
server_rank.guild_only          — "This command can only be used in a server"
server_rank.error               — generic error message

leaderboard.servers_title       — "Server Leaderboard"
leaderboard.mode_servers        — "Servers" (option choice label)
leaderboard.server_entry        — "#{rank} {name} — {xp} XP ({members} members)"
```

## File Summary

| Component | File | Action |
|-----------|------|--------|
| GuildStats model | `src/models/guildStats.model.ts` | New |
| GuildStatsSnapshot model | `src/models/guildStatsSnapshot.model.ts` | New |
| Guild sync (real-time) | `src/util/xp/snapshotSync.ts` | Modify |
| Cron aggregator | `src/util/xp/guildStatsAggregator.ts` | New |
| Cron startup | `src/bin/www.ts` | Modify |
| `/server-rank` command | `src/commands/slash/server-rank.ts` | New |
| Canvas server card | `src/util/xp/canvasServerRankCard.ts` | New |
| Canvas shared helpers | `src/util/xp/canvasHelpers.ts` | New |
| `/leaderboard` extension | `src/commands/slash/leaderboard.ts` | Modify |
| Embed builders | `src/util/xp/rankCard.ts` | Modify |
| i18n (7 locales) | `src/locales/*.json` | Modify |
