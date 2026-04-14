# Daily Quest System — Design Spec

## Goal

Add a daily quest system that generates 3 random quests per user per day (1 easy + 1 medium + 1 hard). Quests are completed by using existing bot commands. Rewards are hybrid: coin (per-server) + star (global). Premium tiers get better rewards. Quest streaks give bonus stars.

## Quest Pool (18 templates)

### Easy (pick 1/day)

| ID | Quest | Trigger Command | Count |
|----|-------|----------------|-------|
| `e_pray` | Pray for someone | `/pray target:@user` | 1 |
| `e_curse` | Curse someone | `/curse target:@user` | 1 |
| `e_rank` | Check your rank | `/rank` | 1 |
| `e_balance` | Check your balance | `/balance` | 1 |
| `e_wallet` | View wallet | `/wallet view` | 1 |
| `e_daily` | Claim daily stars | `/wallet daily` | 1 |

### Medium (pick 1/day)

| ID | Quest | Trigger Command | Count |
|----|-------|----------------|-------|
| `m_work` | Work a job | `/work` | 1 |
| `m_fish` | Catch a fish | `/fish` | 1 |
| `m_mine` | Mine for minerals | `/mine` | 1 |
| `m_gift` | Gift coins to someone | `/gift` | 1 |
| `m_confess` | Submit a confession | `/confession submit` | 1 |
| `m_shop` | Browse the shop | `/shop view` | 1 |

### Hard (pick 1/day)

| ID | Quest | Trigger Command | Count |
|----|-------|----------------|-------|
| `h_dungeon` | Complete a dungeon run | `/dungeon` (run ends) | 1 |
| `h_mine2` | Mine 2 times | `/mine` | 2 |
| `h_gamble_win` | Win a gamble | `/gamble` (win) | 1 |
| `h_pray_curse` | Pray + Curse in same day | `/pray` + `/curse` | 2 (different commands) |
| `h_fish2` | Fish 2 times | `/fish` | 2 |
| `h_rob_success` | Rob someone successfully | `/rob` (success) | 1 |

## Quest Generation

- **Deterministic random**: Seed = `hash(userId + UTCDateString)` → picks 1 from each difficulty pool.
- Same user + same day = same 3 quests. No DB write needed for generation.
- **Reset**: UTC midnight.

## Rewards

### Per-quest (immediate on complete, paid as coin to the server where command was used)

| Difficulty | Free | Star Tier | Galaxy Tier |
|-----------|------|-----------|-------------|
| Easy | 10 coin | 15 coin | 20 coin |
| Medium | 20 coin | 30 coin | 40 coin |
| Hard | 35 coin | 50 coin | 70 coin |

### All-3-complete bonus (claim via `/quest claim`, paid as star to global wallet)

| | Free | Star Tier | Galaxy Tier |
|---|------|-----------|-------------|
| Star bonus | +1 | +2 | +3 |

### Quest streak (consecutive days completing all 3 + claiming)

| Streak | Free | Star Tier | Galaxy Tier |
|--------|------|-----------|-------------|
| 3 days | +1 star | +2 star | +3 star |
| 7 days | +3 star | +5 star | +8 star |
| 14 days | +5 star | +8 star | +12 star |
| 30 days | +10 star | +15 star | +20 star |

Missing a day resets streak to 0.

### Reward flow

- **Coin**: Deposited into the server economy where the quest-completing command was used.
- **Star**: Deposited into global wallet on `/quest claim`.
- Per-quest coin is paid automatically on quest completion.
- All-3-complete star bonus requires explicit `/quest claim`.

## Commands

### `/quest view`

View today's quests and progress. Ephemeral reply.

```
📋 Daily Quests — April 14, 2026

✅ Pray for someone (1/1) — 10 coin ✓
⬜ Work a job (0/1) — 20 coin
⬜ Mine 2 times (1/2) — 35 coin

Progress: 1/3 | Streak: 5 days 🔥
```

- ✅ = complete, ⬜ = incomplete
- Shows reward per quest (adjusted for premium tier)
- Shows quest streak

### `/quest claim`

Claim all-3-complete bonus. Ephemeral reply.

- Not 3/3 → "Complete all quests first. Progress: 2/3."
- 3/3 unclaimed → Pay star bonus + streak bonus (if milestone hit) + update streak. Show reward embed.
- Already claimed → "Already claimed today."

## Progress Tracking

### Inline pattern (event-driven ready)

```typescript
// Added at end of each command after successful execution:
const questResult = await QuestService.trackProgress(userId, guildId, "pray");

// Future event-driven migration:
// eventBus.emit("command:success", { userId, guildId, trigger: "pray" })
// QuestService listens internally — same trackProgress logic
```

### trackProgress flow

1. Get/create today's quest record (Redis cache → DB fallback)
2. Find matching quest for trigger
3. If no match → return `null`
4. Increment progress
5. If quest now complete → pay coin reward via `CurrencyService.addCoin()`
6. Update Redis cache + DB
7. Return `{ questCompleted?: string; allComplete?: boolean }` for inline notification

### Inline notification

When a quest completes, append to the command's response embed:

```
⭐ Quest complete: "Pray for someone" (+10 coin)
```

When all 3 complete:

```
🎉 All quests complete! Use /quest claim to collect your bonus.
```

## Trigger Mapping

Commands that track quest progress:

