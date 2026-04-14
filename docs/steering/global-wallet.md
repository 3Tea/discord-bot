# Global Wallet

> Steering doc for AI assistants and contributors. Covers the cross-server global wallet — star currency, daily claims, streak tracking, achievement milestones, and transaction history.

## Overview

The global wallet is a server-independent currency system. Every Discord user has exactly one wallet containing **star** — a global currency that persists across all servers the bot operates in. Stars are earned through daily claims, streak milestones, and achievement milestones. Unlike per-guild coin/gem (see [economy-system.md](economy-system.md)), star is not scoped to a guild — the `UserWallet` model is keyed solely on `userId`.

Transactions are stored in the shared `Transaction` model with `guildId = "global"`.

## Commands (`/wallet`)

| Subcommand | Parameters | Description |
|------------|-----------|-------------|
| `view` | — | Display wallet balance, streak count, milestone progress, and last claim time |
| `daily` | — | Claim daily star reward (once per UTC day) |
| `history` | `page` (integer, optional, min 1) | View paginated global transaction log |

All subcommands defer the reply before processing.

## Daily Claim Flow

`/wallet daily` triggers `WalletService.claimDaily(userId)`:

1. **Cooldown check** (atomic) — `findOneAndUpdate` matches if `lastDaily` is `null` or `< startOfToday` (UTC midnight). Sets `lastDaily = now`. If no document matches and `lastDaily` is today, throws `DAILY_COOLDOWN`.
2. **Streak calculation** — if `lastStreakDate` was the previous UTC day (`isConsecutiveUTCDay`), increment `dailyStreak`; otherwise reset to 1.
3. **Base reward** — random 1-3 star (`Math.floor(Math.random() * 3) + 1`).
4. **Premium bonus** — Galaxy tier users receive `dailyBonusStars` (currently +2) on top of base reward via `getTierConfig(wallet.premiumTier)`.
5. **Streak milestone check** — if `newStreak` matches a milestone threshold exactly, add bonus star on top of base.
6. **Atomic update** — `$inc star` by total (base + premium bonus + streak bonus), `$set dailyStreak` and `lastStreakDate`.
6. **Transaction logging** — one `global_daily` entry for base reward; a separate `global_streak_bonus` entry if a milestone was hit.
7. **Multi-server milestone check** — after the daily claim, the command queries `UserEconomy.distinct("guildId", { userId })` to count how many servers the user is active in, then calls `checkAndAwardMilestone` for each reached threshold.

**Error handling**: `DAILY_COOLDOWN` error surfaces a localized cooldown message. All other errors surface `common.error`.

## Streak System

Consecutive UTC days of claiming `/wallet daily` build a streak.

**Detection**: `isConsecutiveUTCDay(prev, now)` — normalizes both dates to UTC midnight, checks difference is exactly 86,400,000 ms.

**Reset**: If the user misses a day (difference > 1 UTC day), `dailyStreak` resets to 1.

**Same-day guard**: `isSameUTCDay()` prevents double-claiming. The atomic query on `lastDaily < startOfToday` enforces this at the database level.

## Streak Milestones

Awarded on the **exact day** the streak count matches. Bonus star is added on top of the base daily reward.

| Streak | Bonus Star |
|--------|-----------|
| 3 days | 2 |
| 7 days | 5 |
| 14 days | 10 |
| 30 days | 20 |

Defined in `DAILY_STREAK_MILESTONES` within `wallet.service.ts`.

## Achievement Milestones

One-time star bonuses awarded for reaching specific accomplishments. Each milestone can only be claimed once per user — enforced atomically via `$ne` on `claimedMilestones` array and `$addToSet`.

| Milestone Key | Threshold | Star Reward |
|---------------|-----------|-------------|
| `level_10` | Reach level 10 | 5 |
| `level_25` | Reach level 25 | 15 |
| `level_50` | Reach level 50 | 30 |
| `level_100` | Reach level 100 | 50 |
| `pray_streak_7` | 7-day pray streak | 3 |
| `pray_streak_14` | 14-day pray streak | 8 |
| `pray_streak_30` | 30-day pray streak | 20 |
| `leaderboard_top3` | Top 3 on any leaderboard | 10 |
| `multi_server_3` | Active in 3+ servers | 5 |
| `multi_server_5` | Active in 5+ servers | 10 |
| `multi_server_10` | Active in 10+ servers | 20 |

Total achievement milestones: **11** (displayed as `n/11` in wallet view).

Transaction type: `global_milestone` with metadata `{ milestone: "<key>" }`.

## Multi-Server Milestones

Checked on every `/wallet daily` claim. The command counts distinct `guildId` values from the user's `UserEconomy` records (servers where the user has per-guild economy activity).

| Server Count | Milestone Key | Star Reward |
|-------------|---------------|-------------|
| 3+ | `multi_server_3` | 5 |
| 5+ | `multi_server_5` | 10 |
| 10+ | `multi_server_10` | 20 |

