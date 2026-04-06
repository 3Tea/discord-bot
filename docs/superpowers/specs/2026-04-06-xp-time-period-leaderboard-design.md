# XP Time Period Leaderboard & Rank Stats

**Date:** 2026-04-06
**Status:** Approved

## Overview

Upgrade the XP system to support leaderboards filtered by time period (daily, weekly, monthly, yearly, all-time) for both server and global scopes. Also enhance the `/rank` card to show recent XP activity per period.

XP remains cumulative — no resets. This adds **views** into XP earned within specific time windows.

## Requirements

- Leaderboard viewable by: daily, weekly, monthly, yearly, all-time
- Both server (per-guild) and global scope for each period
- Button row to switch between periods in `/leaderboard`
- `/rank` card shows XP earned today, this week, this month
- UTC-based period boundaries (no per-guild timezone)
- No auto-cleanup of historical data

## Data Model

### New Model: `XPSnapshot`

File: `src/models/xpSnapshot.model.ts`

```typescript
interface IXPSnapshot {
  userId: string;
  guildId: string | null;    // null = global snapshot
  period: "daily" | "weekly" | "monthly" | "yearly";
  periodKey: string;          // formatted period identifier
  xp: number;
  messageCount: number;
  voiceMinutes: number;
  reactionCount: number;
}
```

**periodKey formats (UTC):**

| Period  | Format       | Example    |
|---------|-------------|------------|
| daily   | `YYYY-MM-DD` | `2026-04-06` |
| weekly  | `YYYY-[W]WW` | `2026-W15`   |
| monthly | `YYYY-MM`    | `2026-04`    |
| yearly  | `YYYY`       | `2026`       |

Weekly uses ISO 8601 week numbering (weeks start Monday).

**Indexes:**

1. `{ guildId, period, periodKey, xp: -1 }` — leaderboard queries (server & global)
2. `{ userId, guildId, period, periodKey }` — unique compound for upsert & rank lookup

## XP Earning Pipeline — Snapshot Sync

### New Utility: `src/util/xp/snapshotSync.ts`

```typescript
async function syncSnapshots(
  userId: string,
  guildId: string,
  xpGain: number,
  source: "message" | "voice" | "reaction" | "admin"
): Promise<void>
```

**Logic:**

1. Compute 4 current periodKeys (daily, weekly, monthly, yearly) from `new Date()` in UTC
2. Build 8 bulkWrite upsert operations:
   - 4 for guild scope (`guildId = guildId`)
   - 4 for global scope (`guildId = null`)
3. Each upsert: `$inc` the `xp` field and the source-specific counter (`messageCount`, `voiceMinutes`, or `reactionCount`). For `source: "admin"`, only `$inc` the `xp` field — no counter increments
4. Execute all 8 ops in a single `bulkWrite` call (one MongoDB round-trip)

### Period Key Helper: `src/util/xp/periodKey.ts`

```typescript
function getCurrentPeriodKeys(): Record<"daily" | "weekly" | "monthly" | "yearly", string>
```

Uses UTC Date methods to compute ISO week number. No external date library dependency if possible; `dayjs` acceptable as fallback.

### Integration Points

Call `syncSnapshots()` after XP is granted in:

1. `src/events/messageCreate.ts` — after message XP grant
2. `src/events/voiceStateUpdate.ts` — in the voice XP interval callback
3. `src/events/messageReactionAdd.ts` — after reaction XP grant

### Admin `/xp` Command

When admin uses `/xp add|remove`, sync the XP delta to current period snapshots. For `/xp set`, compute `delta = newXP - currentXP` and sync that delta (can be negative — use `$inc` which handles negative values). Only modify `xp` field — do not increment `messageCount`/`voiceMinutes`/`reactionCount` for admin operations. Pass `source: "admin"` to `syncSnapshots` (add as accepted source type).

## Leaderboard Command Changes

### Button Layout

```
[Daily] [Weekly] [Monthly] [Yearly] [All]
[◀ Prev]                      [Next ▶]
```

- Row 1: 5 period buttons. Active period uses `Primary` style, others use `Secondary`
- Row 2: existing pagination buttons (unchanged logic)
- Default period on command invocation: **Weekly**

### New Button IDs

Added to `src/util/config/button.ts`:

