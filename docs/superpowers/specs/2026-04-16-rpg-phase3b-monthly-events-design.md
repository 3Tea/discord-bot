# RPG Phase 3B: Monthly Competitive Events Design

**Date:** 2026-04-16
**Status:** Approved

## Overview

Phase 3B adds monthly server-vs-server competitive events. Each month has a themed competition (rotating 6 themes). Branch guilds accumulate scores from their members' actions. Per-capita scoring ensures small servers can compete. Top servers earn rewards for all members.

## Monthly Event Themes (6-month rotation)

| Month cycle | Theme key | Label | Metric (`QuestAction`) | Emoji |
|------------|-----------|-------|----------------------|-------|
| Jan/Jul | `boss_slayer` | Boss Slayer | `defeat_boss` | ⚔️ |
| Feb/Aug | `gold_rush` | Gold Rush | `earn_gold` | 🪙 |
| Mar/Sep | `monster_hunter` | Monster Hunter | `kill_monsters` | 🐉 |
| Apr/Oct | `master_crafter` | Master Crafter | `craft_equipment` | 🔨 |
| May/Nov | `quest_champion` | Quest Champion | `complete_quests` | 📜 |
| Jun/Dec | `material_collector` | Material Collector | `collect_materials` | 💎 |

Theme determined by `(month - 1) % 6` index.

## Scoring

**Raw score:** Sum of all branch guild members' contributions for the event's metric during the month.

**Per-capita score:** `rawScore / memberCount` — normalized so small and large servers compete fairly.

**Leaderboard sorts by per-capita score** (descending). Ties broken by raw score.

## Event Progress Tracking

Reuses the existing `GuildQuestService.trackProgress(userId, action, amount, guildId)` → `BranchService.trackBranchProgress(guildId, action, amount)` pipeline.

**New Redis key for monthly events:**
```
branch_event:{guildId}:{monthKey} → number (raw score)
TTL: 2764800 (32 days)
```

Month key format: `"2026-04"`.

In `BranchService.trackBranchProgress`, after incrementing weekly quest progress, ALSO increment the monthly event score if the action matches the current month's theme.

## Rewards (distributed at month end)

| Place | Gold/member | EXP/member | GP/member | Crate |
|-------|-------------|------------|-----------|-------|
| 🥇 1st | 200 | 100 | 50 | Gold Crate ×1 |
| 🥈 2nd | 100 | 50 | 25 | Silver Crate ×1 |
| 🥉 3rd | 50 | 25 | 10 | Bronze Crate ×1 |
| Top 10 | 25 | 15 | 5 | — |

Rewards distributed lazily: when any user in a server views `/guild event` after month end, trigger reward distribution for that server (same pattern as weekly quest rewards in Phase 3A).

**Reward claim tracking:** Redis key `event_reward_claimed:{guildId}:{monthKey}:{userId}` → boolean, TTL 32 days.

## `/guild event` Subcommand

Add to existing `/guild` command:

```
/guild event
→ Check: user is guild member
→ Show current month's event info + server ranking
```

### Embed Display

```
⚔️ Monthly Event: Boss Slayer — April 2026

Your server: Dragon's Den
Score: 145 (per capita: 12.1)
Rank: #3 of 28 servers

🏆 Top 5:
#1 🥇 Shadow Legion — 18.5 per capita (92 total, 5 members)
#2 🥈 Phoenix Order — 15.2 per capita (152 total, 10 members)
#3 🥉 Dragon's Den — 12.1 per capita (145 total, 12 members)
#4    Star Knights — 11.0 per capita (110 total, 10 members)
#5    Iron Guard — 9.8 per capita (98 total, 10 members)

⏰ 6 days remaining
```

### Previous Month Reward

If user hasn't claimed last month's reward:
```
📋 Last month (March): Monster Hunter — #2 🥈
Claimed: +100 Gold + 50 EXP + 25 GP + 🥈 Silver Crate
```

## Config Additions (`branch.config.ts`)

