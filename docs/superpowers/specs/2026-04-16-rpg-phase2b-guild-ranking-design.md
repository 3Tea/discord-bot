# RPG Phase 2B: Guild Ranking & Leaderboard Design

**Date:** 2026-04-16
**Status:** Approved

## Overview

Add `/guild ranking` subcommand showing global guild leaderboards with a per-server filter toggle. Three leaderboard types: GP, Rank, Quests Completed. Paginated with navigation buttons.

## `/guild ranking` Command

### Subcommand

Add to existing `/guild` command:
```
/guild ranking [type]
```

`type` option (string choice): `gp` (default), `rank`, `quests`

### Leaderboard Types

| Type | Sort | Display |
|------|------|---------|
| `gp` | GP descending | `#1 🟡 Username — 3,250 GP (A — Expert)` |
| `rank` | Rank tier desc → GP desc | `#1 👑 Username — Legend (50,000 GP)` |
| `quests` | questsCompleted desc | `#1 Username — 147 quests completed` |

### UX Flow

```
/guild ranking type:gp
→ Embed: "🏆 Guild Ranking — GP"
→ Top 10 entries, paginated
→ User's own position shown at bottom if not in current page
→ Buttons: [◀ Prev] [▶ Next] [🌐 Global / 🏠 This Server]
→ Toggle button switches between global and server-filtered view
→ Idle timeout 60s → remove buttons
```

### Server Filter

- **Global (default):** Query all `GuildMemberModel` sorted by metric
- **This Server:** Query `GuildMemberModel` where `userId` is in current server's member list. Use `interaction.guild.members.fetch()` for member IDs, then filter.

Note: For large servers, fetching all members can be expensive. Cache the member ID list in Redis (TTL 5min) per guild to avoid repeated fetches.

### Pagination

10 entries per page. Standard prev/next buttons. `createMessageComponentCollector({ idle: 60_000 })`.

### User's Own Position

If the viewing user is not on the current page, show a separator line at the bottom:
```
...
Your position: #42 — 450 GP (D — Apprentice)
```

## Data Model

No new models. Uses existing `GuildMemberModel` with queries:

```typescript
// GP leaderboard (global)
GuildMemberModel.find().sort({ gp: -1 }).skip(page * 10).limit(10)

// Rank leaderboard — sort by rank index (need computed sort)
// Since rank is a string, sort by GP desc as proxy (higher GP = higher rank)
GuildMemberModel.find().sort({ gp: -1 }).skip(page * 10).limit(10)

// Quests completed
GuildMemberModel.find().sort({ questsCompleted: -1 }).skip(page * 10).limit(10)
```

For server-filtered: `GuildMemberModel.find({ userId: { $in: serverMemberIds } }).sort(...)`

Add index on `GuildMemberModel`: `{ gp: -1 }`, `{ questsCompleted: -1 }` for performance.

## Files Changed

| File | Action | Changes |
|------|--------|---------|
| `src/commands/slash/guild.ts` | Modify | Add `ranking` subcommand + `handleRanking` function |
| `src/models/guildMember.model.ts` | Modify | Add indexes `{ gp: -1 }`, `{ questsCompleted: -1 }` |
| `src/locales/*.json` (15 files) | Modify | Add ~12 i18n keys |

## i18n Keys

| Key | EN |
|-----|-----|
| `guild.ranking.title_gp` | `🏆 Guild Ranking — GP` |
| `guild.ranking.title_rank` | `🏆 Guild Ranking — Rank` |
| `guild.ranking.title_quests` | `🏆 Guild Ranking — Quests` |
| `guild.ranking.entry_gp` | `**#{{pos}}** {{rankEmoji}} {{username}} — **{{gp}}** GP ({{rank}})` |
| `guild.ranking.entry_rank` | `**#{{pos}}** {{rankEmoji}} {{username}} — {{rank}} ({{gp}} GP)` |
| `guild.ranking.entry_quests` | `**#{{pos}}** {{username}} — **{{quests}}** quests` |
| `guild.ranking.your_position` | `Your position: **#{{pos}}** — {{value}}` |
| `guild.ranking.empty` | `No guild members found.` |
| `guild.ranking.global` | `🌐 Global` |
| `guild.ranking.server` | `🏠 This Server` |
| `guild.ranking.page` | `Page {{current}}/{{total}}` |
| `cmd.guild.ranking.desc` | `View guild leaderboard` |

## Edge Cases

| Scenario | Handling |
|----------|----------|
| User not in guild | Standard "Register first" gate |
| Server has 0 guild members | "No guild members found" embed |
| User's position is page 1 | Don't show separator (they're already visible) |
| Server filter in DM | Disable server filter button (no guild context) |
| Very large server (10k+ members) | Cache member IDs in Redis (5min TTL) |