```typescript
LEADERBOARD_PERIOD_DAILY: "lb_period_daily"
LEADERBOARD_PERIOD_WEEKLY: "lb_period_weekly"
LEADERBOARD_PERIOD_MONTHLY: "lb_period_monthly"
LEADERBOARD_PERIOD_YEARLY: "lb_period_yearly"
LEADERBOARD_PERIOD_ALL: "lb_period_all"
```

### Query Logic

| Period | Data Source | Filter |
|--------|-----------|--------|
| daily/weekly/monthly/yearly | `XPSnapshot` | `period` + current `periodKey` + `guildId` (or `null` for global) |
| all | `MemberXP` (server) or `User` (global) | Existing logic, unchanged |

Sort: `xp: -1`, limit 10 per page, max 100 results.

### Embed Title Format

```
🏆 Server Leaderboard — This Week (2026-W15)
🏆 Global Leaderboard — Today (2026-04-06)
🏆 Server Leaderboard — All Time
```

Collector idle timeout: 60 seconds (unchanged).

## Rank Card Changes

### Embed Mode (`src/util/xp/rankCard.ts`)

Add a new field to the rank embed:

```
📊 Recent Activity
Today: +150 XP | This Week: +1,230 XP | This Month: +4,500 XP
```

Query 3 XPSnapshot documents (daily, weekly, monthly) for the user in the current guild. Use `Promise.all` for parallel queries. Display `+0 XP` if no snapshot exists for a period.

### Canvas Mode (`src/util/xp/canvasRankCard.ts`)

Add a stats row below the progress bar, matching the style of existing activity stats:

```
📅 +150 today  |  📅 +1,230 week  |  📅 +4,500 month
```

Only show daily, weekly, monthly — yearly is omitted from rank card to keep it concise.

## i18n

New translation keys added to all supported locale files (`en`, `vi`, `id`, `es`, `ja`, `zh`, `ko`):

```
leaderboard.period.daily         — "Today"
leaderboard.period.weekly        — "This Week"
leaderboard.period.monthly       — "This Month"
leaderboard.period.yearly        — "This Year"
leaderboard.period.all           — "All Time"
leaderboard.period_title         — "{{mode}} Leaderboard — {{period}} ({{periodKey}})"
leaderboard.period_title_all     — "{{mode}} Leaderboard — All Time"

rank.recent_activity             — "Recent Activity"
rank.period_xp                   — "+{{xp}} XP"
rank.today                       — "Today"
rank.this_week                   — "This Week"
rank.this_month                  — "This Month"
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/models/xpSnapshot.model.ts` | XPSnapshot Mongoose model |
| `src/util/xp/snapshotSync.ts` | Snapshot upsert logic |
| `src/util/xp/periodKey.ts` | Period key computation |

## Files to Modify

| File | Change |
|------|--------|
| `src/events/messageCreate.ts` | Call `syncSnapshots()` after XP grant |
| `src/events/voiceStateUpdate.ts` | Call `syncSnapshots()` in voice interval |
| `src/events/messageReactionAdd.ts` | Call `syncSnapshots()` after XP grant |
| `src/commands/slash/xp.ts` | Sync admin XP changes to snapshots |
| `src/commands/slash/leaderboard.ts` | Add period buttons, period query logic |
| `src/util/config/button.ts` | Add period button ID constants |
| `src/util/xp/rankCard.ts` | Add recent activity field |
| `src/util/xp/canvasRankCard.ts` | Add period stats row |
| `src/locales/en.json` | Add period translation keys |
| `src/locales/vi.json` | Add period translation keys |
| `src/locales/id.json` | Add period translation keys |
| `src/locales/es.json` | Add period translation keys |
| `src/locales/ja.json` | Add period translation keys |
| `src/locales/zh.json` | Add period translation keys |
| `src/locales/ko.json` | Add period translation keys |

## Performance Considerations

- **bulkWrite**: All 8 snapshot upserts in a single MongoDB call — minimal latency overhead per XP earn event
- **Compound index** on `{ guildId, period, periodKey, xp: -1 }` ensures leaderboard queries use index scan + sort
- **Rank card** queries 3 snapshots in parallel via `Promise.all`
- **No data cleanup** — snapshots accumulate over time. Monitor collection size; add TTL index later if needed