```typescript
export interface EventTheme {
    key: string;
    label: string;
    action: QuestAction;
    emoji: string;
}

export const EVENT_THEMES: EventTheme[] = [
    { key: "boss_slayer", label: "Boss Slayer", action: "defeat_boss", emoji: "⚔️" },
    { key: "gold_rush", label: "Gold Rush", action: "earn_gold", emoji: "🪙" },
    { key: "monster_hunter", label: "Monster Hunter", action: "kill_monsters", emoji: "🐉" },
    { key: "master_crafter", label: "Master Crafter", action: "craft_equipment", emoji: "🔨" },
    { key: "quest_champion", label: "Quest Champion", action: "complete_quests", emoji: "📜" },
    { key: "material_collector", label: "Material Collector", action: "collect_materials", emoji: "💎" },
];

export interface EventRewardTier {
    maxRank: number;  // top N
    gold: number;
    exp: number;
    gp: number;
    crate: CrateType | null;
}

export const EVENT_REWARD_TIERS: EventRewardTier[] = [
    { maxRank: 1, gold: 200, exp: 100, gp: 50, crate: "gold" },
    { maxRank: 2, gold: 100, exp: 50, gp: 25, crate: "silver" },
    { maxRank: 3, gold: 50, exp: 25, gp: 10, crate: "bronze" },
    { maxRank: 10, gold: 25, exp: 15, gp: 5, crate: null },
];

export const EVENT_SCORE_TTL = 2764800; // 32 days

export function getMonthKey(): string {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getCurrentEventTheme(): EventTheme {
    const month = new Date().getUTCMonth(); // 0-11
    return EVENT_THEMES[month % EVENT_THEMES.length];
}

export function getDaysRemainingInMonth(): number {
    const now = new Date();
    const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    return lastDay.getUTCDate() - now.getUTCDate();
}
```

## Service Additions (`branch.service.ts`)

```typescript
// Track event progress (called from trackBranchProgress when action matches theme)
async function trackEventProgress(guildId: string, action: QuestAction, amount: number): Promise<void>

// Get event score for a server
async function getEventScore(guildId: string, monthKey: string): Promise<number>

// Get event ranking (all branch guilds sorted by per-capita score)
async function getEventRanking(monthKey: string): Promise<{ guildId: string; name: string; rawScore: number; memberCount: number; perCapita: number }[]>

// Claim event reward
async function claimEventReward(userId: string, guildId: string, monthKey: string, rank: number): Promise<EventRewardTier | null>

// Check if claimed
async function isEventRewardClaimed(userId: string, guildId: string, monthKey: string): Promise<boolean>
```

## Files Changed

| File | Action | Changes |
|------|--------|---------|
| `src/services/rpg/branch.config.ts` | Modify | Add event themes, reward tiers, month key helpers |
| `src/services/rpg/branch.service.ts` | Modify | Add event tracking, ranking, reward distribution in `trackBranchProgress` |
| `src/commands/slash/guild.ts` | Modify | Add `event` subcommand |
| `src/locales/*.json` (15 files) | Modify | ~15 new i18n keys |

## i18n Keys (new)

| Key | EN |
|-----|-----|
| `guild.event.title` | `{{emoji}} Monthly Event: {{theme}} — {{month}}` |
| `guild.event.your_server` | `Your server: **{{name}}**` |
| `guild.event.score` | `Score: **{{raw}}** (per capita: **{{perCapita}}**)` |
| `guild.event.rank` | `Rank: **#{{rank}}** of {{total}} servers` |
| `guild.event.top` | `🏆 Top 5:` |
| `guild.event.entry` | `#{{pos}} {{medal}} **{{name}}** — {{perCapita}} per capita ({{raw}} total, {{members}} members)` |
| `guild.event.remaining` | `⏰ {{days}} days remaining` |
| `guild.event.ended` | `Event ended! Final results:` |
| `guild.event.no_branch` | `Your server needs a branch guild to participate. Ask an admin to use \`/guild-admin setup\`.` |
| `guild.event.reward_claimed` | `Last month ({{month}}): {{theme}} — #{{rank}} {{medal}}\nClaimed: +{{gold}} Gold + {{exp}} EXP + {{gp}} GP` |
| `guild.event.reward_crate` | ` + {{emoji}} {{crate}} ×1` |
| `guild.event.no_rank` | `Your server didn't place in the top 10 last month.` |
| `guild.event.no_data` | `No event data yet. Start contributing!` |
| `cmd.guild.event.desc` | `View monthly competitive event and server ranking` |
| `guild.event.theme.boss_slayer` | `Boss Slayer` |
| `guild.event.theme.gold_rush` | `Gold Rush` |
| `guild.event.theme.monster_hunter` | `Monster Hunter` |
| `guild.event.theme.master_crafter` | `Master Crafter` |
| `guild.event.theme.quest_champion` | `Quest Champion` |
| `guild.event.theme.material_collector` | `Material Collector` |

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Server with no branch | "No branch guild" message |
| Server with 0 event score | Show "No data yet" |
| Month just started, no scores | Empty leaderboard with "No data yet" |
| User not in guild | Standard "Register first" |
| Tied per-capita scores | Break by raw score (higher wins) |
| Server joins mid-month | Scores start from 0, still eligible |
| Server disbands mid-month | Scores lost, not in ranking |
| < 10 servers total | Show all available, don't pad to 10 |
