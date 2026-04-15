# Achievement System

> Steering doc for AI assistants and contributors. Covers the achievement system — definitions, on-demand tracking, rewards, caching, and integration points.

## Overview

50 achievements spread across 10 categories (economy, xp, mining, dungeon, social, gambling, voice, activity, quests, stars). Achievements are config-driven (`AchievementDef[]`) — adding new ones requires only a new entry in `achievement.config.ts` with no schema migrations. Tracking is **on-demand hybrid**: stats are fetched from existing models, compared to conditions, and newly-met achievements are written to `UserAchievement`. Rewards (coin/gem/star) are paid automatically on unlock.

## Commands

| Command | Description |
|---------|-------------|
| `/achievements` | Browse all categories, paginated |
| `/achievements category:<name>` | Filter to a single category |
| `/achievements page:<n>` | Jump to a specific page |

## Categories (10)

| Category | Count | Emoji |
|----------|-------|-------|
| `economy` | 8 | 📊 |
| `xp` | 7 | ⚔️ |
| `mining` | 5 | ⛏️ |
| `dungeon` | 5 | 🏰 |
| `social` | 5 | 🤝 |
| `gambling` | 5 | 🎰 |
| `voice` | 5 | 🎙️ |
| `activity` | 5 | 💬 |
| `quests` | 3 | 📜 |
| `stars` | 2 | ⭐ |

## Reward Types

| Currency | Scope |
|----------|-------|
| `coin` | Per-guild server wallet (`UserEconomy`) |
| `gem` | Per-guild server wallet (`UserEconomy`) |
| `star` | Global wallet (`UserWallet`) |

Rewards are paid immediately via `CurrencyService.addCoin/addGem` and `WalletService.addStar` on first unlock. A `achievement_reward` transaction is logged for each payout.

## Tracking Flow

1. **`fetchUserStats(userId, guildId)`** — reads `MemberXP`, `UserEconomy`, `UserWallet`, `UserQuest`, and `Transaction` aggregation (for count fields). Cached in Redis for 60s (`achievement_stats:{guildId}:{userId}`).
2. **`checkAndUnlockAchievements(userId, guildId)`** — fetches stats + existing unlocks (Redis cached, 5-min TTL). Compares each `AchievementDef.condition(stats)`. For newly-met conditions, writes `UserAchievement` document and pays rewards.
3. **Returns `CheckResult`** — `{ all: AchievementStatus[], newUnlocks: AchievementDef[], stats }`. Command uses `all` for display and `newUnlocks` to notify the user of freshly-unlocked badges.

## Integration Points

`checkAndUnlockAchievements` is called:
- Inside `/achievements execute` (on-demand, covers all categories)
- Inside `/profile execute` (for achievement count badge — uses `getAchievementCount`)

This hybrid model means achievements are checked when the user actively views them, not on every event. No background cron needed.

## Data Model

### UserAchievement (Collection: `UserAchievements`)

| Field | Type | Notes |
|-------|------|-------|
| `userId` | String | required |
| `guildId` | String | required |
| `achievementId` | String | required |
| `unlockedAt` | Date | auto-set on create |

Compound unique index: `{ userId, guildId, achievementId }`.

### Transaction Type

| Type | Context |
|------|---------|
| `achievement_reward` | Coin/gem payout on unlock |

Star payouts go through `WalletService.addStar` (logs in global `Transaction` with `guildId: "global"`).

## Redis Keys

| Key | Value | TTL |
|-----|-------|-----|
| `achievement_stats:{guildId}:{userId}` | `UserStats` JSON | 60s |
| `achievement_unlocked:{guildId}:{userId}` | Array of achievement IDs | 300s |

## Profile Integration

`/profile` calls `AchievementService.getAchievementCount(userId, guildId)` to show the total unlocked count. Premium canvas render highlights the achievement badge. No full check is triggered from profile — it reads `UserAchievement` count directly (separate lean query, cached inline).

## Adding New Achievements

1. Add a new `AchievementDef` entry to `ACHIEVEMENTS` in `src/services/achievement/achievement.config.ts`.
2. Add i18n keys `achievement.{id}.name` and `achievement.{id}.desc` to all 15 locale files.
3. No model migrations needed — achievements are identified by the `id` string in `UserAchievement`.

## File Map

| File | Purpose |
|------|---------|
| `src/models/userAchievement.model.ts` | UserAchievement schema |
| `src/services/achievement/achievement.config.ts` | 50 definitions, categories, rewards |
| `src/services/achievement/achievement.service.ts` | fetchUserStats, checkAndUnlock, getCount |
| `src/commands/slash/achievements.ts` | /achievements command |