These are a subset of achievement milestones and follow the same one-time claim logic via `checkAndAwardMilestone`.

## View Display

`/wallet view` shows an embed (color `#FFD700`) with:

| Field | Value |
|-------|-------|
| Title | Localized with username |
| Star balance | Formatted with locale separators |
| Daily streak | Current consecutive day count |
| Milestones claimed | `n/11` progress |
| Last daily | Discord relative timestamp (`<t:...:R>`), shown only if user has claimed at least once |

## History

`/wallet history` displays a paginated transaction log.

- **Page size**: 10 entries per page
- **Sort**: `createdAt` descending (newest first)
- **Filter**: `userId` + `guildId = "global"`
- **Format**: Each line shows relative timestamp, transaction type in backticks, and signed star delta
- **Empty state**: Localized "no transactions" message
- **Pagination**: Footer shows `page X / Y`; page number is clamped to `[1, totalPages]`

Transaction types that appear in global history: `global_daily`, `global_streak_bonus`, `global_milestone`, `global_spend`.

## Data Model

### UserWallet

Collection: `UserWallets`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `userId` | String | required | Discord user ID (unique) |
| `star` | Number | 0 | Global star balance |
| `lastDaily` | Date / null | null | Timestamp of last daily claim |
| `dailyStreak` | Number | 0 | Current consecutive daily claim count |
| `lastStreakDate` | Date / null | null | Date used for consecutive-day detection |
| `claimedMilestones` | String[] | [] | Array of claimed milestone keys |
| `premiumTier` | String / null | null | `"star"` or `"galaxy"` (see [premium-system.md](premium-system.md)) |
| `premiumUntil` | Date / null | null | Expiry timestamp, `null` = lifetime |
| `premiumSource` | String / null | null | `"auto"` or `"manual"` |
| `premiumGrantedBy` | String / null | null | Admin userId who granted |
| `createdAt` | Date | auto | Mongoose timestamp |
| `updatedAt` | Date | auto | Mongoose timestamp |

**Indexes**:
- Unique `(userId)` — one wallet per user
- `(star: -1)` — star leaderboard queries

### Transaction (global entries)

Global wallet transactions reuse the shared `Transaction` model with `guildId = "global"`.

| Type | `coinDelta` meaning | Metadata |
|------|-------------------|----------|
| `global_daily` | Star earned (base) | `{ streak: <number> }` |
| `global_streak_bonus` | Bonus star from milestone | `{ days: <number> }` |
| `global_milestone` | Star from achievement | `{ milestone: "<key>" }` |
| `global_spend` | Star spent (negative) | Varies by context |

## Service Functions

### WalletService (`services/economy/wallet.service.ts`)

| Function | Description |
|----------|-------------|
| `getBalance(userId)` | Returns `WalletBalance` (star, dailyStreak, lastDaily, claimedMilestones). Creates wallet if missing via `getOrCreate` |
| `addStar(userId, amount, reason, metadata?)` | Increment star + log transaction. Throws if amount <= 0 |
| `deductStar(userId, amount, reason, metadata?)` | Atomic check-and-deduct (`star >= amount`). Throws `InsufficientStarError` if balance too low |
| `claimDaily(userId)` | Full daily claim flow: cooldown check, streak calc, reward, milestone detection. Returns `DailyClaimResult` |
| `checkAndAwardMilestone(userId, milestoneKey)` | Atomically awards milestone star if not already claimed. Returns `{ awarded, star }` |
| `getOrCreate(userId)` | Upsert wallet with defaults. Used internally by all other functions |

### Exported Types

| Type | Fields |
|------|--------|
| `WalletBalance` | `star`, `dailyStreak`, `lastDaily`, `claimedMilestones` |
| `DailyClaimResult` | `baseReward`, `premiumBonus`, `streakBonus`, `streak`, `milestoneHit` |
| `InsufficientStarError` | Error with `available` and `required` properties |

### Internal Helpers

| Helper | Description |
|--------|-------------|
| `isSameUTCDay(d1, d2)` | Compare UTC year/month/date (ignores time) |
| `isConsecutiveUTCDay(prev, now)` | Check if dates are exactly 1 UTC day apart |
| `logTransaction(userId, type, starDelta, metadata?)` | Creates `Transaction` with `guildId = "global"`, `gemDelta = 0` |

## Cross-References

- **Per-guild economy**: [economy-system.md](economy-system.md) — coin/gem scoped to `(userId, guildId)`, separate from global star
- **Multi-server detection**: Uses `UserEconomy` model from the per-guild economy to count distinct guilds
- **Transaction model**: Shared with per-guild transactions; distinguished by `guildId = "global"` and `global_*` type prefixes
- **XP milestones**: Level-based achievement milestones (`level_10`, `level_25`, etc.) depend on the XP leveling system documented in [xp-system.md](xp-system.md)
- **Pray streak milestones**: `pray_streak_7/14/30` milestones depend on the pray streak system in [economy-system.md](economy-system.md)
