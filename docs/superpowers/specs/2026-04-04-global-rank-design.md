# Global Rank System Design

**Date:** 2026-04-04
**Status:** Approved

## Overview

Add global ranking alongside existing guild ranking. Users accumulate `totalPoint` on the User model by summing XP earned across all guilds. The rank card, leaderboard, and level-up announcements all display both guild and global rank.

## Requirements

1. `/rank` card shows both **Server Rank** and **Global Rank**
2. `/leaderboard` supports a `mode` option: `server` (default) or `global`
3. Level-up announcements include global rank
4. Global XP (`totalPoint`) is updated in real-time whenever guild XP changes

## Data Layer

### User Model (`src/models/user.model.ts`)

Existing fields used:
- `totalPoint: number` — sum of XP across all guilds
- `topAllServer: number` — (reserved, not used by this feature)

Changes:
- Add index `{ totalPoint: -1 }` for efficient leaderboard/rank queries
- Add index `{ userID: 1 }` (unique) if not already present

### Sync Strategy

Every time guild XP changes, mirror the delta to `UserModel.totalPoint`:

| Source | Trigger | Action on UserModel |
|--------|---------|---------------------|
| `messageCreate` event | Message earns XP | `$inc: { totalPoint: xpAmount }`, upsert by userID |
| `voiceStateUpdate` event | Voice interval tick | `$inc: { totalPoint: xpPerVoiceMinute }`, upsert by userID |
| `messageReactionAdd` event | Reaction earns XP | `$inc: { totalPoint: xpPerReaction }`, upsert by userID |
| `/xp set` command | Admin sets XP | Calculate delta (`newXP - oldXP`), `$inc: { totalPoint: delta }` |
| `/xp add` command | Admin adds XP | `$inc: { totalPoint: amount }` |
| `/xp remove` command | Admin removes XP | `$inc: { totalPoint: -amount }` (floor at 0 handled by clamping) |

### Global Rank Calculation

```typescript
const globalRank = await UserModel.countDocuments({
    totalPoint: { $gt: userTotalPoint }
}) + 1;
```

## `/rank` Command Changes

### `src/commands/slash/rank.ts`

After fetching `MemberXP` and guild rank, also:
1. Fetch or upsert `UserModel` by `target.id`
2. Calculate `globalRank` via `countDocuments`
3. Pass `globalRank` and `globalXP` to render functions

### Canvas Rank Card (`src/util/xp/canvasRankCard.ts`)

**`RankCardOptions` interface** — add:
- `globalRank: number`

**Rank badge area** (below avatar): Replace single badge with two stacked pill badges:
- Top badge: `SERVER  #3` — pink/purple gradient (existing style)
- Bottom badge: `GLOBAL  #15` — gold gradient

The `drawRankBadge` function is updated to accept a `type` parameter (`"server"` | `"global"`) that controls color scheme.

### Embed Fallback (`src/util/xp/rankCard.ts`)

`buildRankEmbed` — add `globalRank` parameter. Description adds line:
```
Rank **#2** trên server · 🌐 **#15** toàn cầu
```

## `/leaderboard` Command Changes

### `src/commands/slash/leaderboard.ts`

Add string option `mode` with choices `server` and `global` (default: `server`).

- **Server mode**: unchanged — query `MemberXP` by `guildId`
- **Global mode**: query `UserModel.find().sort({ totalPoint: -1 }).limit(10)`. Display `totalPoint` instead of guild XP.

### `buildLeaderboardEmbed` (`src/util/xp/rankCard.ts`)

Add optional `mode` parameter. When `mode === "global"`:
- Title: `"🌐 Bảng xếp hạng toàn cầu"`
- Footer: `"Global"` instead of guild name
- Each entry shows `totalPoint` as XP value

Reuse existing `buildLeaderboardEmbed` by accepting a generic data shape, or create `buildGlobalLeaderboardEmbed` if cleaner.

## Level-up Announcement Changes

### `buildLevelUpEmbed` (`src/util/xp/rankCard.ts`)

Add optional parameter `globalRank?: number`.

When provided, append to description:
```
🌐 Global Rank: **#15**
```

### 3 Event Files

After detecting level-up in `messageCreate`, `voiceStateUpdate`, `messageReactionAdd`:
1. Fetch `UserModel` for the user
2. Calculate global rank
3. Pass `globalRank` to `buildLevelUpEmbed`

## Files Changed

| File | Change |
|------|--------|
| `src/models/user.model.ts` | Add `totalPoint` index |
| `src/events/messageCreate.ts` | Sync `totalPoint` on XP earn; pass globalRank to level-up |
| `src/events/voiceStateUpdate.ts` | Sync `totalPoint` on XP earn; pass globalRank to level-up |
| `src/events/messageReactionAdd.ts` | Sync `totalPoint` on XP earn; pass globalRank to level-up |
| `src/commands/slash/rank.ts` | Fetch global data, pass to renderers |
| `src/commands/slash/leaderboard.ts` | Add `mode` option, global query path |
| `src/commands/slash/xp.ts` | Sync `totalPoint` delta on admin set/add/remove |
| `src/util/xp/canvasRankCard.ts` | Add `globalRank` to options, dual badge rendering |
| `src/util/xp/rankCard.ts` | Update `buildRankEmbed`, `buildLeaderboardEmbed`, `buildLevelUpEmbed` |

## Edge Cases

- **New user with no UserModel doc**: upsert on first XP earn; rank command shows Global #0 or "Unranked" if no doc
- **Admin sets XP lower**: delta can be negative; `$inc` with negative value. If `totalPoint` would go below 0, clamp to 0 after update
- **User in only one server**: global XP equals guild XP — both ranks shown, may be identical
- **Bot not in a guild anymore**: stale MemberXP data still counted in totalPoint. Acceptable — no cleanup needed for MVP
