# Achievement System

> Steering doc for AI assistants and contributors. Covers the achievement system — config-driven definitions, on-demand hybrid tracking, tiered rewards, caching, and profile integration.

## Overview

50 achievements across 10 categories. Config-driven — each achievement is an entry in `achievement.config.ts` with a condition function and reward. Adding new achievements requires only a config entry + i18n keys, no schema migrations or command changes.

Tracking is **on-demand hybrid**: when a user runs `/achievements` or `/profile`, the service fetches current stats from existing models, compares against conditions, persists newly-met achievements, pays rewards, and returns results. No background cron. No integration into existing commands.

## Command

`/achievements` — no subcommands, no options. Guild-only.

### Display

11-page paginated embed with Previous/Next buttons (60s collector timeout):

- **Page 1 — Overview**: category summary (emoji + name + unlocked/total per category), total rewards earned
- **Pages 2-11 — Per category**: detailed achievement list with unlock status and progress bars

### Achievement display format

| State | Format |
|---|---|
| Unlocked | `✅ {name} — {description} (+{rewards})` |
| Locked with progress | `⬜ {name} — {description} ████░░░░ {current}/{target} (+{rewards})` |
| Locked (first-time, no progress) | `⬜ {name} — {description} (+{rewards})` |

New unlocks are highlighted with a `🎉 New achievements unlocked!` section prepended to the relevant page.

## Categories & Counts

| Category | Key | Count | Emoji | Examples |
|---|---|---|---|---|
| Economy | `economy` | 8 | 📊 | First Prayer, Pray Streak 3/7/14/30, Rich I/II/III |
| XP & Level | `xp` | 7 | ⚔️ | Level 5/10/25/50/75/100, XP Rookie |
| Mining | `mining` | 5 | ⛏️ | First Mine, Depth 5/10/25/50 |
| Dungeon | `dungeon` | 5 | 🏰 | First Dungeon, Depth 5/10/25/50 |
| Social | `social` | 5 | 🤝 | First Gift, Generous (10), Philanthropist (50), First Rob, Master Thief (20) |
| Gambling | `gambling` | 4 | 🎰 | First Bet, 50/100/500 bets |
| Voice | `voice` | 4 | 🎙️ | 1h/10h/50h/100h |
| Activity | `activity` | 4 | 💬 | 100/1K/5K/10K messages |
| Quests | `quests` | 4 | 📜 | First Quest, Streak 3/7/14 |
| Stars | `stars` | 4 | ⭐ | 1/10/50/100 stars |

**Total: 50 achievements.**

## Reward Tiers

| Tier | Coin | Gem | Star | Typical trigger |
|---|---|---|---|---|
| Easy | 50-75 | 0 | 0 | First-time actions |
| Medium | 100-300 | 1-2 | 0 | Milestones (streak 7, level 25, depth 10) |
| Hard | 400-600 | 3-5 | 1 | Dedication (streak 30, level 50, depth 25) |
| Legendary | 800-1000 | 5-10 | 2-3 | Mastery (level 100, 100K coin, depth 50, 10K messages) |

Rewards paid via `CurrencyService.addCoin/addGem` (per-guild) and `WalletService.addStar` (global). Transaction type: `achievement_reward`. Metadata: `{ achievementId, achievementName }`.

**Star rewards and guilds**: Achievements are per-guild (stored with `guildId`), but star rewards go to the global wallet. A user can earn star rewards for the same achievement in different servers. This is intentional — incentivizes multi-server activity.

## Tracking Flow

### `fetchUserStats(userId, guildId)` → `UserStats`

Parallel fetch from 5 sources:

| Source | Fields |
|---|---|
| `MemberXPModel` | level, xp, messageCount, voiceMinutes, reactionCount |
| `UserEconomyModel` | coin, gem, prayStreak, mineDepth, mineCheckpoint, dungeonDepth, dungeonCheckpoint |
| `UserWalletModel` | star |
| `UserQuestModel` (latest by date) | questStreak |
| `TransactionModel.aggregate` | totalPrayCount, totalGambleCount, totalGiftCount, totalRobCount, totalWorkCount, totalFishCount |

Transaction aggregation uses a single pipeline: `$match { userId, guildId, type: $in [pray, gambling, gift, rob, work, fish] }` → `$group by type, count: $sum 1`. Scoped to `guildId` (not cross-server).

Result cached in Redis for 60s.

### `checkAndUnlock(userId, guildId)` → `CheckResult`

1. Fetch stats (cache-first, 60s TTL)
2. Fetch unlocked achievement IDs (cache-first, 60s TTL) — `UserAchievementModel.find({ userId, guildId })`
3. For each config achievement NOT in unlocked set: run `condition(stats)`
4. Persist new unlocks: `bulkWrite` with `updateOne` + `$setOnInsert` + `upsert: true` (race-condition safe)
5. Pay rewards ONLY for actually-inserted documents (checked via `bulkResult.upsertedIds`) — prevents double-payment on concurrent calls
6. Invalidate both caches after any unlocks
7. Return `{ all: AchievementStatus[], newUnlocks: AchievementDef[], stats: UserStats }`

### `getUnlockedCount(userId, guildId)` → `{ unlocked, total }`

