# Achievement System — Design Spec

> Config-driven achievement system with ~45 achievements, tiered rewards (coin/gem/star), hybrid on-demand tracking, and paginated embed display. Integrates with `/profile`.

## Context

Users lack long-term goals beyond daily loops (pray/work/quest). An achievement system gives milestones to chase, rewards dedication, and adds a "completionist" layer. Planned during profile card brainstorming as a follow-up feature.

## Architecture

**Config-driven**: All achievements defined in a single config file. Each achievement is an object with id, category, i18n keys, condition function, optional progress function, and reward. Adding a new achievement = adding an entry to the config array. No command changes needed.

**Hybrid on-demand tracking**: When user runs `/achievements` or `/profile`, `AchievementService.checkAndUnlock(userId, guildId)` fetches current stats from existing models, compares against config, unlocks new achievements, pays rewards, and returns results. No integration into existing commands.

**Progress is computed, not stored**: The `UserAchievement` model only records unlocked achievements. Progress toward locked achievements is calculated real-time from existing data (MemberXP, UserEconomy, UserWallet, UserQuest, Transaction counts).

## Data Model

### `UserAchievement`

| Field | Type | Default | Description |
|---|---|---|---|
| `userId` | String | required | User ID |
| `guildId` | String | required | Guild ID |
| `achievementId` | String | required | Matches config achievement ID |
| `unlockedAt` | Date | auto | When achievement was unlocked |
| `rewardPaid` | Boolean | true | Whether reward was distributed |

**Indexes**: unique `(userId, guildId, achievementId)`, compound `(userId, guildId)` for bulk query.

### Transaction Type

Add `achievement_reward` to the Transaction model TypeScript union AND schema enum array. Metadata: `{ achievementId, achievementName }`.

## Achievement Config

### Types

```typescript
type AchievementCategory = "economy" | "xp" | "mining" | "dungeon" | "social" | "gambling" | "voice" | "activity" | "quests" | "stars";

interface AchievementReward {
    coin?: number;
    gem?: number;
    star?: number;
}

interface AchievementDef {
    id: string;
    category: AchievementCategory;
    nameKey: string;        // i18n key for achievement name
    descKey: string;        // i18n key for description (includes target)
    reward: AchievementReward;
    condition: (stats: UserStats) => boolean;
    progress?: (stats: UserStats) => { current: number; target: number };
}
```

### UserStats — Aggregated Input

Fetched once per check, passed to all condition functions:

```typescript
interface UserStats {
    // From MemberXP
    level: number;
    xp: number;
    messageCount: number;
    voiceMinutes: number;
    reactionCount: number;
    // From UserEconomy
    coin: number;
    gem: number;
    prayStreak: number;
    mineDepth: number;
    mineCheckpoint: number;
    dungeonDepth: number;
    dungeonCheckpoint: number;
    // From UserWallet
    star: number;
    // From UserQuest
    questStreak: number;
    // From Transaction aggregation (counts)
    totalPrayCount: number;
    totalGambleCount: number;
    totalGiftCount: number;
    totalRobCount: number;
    totalWorkCount: number;
    totalFishCount: number;
}
```

### Achievement Catalog (~45 achievements)

#### Economy (8)

| ID | Name Key | Condition | Reward |
|---|---|---|---|
| `eco_first_pray` | `achievement.eco_first_pray` | totalPrayCount >= 1 | 50 coin |
| `eco_pray_streak_3` | `achievement.eco_pray_streak_3` | prayStreak >= 3 | 100 coin |
| `eco_pray_streak_7` | `achievement.eco_pray_streak_7` | prayStreak >= 7 | 150 coin, 1 gem |
| `eco_pray_streak_14` | `achievement.eco_pray_streak_14` | prayStreak >= 14 | 300 coin, 2 gem |
| `eco_pray_streak_30` | `achievement.eco_pray_streak_30` | prayStreak >= 30 | 500 coin, 5 gem, 1 star |
| `eco_rich_1` | `achievement.eco_rich_1` | coin >= 1,000 | 100 coin |
| `eco_rich_2` | `achievement.eco_rich_2` | coin >= 10,000 | 300 coin, 2 gem |
| `eco_rich_3` | `achievement.eco_rich_3` | coin >= 100,000 | 1000 coin, 10 gem, 3 star |