| Command | Trigger(s) | Condition |
|---------|-----------|-----------|
| `/pray` | `"pray"`, `"pray_target"` (if has target) | After successful pray |
| `/curse` | `"curse"`, `"curse_target"` (if has target) | After successful curse |
| `/rank` | `"rank"` | After reply sent |
| `/balance` | `"balance"` | After reply sent |
| `/wallet view` | `"wallet_view"` | After reply sent |
| `/wallet daily` | `"wallet_daily"` | After successful claim |
| `/work` | `"work"` | After successful work |
| `/fish` | `"fish"` | After successful catch |
| `/mine` | `"mine"` | After successful mine (not on collapse) |
| `/gift` | `"gift"` | After successful gift |
| `/confession submit` | `"confession"` | After successful submit |
| `/shop view` | `"shop_view"` | After reply sent |
| `/dungeon` | `"dungeon"` | After run ends (win/lose/leave) |
| `/gamble` | `"gamble_win"` | After winning only |
| `/rob` | `"rob_success"` | After successful rob only |

## Data Model

### UserQuest (MongoDB)

Collection: `UserQuests`

```typescript
interface IUserQuest extends Document {
    userId: string;
    date: string;               // "2026-04-14" UTC date key
    quests: {
        questId: string;        // e.g. "e_pray", "m_work", "h_dungeon"
        progress: number;       // current count
        target: number;         // required count
        completed: boolean;
        rewardPaid: boolean;    // coin reward already given
    }[];
    claimed: boolean;           // all-3 star bonus claimed
    questStreak: number;        // consecutive days
    lastQuestDate: string;      // last date with successful claim
}
```

Index: `{ userId: 1, date: 1 }` (unique)

Document created lazily on first `/quest view` or first quest progress track.

### Redis

| Key | Value | TTL |
|-----|-------|-----|
| `quest:{userId}:{date}` | JSON quest progress (same shape as DB quests array) | Until UTC midnight |

Hot path: every command checks quest progress → Redis first, DB fallback.

## Premium Config

Add to `TierConfig`:

```typescript
questCoinMultiplier: number;    // free: 1.0, star: 1.5, galaxy: 2.0
questStarBonus: number;         // free: 1, star: 2, galaxy: 3
questStreakMultiplier: number;   // free: 1.0, star: 1.0, galaxy: 1.0 (streaks same for all)
```

Wait — the reward tables already define exact values per tier, not multipliers. Simpler approach: store the reward tables directly in quest config, keyed by tier.

```typescript
// In quest.config.ts, not premium.config.ts
const QUEST_REWARDS: Record<"free" | PremiumTier, { easy: number; medium: number; hard: number; allComplete: number }> = {
    free:   { easy: 10, medium: 20, hard: 35, allComplete: 1 },
    star:   { easy: 15, medium: 30, hard: 50, allComplete: 2 },
    galaxy: { easy: 20, medium: 40, hard: 70, allComplete: 3 },
};

const QUEST_STREAK_REWARDS: Record<"free" | PremiumTier, { 3: number; 7: number; 14: number; 30: number }> = {
    free:   { 3: 1, 7: 3, 14: 5, 30: 10 },
    star:   { 3: 2, 7: 5, 14: 8, 30: 15 },
    galaxy: { 3: 3, 7: 8, 14: 12, 30: 20 },
};
```

This keeps quest rewards self-contained in the quest module rather than adding more fields to the already-growing TierConfig.

## Transaction Types

Add to `transaction.model.ts`:

```typescript
| "quest_reward"      // Per-quest coin reward (coinDelta, per server)
| "quest_complete"    // All-3 star bonus (via WalletService, global)
| "quest_streak"      // Streak milestone star bonus (via WalletService, global)
```

## i18n Keys

```
quest.view.title            — "📋 Daily Quests — {{date}}"
quest.view.complete         — "✅ {{name}} ({{progress}}/{{target}}) — {{reward}} coin ✓"
quest.view.incomplete       — "⬜ {{name}} ({{progress}}/{{target}}) — {{reward}} coin"
quest.view.progress         — "Progress: {{done}}/3"
quest.view.streak           — "Streak: {{days}} days 🔥"
quest.view.no_streak        — "Streak: 0 days"
quest.claim.success         — "Claimed {{stars}} star! {{streak}}"
quest.claim.streak_bonus    — "+{{bonus}} star streak bonus ({{days}} days)!"
quest.claim.not_complete    — "Complete all quests first. Progress: {{done}}/3."
quest.claim.already         — "Already claimed today."
quest.notify.complete       — "⭐ Quest complete: \"{{name}}\" (+{{reward}} coin)"
quest.notify.all_done       — "🎉 All quests complete! Use `/quest claim` to collect your bonus."
quest.{questId}             — Display name for each of the 18 quests
cmd.quest.desc              — "Daily quests — complete tasks for coin and star rewards"
```

Plus 18 quest name keys (one per quest template).

## Files

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/models/userQuest.model.ts` | UserQuest schema |
| Create | `src/services/quest/quest.config.ts` | Quest pool, reward tables, generation |
| Create | `src/services/quest/quest.service.ts` | trackProgress, generateQuests, claim |
| Create | `src/commands/slash/quest.ts` | `/quest view` + `/quest claim` |
| Modify | `src/models/transaction.model.ts` | 3 new transaction types |
| Modify | 12+ command files | Add `QuestService.trackProgress()` call |
| Modify | `src/util/help/commandCategories.ts` | Add quest → economy |
| Modify | `src/locales/*.json` (15 files) | ~30 i18n keys |

## Out of Scope

- **Guild-specific quest config**: No per-guild enable/disable or custom quest pools. All users get quests globally.
- **Quest reroll**: No ability to reroll/skip a quest. Tomorrow brings new ones.
- **Party/co-op quests**: Single-player only.
- **Event-driven architecture**: Inline tracking for now, designed for future migration.