Lightweight `countDocuments` query for profile integration. Returns count + `ACHIEVEMENTS.length` (50).

### `getByCategory(statuses)` → `Map<AchievementCategory, AchievementStatus[]>`

Groups statuses by category following `CATEGORY_ORDER`.

## Config Structure

```typescript
interface AchievementDef {
    id: string;                    // unique, e.g. "eco_first_pray"
    category: AchievementCategory; // one of 10 categories
    nameKey: string;               // i18n key: "achievement.eco_first_pray.name"
    descKey: string;               // i18n key: "achievement.eco_first_pray.desc"
    reward: { coin?: number; gem?: number; star?: number };
    condition: (stats: UserStats) => boolean;
    progress?: (stats: UserStats) => { current: number; target: number };
}
```

- `condition` is a pure function — no DB access, no side effects
- `progress` is optional — present on milestone achievements (threshold > 1), absent on first-time achievements (binary)
- Both receive the same `UserStats` object fetched once per check

## Data Model

### UserAchievement (Collection: `UserAchievements`)

| Field | Type | Default | Description |
|---|---|---|---|
| `userId` | String | required | User ID |
| `guildId` | String | required | Guild ID |
| `achievementId` | String | required | Matches config `id` |
| `unlockedAt` | Date | `Date.now` | When unlocked |
| `rewardPaid` | Boolean | `true` | Whether reward was distributed |

**Indexes**: unique `(userId, guildId, achievementId)`, compound `(userId, guildId)`.

### Transaction Type

`achievement_reward` — added to both the TypeScript union AND schema enum in `transaction.model.ts`.

Star rewards go through `WalletService.addStar` which logs to global Transaction with `guildId: "global"`.

## Redis Caching

| Key | Value | TTL | Purpose |
|---|---|---|---|
| `achievement_stats:{guildId}:{userId}` | `UserStats` JSON | 60s | Avoid repeated DB aggregation |
| `achievement_unlocked:{guildId}:{userId}` | `Record<achievementId, Date>` JSON | 60s | Avoid repeated unlocked-IDs query |

Both caches are invalidated (deleted) after any new unlocks in `checkAndUnlock`.

## Integration Points

| Location | What happens |
|---|---|
| `/achievements` command | Calls `checkAndUnlock` → paginated embed with all categories |
| `/profile` command | Calls `getUnlockedCount` → shows "🏆 X/50" in embed field and canvas badge |
| `/profile` canvas (Star/Galaxy) | Achievement count rendered inline alongside activity stats (messages/voice/reactions) |

No other commands trigger achievement checks. This hybrid model means achievements are checked when the user actively views them, not on every event.

## i18n Keys

| Pattern | Count | Example |
|---|---|---|
| `achievement.{id}.name` | 50 | `achievement.eco_first_pray.name` → "First Prayer" |
| `achievement.{id}.desc` | 50 | `achievement.eco_first_pray.desc` → "Pray for the first time" |
| `achievement.cat.{category}` | 10 | `achievement.cat.economy` → "Economy" |
| `achievement.title` | 1 | "Achievements — {{username}} ({{unlocked}}/{{total}})" |
| `achievement.total_rewards` | 1 | "Total rewards earned: {{coin}} coin, {{gem}} gem, {{star}} ⭐" |
| `achievement.new_unlocks` | 1 | "New achievements unlocked!" |
| `cmd.achievements.desc` | 1 | "View your achievement progress and unlocked rewards" |
| `profile.achievements` | 1 | "🏆 Achievements" |

All keys exist in all 15 locale files with native translations.

## Adding New Achievements

1. Add a new `AchievementDef` entry to the `ACHIEVEMENTS` array in `src/services/achievement/achievement.config.ts`
2. Add i18n keys `achievement.{id}.name` and `achievement.{id}.desc` to all 15 locale files
3. If the condition references a new stat field: add it to `UserStats` interface and `fetchUserStats` function
4. No model migrations needed — achievements are identified by the `id` string
5. The command and profile automatically pick up new achievements (they iterate the config array)

## Edge Cases

- **User has no data**: All conditions return false, all progress shows 0/target. No error.
- **Coin-based achievements**: Condition checks current balance. If user spends below threshold after unlocking, achievement stays unlocked (persisted in DB).
- **Concurrent calls**: `bulkWrite` with `$setOnInsert` prevents duplicate inserts. Rewards only paid for actually-inserted documents (checked via `upsertedIds`).
- **Rapid re-check**: Both stats and unlocked-IDs cached for 60s. Second call within 60s hits Redis, not DB.

## File Map

| File | Purpose |
|---|---|
| `src/models/userAchievement.model.ts` | Mongoose schema + indexes |
| `src/services/achievement/achievement.config.ts` | 50 definitions, categories, emojis, ordering |
| `src/services/achievement/achievement.service.ts` | fetchUserStats, checkAndUnlock, getUnlockedCount, getByCategory |
| `src/commands/slash/achievements.ts` | `/achievements` command with 11-page pagination |
| `src/util/profile/profileEmbed.ts` | Shows achievement count field (modified) |
| `src/util/profile/canvasProfile.ts` | Shows achievement count badge (modified) |