#### XP & Level (7)

| ID | Name Key | Condition | Reward |
|---|---|---|---|
| `xp_level_5` | `achievement.xp_level_5` | level >= 5 | 50 coin |
| `xp_level_10` | `achievement.xp_level_10` | level >= 10 | 100 coin |
| `xp_level_25` | `achievement.xp_level_25` | level >= 25 | 200 coin, 1 gem |
| `xp_level_50` | `achievement.xp_level_50` | level >= 50 | 400 coin, 3 gem, 1 star |
| `xp_level_75` | `achievement.xp_level_75` | level >= 75 | 600 coin, 5 gem, 2 star |
| `xp_level_100` | `achievement.xp_level_100` | level >= 100 | 1000 coin, 10 gem, 3 star |
| `xp_rookie` | `achievement.xp_rookie` | xp >= 1,000 | 75 coin |

#### Mining (5)

| ID | Name Key | Condition | Reward |
|---|---|---|---|
| `mine_first` | `achievement.mine_first` | mineDepth >= 2 | 50 coin |
| `mine_depth_5` | `achievement.mine_depth_5` | mineDepth >= 5 | 150 coin, 1 gem |
| `mine_depth_10` | `achievement.mine_depth_10` | mineDepth >= 10 | 300 coin, 2 gem |
| `mine_depth_25` | `achievement.mine_depth_25` | mineDepth >= 25 | 500 coin, 3 gem, 1 star |
| `mine_depth_50` | `achievement.mine_depth_50` | mineDepth >= 50 | 800 coin, 5 gem, 2 star |

#### Dungeon (5)

| ID | Name Key | Condition | Reward |
|---|---|---|---|
| `dg_first` | `achievement.dg_first` | dungeonDepth >= 2 | 50 coin |
| `dg_depth_5` | `achievement.dg_depth_5` | dungeonDepth >= 5 | 150 coin, 1 gem |
| `dg_depth_10` | `achievement.dg_depth_10` | dungeonDepth >= 10 | 300 coin, 2 gem |
| `dg_depth_25` | `achievement.dg_depth_25` | dungeonDepth >= 25 | 500 coin, 3 gem, 1 star |
| `dg_depth_50` | `achievement.dg_depth_50` | dungeonDepth >= 50 | 800 coin, 5 gem, 2 star |

#### Social (5)

| ID | Name Key | Condition | Reward |
|---|---|---|---|
| `social_first_gift` | `achievement.social_first_gift` | totalGiftCount >= 1 | 50 coin |
| `social_generous` | `achievement.social_generous` | totalGiftCount >= 10 | 200 coin, 1 gem |
| `social_philanthropist` | `achievement.social_philanthropist` | totalGiftCount >= 50 | 500 coin, 3 gem, 1 star |
| `social_first_rob` | `achievement.social_first_rob` | totalRobCount >= 1 | 50 coin |
| `social_master_thief` | `achievement.social_master_thief` | totalRobCount >= 20 | 300 coin, 2 gem |

#### Gambling (4)

| ID | Name Key | Condition | Reward |
|---|---|---|---|
| `gamble_first` | `achievement.gamble_first` | totalGambleCount >= 1 | 50 coin |
| `gamble_50` | `achievement.gamble_50` | totalGambleCount >= 50 | 200 coin, 1 gem |
| `gamble_100` | `achievement.gamble_100` | totalGambleCount >= 100 | 400 coin, 2 gem |
| `gamble_500` | `achievement.gamble_500` | totalGambleCount >= 500 | 800 coin, 5 gem, 2 star |

#### Voice (4)

| ID | Name Key | Condition | Reward |
|---|---|---|---|
| `voice_1h` | `achievement.voice_1h` | voiceMinutes >= 60 | 75 coin |
| `voice_10h` | `achievement.voice_10h` | voiceMinutes >= 600 | 200 coin, 1 gem |
| `voice_50h` | `achievement.voice_50h` | voiceMinutes >= 3,000 | 500 coin, 3 gem, 1 star |
| `voice_100h` | `achievement.voice_100h` | voiceMinutes >= 6,000 | 1000 coin, 5 gem, 2 star |

#### Activity (4)

| ID | Name Key | Condition | Reward |
|---|---|---|---|
| `msg_100` | `achievement.msg_100` | messageCount >= 100 | 75 coin |
| `msg_1k` | `achievement.msg_1k` | messageCount >= 1,000 | 200 coin, 1 gem |
| `msg_5k` | `achievement.msg_5k` | messageCount >= 5,000 | 500 coin, 3 gem, 1 star |
| `msg_10k` | `achievement.msg_10k` | messageCount >= 10,000 | 1000 coin, 5 gem, 3 star |

#### Quests (4)

| ID | Name Key | Condition | Reward |
|---|---|---|---|
| `quest_first` | `achievement.quest_first` | questStreak >= 1 | 50 coin |
| `quest_streak_3` | `achievement.quest_streak_3` | questStreak >= 3 | 150 coin, 1 gem |
| `quest_streak_7` | `achievement.quest_streak_7` | questStreak >= 7 | 300 coin, 2 gem |
| `quest_streak_14` | `achievement.quest_streak_14` | questStreak >= 14 | 500 coin, 3 gem, 1 star |

#### Stars (4)

| ID | Name Key | Condition | Reward |
|---|---|---|---|
| `star_first` | `achievement.star_first` | star >= 1 | 50 coin |
| `star_10` | `achievement.star_10` | star >= 10 | 200 coin, 1 gem |
| `star_50` | `achievement.star_50` | star >= 50 | 400 coin, 3 gem |
| `star_100` | `achievement.star_100` | star >= 100 | 800 coin, 5 gem, 2 star |

**Total: 50 achievements.**

### Reward Tier Summary

| Tier | Coin Range | Gem | Star | Count |
|---|---|---|---|---|
| Easy (first-time) | 50-75 | 0 | 0 | ~12 |
| Medium (milestone) | 100-300 | 1-2 | 0 | ~16 |
| Hard (dedication) | 400-600 | 3-5 | 1 | ~14 |
| Legendary (mastery) | 800-1000 | 5-10 | 2-3 | ~8 |

## `/achievements` Command

`/achievements` — no options, no subcommands.

### Flow

1. Guild-only check → `deferReply()`
2. Resolve locale
3. `AchievementService.checkAndUnlock(userId, guildId)` — fetch stats, compare, unlock new, pay rewards
4. Build paginated embeds (overview + 10 category pages = 11 pages)
5. If new achievements unlocked: prepend a "New Achievements!" notification section
6. Reply with embed + Previous/Next buttons (60s collector timeout)

### Page Layout

**Page 1 — Overview:**

```
🏆 Achievements — username (18/50)

📊 Economy: 5/8
⚔️ XP & Level: 3/7
⛏️ Mining: 2/5
🏰 Dungeon: 2/5
🤝 Social: 2/5
🎰 Gambling: 1/4
🎙️ Voice: 1/4
💬 Activity: 1/4
📜 Quests: 1/4
⭐ Stars: 0/4

Total rewards earned: 2,350 coin, 8 gem, 2 ⭐
```

**Pages 2-11 — Per category:**

```
⛏️ Mining (2/5)

✅ First Mine — Mine for the first time (+50 coin)
✅ Depth 5 — Reach mine depth 5 (+150 coin, +1 gem)
⬜ Depth 10 — Reach mine depth 10 ██████░░░░ 6/10 (+300 coin, +2 gem)
⬜ Depth 25 — Reach mine depth 25 ██░░░░░░░░ 6/25 (+500 coin, +3 gem, +1 ⭐)
⬜ Depth 50 — Reach mine depth 50 █░░░░░░░░░ 6/50 (+800 coin, +5 gem, +2 ⭐)

Page 4/11
```

**New unlock notification** (prepended to current page if applicable):

```
🎉 New achievements unlocked!
✅ Depth 5 — Reach mine depth 5 → +150 coin, +1 gem
```

## Check & Unlock Flow (`AchievementService`)

### `checkAndUnlock(userId, guildId)`

1. **Fetch UserStats** — parallel queries:
   - `MemberXPModel.findOne({ guildId, userId })`
   - `UserEconomyModel.findOne({ guildId, userId })`
   - `UserWalletModel.findOne({ userId })`
   - `UserQuestModel.findOne({ userId }).sort({ date: -1 })`
   - Transaction count aggregations (pray, gamble, gift, rob, work, fish — single aggregation with `$group` by type)

2. **Fetch unlocked IDs**: `UserAchievement.find({ userId, guildId }).select("achievementId")`

3. **Compare**: For each achievement in config NOT in unlocked set → run `condition(stats)`

4. **Unlock new**: `UserAchievement.insertMany(newUnlocks)`

5. **Pay rewards**: For each new unlock:
   - Coin/gem: `CurrencyService.addCoin()` / `CurrencyService.addGem()` with type `achievement_reward`
   - Star: `WalletService.addStar()` (if star reward > 0)

6. **Return**: `{ allAchievements: AchievementStatus[], newUnlocks: AchievementDef[], stats: UserStats }`

### `AchievementStatus`

```typescript
interface AchievementStatus {
    def: AchievementDef;
    unlocked: boolean;
    unlockedAt?: Date;
    progress?: { current: number; target: number };
}
```

## Caching

| Key | TTL | Purpose |
|---|---|---|
| `achievement_stats:{guildId}:{userId}` | 60s | UserStats aggregation result |
| `achievement_unlocked:{guildId}:{userId}` | 60s | Set of unlocked achievement IDs |

Invalidate both after new unlocks (delete keys after successful checkAndUnlock).

## Profile Integration

### Embed (`profileEmbed.ts`)

Add a field after the Activity field:

```
🏆 Achievements: 18/50
```

### Canvas (`canvasProfile.ts`)

Draw a small trophy icon + count (`🏆 18/50`) in the layout — exact position to be determined during implementation based on available space.

### Data Flow Change

In `src/commands/slash/profile.ts`, add `AchievementService.getUnlockedCount(userId, guildId)` to the parallel fetch. This returns just the count (lightweight query — `countDocuments`), not the full check flow.

## Files to Create

| File | Purpose |
|---|---|
| `src/models/userAchievement.model.ts` | Mongoose schema |
| `src/services/achievement/achievement.config.ts` | 50 achievement definitions |
| `src/services/achievement/achievement.service.ts` | Check, unlock, stats, count |
| `src/commands/slash/achievements.ts` | Slash command with pagination |

## Files to Modify

| File | Change |
|---|---|
| `src/models/transaction.model.ts` | Add `achievement_reward` type |
| `src/util/profile/profileEmbed.ts` | Add achievement count field |
| `src/util/profile/canvasProfile.ts` | Add achievement count badge |
| `src/commands/slash/profile.ts` | Add unlocked count to parallel fetch |
| `src/util/help/commandCategories.ts` | Add `achievements: "general"` |
| `src/locales/*.json` (15 files) | Add `cmd.achievements.desc`, `achievement.*` keys (~120 new keys) |

## Edge Cases

- **User has no data at all**: All conditions return false, all progress shows 0/target. No error.
- **Coin-based achievements (eco_rich_*)**: Condition checks current balance. If user spends below threshold after unlocking, achievement stays unlocked (persist in DB). They don't "lose" it.
- **Star rewards**: Stars are global (cross-server). Achievement is per-server, but star reward goes to global wallet. This means the same user can earn star rewards for the same achievement in different servers. This is intentional — it incentivizes being active in multiple servers.
- **Rapid re-check**: 60s cache prevents hammering DB if user spams `/achievements`.
- **Transaction count queries**: Single aggregation pipeline grouping by type, not N separate queries. Performance-safe.
- **Freeze check**: Not needed — `/achievements` is read-only. Reward payment happens internally via CurrencyService which doesn't check freeze (admin-level operation).

## Not in Scope (v1)

- Achievement leaderboard (who has the most)
- Rare/hidden achievements
- Achievement sharing/showcasing
- Admin commands to grant/revoke achievements
- Custom achievements per server
