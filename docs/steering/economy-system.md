# Economy System

> Steering doc for AI assistants and contributors. Covers the currency system — coins, gems, pray/curse, streaks, shop, and admin tools.

## Overview

Each server has an independent economy. Members earn coins and gems through daily pray/curse actions and streak milestones. Currency can be spent in the server shop on roles, cosmetics, and currency exchanges. All transactions are logged for audit.

## Currencies

| Currency | Earning methods | Primary use |
|----------|----------------|-------------|
| **Coin** | Pray, curse, streak bonuses, admin | Shop purchases |
| **Gem** | 5% chance on targeted pray, streak milestones (7+), admin | Premium shop items |

## Pray (`/pray`)

Daily action to earn coins. Once per UTC day.

### Rewards

| Scenario | Coin reward | Gem chance |
|----------|------------|------------|
| Self pray (no target) | 50-150 | None |
| Targeted pray (for another user) | 100-200 (user), 80-150 (target) | 5% for 1 gem (user only) |

- Cannot pray for bots or yourself
- Target receives coins independently

### Streak System

Consecutive UTC days of praying build a streak. Missing a day resets to 1.

**Detection**: Uses `isConsecutiveUTCDay()` — checks if previous pray was exactly the prior UTC day.

**Milestone bonuses** (awarded on the exact day):

| Streak | Bonus Coins | Bonus Gems |
|--------|------------|------------|
| 3 days | 50 | 0 |
| 7 days | 150 | 1 |
| 14 days | 300 | 2 |
| 30 days | 500 | 5 |

Milestone bonuses are added on top of the base coin reward. Gem bonuses are separate from the 5% random chance.

### State

Updated after each pray: `lastPray` (timestamp), `prayStreak` (count), `lastStreakDate` (date).

## Curse (`/curse`)

Simpler daily action with lower rewards and no streak or gem mechanics.

| Scenario | Coin reward |
|----------|------------|
| Self curse (no target) | 20-80 |
| Targeted curse | 40-100 (user), 30-70 (target) |

- Separate cooldown from pray (both 1 per UTC day, tracked independently via `lastCurse`)
- No gems, no streaks, no milestones

## Shop (`/shop`)

### Viewing Items (`shop view`)

- Paginated: 5 items per page, sorted by price ascending
- Shows: name, price, currency type (coin/gem), description, item ID, stock status
- Only `enabled: true` items displayed

### Buying Items (`shop buy`)

1. Validate item exists and is enabled
2. Check stock (if not unlimited)
3. **Atomic deduction** — checks balance and deducts in single DB operation
4. Apply effect based on item type:
   - **role**: Add Discord role to member. Refund if member already has it
   - **cosmetic**: No effect (future use)
   - **currency_exchange**: No effect (future use)
5. Decrement stock by 1 (if stock is not null/unlimited)
6. On failure: refund currency

**Errors**: `ITEM_NOT_FOUND`, `OUT_OF_STOCK`, `ALREADY_HAS_ROLE`, `EFFECT_FAILED`, `INSUFFICIENT_FUNDS`

### Adding Items (`shop add` — Admin, requires Administrator)

Parameters: `item-id`, `name`, `description`, `type` (role/cosmetic/currency_exchange), `price`, `currency` (coin/gem), `role` (optional), `stock` (optional, null = unlimited).

Prevents duplicate `itemId` per guild.

### Removing Items (`shop remove` — Admin, requires Administrator)

Soft delete: sets `enabled: false`. Does not physically delete from database.

## Admin Commands (`/economy`)

The `/economy` command is organized into 4 subcommand groups. All admin and bulk subcommands require `Administrator` permission. Responses are ephemeral.

### Group Structure

| Group | Purpose |
|-------|---------|
| `balance` | Read-only balance queries (`balance check`) |
| `config` | Server configuration (`gambling-config-*`, `work-config-*`, `social-config-*`, `reward-config-*`) |
| `admin` | Administrative tools — audit, freeze, reset, logs |
| `bulk` | Mass currency operations across multiple users |

### `/economy balance`

| Subcommand | Action |
|------------|--------|
| `balance check @user` | View a user's coin, gem, streak, and last pray/curse timestamps |

### `/economy config`

All pre-existing per-guild configuration subcommands (`gambling-config-*`, `work-config-*`, `social-config-*`, `reward-config-*`) now live under this group. See individual feature sections below for parameters.

### `/economy admin` — Balance Management

| Subcommand | Action | Transaction logged |
|------------|--------|-------------------|
| `admin set-coin @user <amount>` | Set exact coin amount | Delta (new − old), type `admin` |
| `admin add-coin @user <amount>` | Add/subtract coins | Exact amount, type `admin` |
| `admin set-gem @user <amount>` | Set exact gem amount | Delta (new − old), type `admin` |
| `admin add-gem @user <amount>` | Add/subtract gems | Exact amount, type `admin` |

Transaction type: `"admin"` with metadata `{ action: "set-coin" | "add-coin" | ... }`.

### `/economy admin` — Dashboard

`/economy admin dashboard` — Server economy overview. No arguments. Ephemeral response.

Displays:
- **Circulation stats**: Total coins and gems in circulation, number of active holders
- **24h flow**: Coins earned vs. spent in the last 24 hours, net balance
- **Source/sink breakdown**: Contribution by transaction type (pray, work, gambling, admin, etc.)
- **Wealth distribution**: Percentile breakdown (top 1%, top 10%, median, bottom 10%)
- **Week comparison**: Current week vs. prior week totals
- **Anomaly alerts**: Flags unusual spikes (single admin grant > threshold, unusually high gambling wins, etc.)

### `/economy admin` — Transaction History

`/economy admin history @user [type] [limit]`

Paginated audit trail of a user's transactions.

| Option | Type | Description |
|--------|------|-------------|
| `@user` | User | Target user (required) |
| `type` | String | Filter by transaction type (optional) |
| `limit` | Integer | Entries per page, default 10, max 25 (optional) |

- Shows: short transaction ID, type, coin delta, gem delta, timestamp, metadata summary
- Paginated with Previous / Next buttons
- Short IDs are used with `admin reverse` to undo specific entries

### `/economy admin` — Reverse Transaction

`/economy admin reverse <id>`

Undoes a specific transaction by its short ID.

| Behaviour | Detail |
|-----------|--------|
| Lookup | Finds transaction by short ID within the guild |
| Reversal | Applies the inverse delta (`coinDelta × -1`, `gemDelta × -1`) to the user's balance |
| Logging | Creates a new transaction of type `"reverse"` referencing the original ID |
| Balance guard | If reversal would make balance negative, command fails with an error |
| Idempotency | Each transaction can only be reversed once (tracked via metadata flag) |

### `/economy admin` — Freeze / Unfreeze

| Subcommand | Action |
|------------|--------|
| `admin freeze @user [reason]` | Locks the user's economy access for this guild |
| `admin unfreeze @user` | Removes the freeze |

While frozen a user cannot earn coins/gems from any source (pray, work, gambling, passive rewards) and cannot use shop or transfer commands. Admin balance edits bypass the freeze check. The freeze record stores `frozenBy` (admin user ID) and optional `reason`. See `EconomyFreeze` model below.

### `/economy admin` — Reset with Snapshot

`/economy admin reset <scope> [@user]`

Resets economy data after auto-snapshotting the current state.

| Scope | What is reset |
|-------|--------------|
| `coin` | Coin balance → 0 |
| `gem` | Gem balance → 0 |
| `streak` | `prayStreak`, `lastStreakDate` → 0 / null |
| `all` | All of the above + `lastPray`, `lastCurse` |

| Option | Description |
|--------|-------------|
| `@user` | Reset a specific user. Omit to reset **all members** of the guild (confirmation prompt shown) |

Before any reset, an `EconomySnapshot` record is created automatically. Transaction type: `"reset"`.

### `/economy admin` — Rollback

`/economy admin rollback <snapshot-id>`

Restores balances from a previously created snapshot.

- Lists recent snapshots if no ID is supplied (up to 10)
- Applies stored coin/gem/streak values back to `UserEconomy` records
- Creates transactions of type `"rollback"` for each affected user
- Partial rollback (single user) supported when snapshot was created for that user only

### `/economy admin` — Log Channel

| Subcommand | Action |
|------------|--------|
| `admin log-setup #channel` | Set the economy event log channel for this guild |
| `admin log-config` | View or update log thresholds (min delta to log, transaction types to include) |

When configured, qualifying transactions are posted to the log channel as embeds: user, type, delta, running balance, timestamp. Thresholds prevent log spam from small routine transactions. See `EconomyLogConfig` model and `EconomyLogService` below.

### `/economy bulk` — Bulk Distribute

`/economy bulk distribute <amount> <currency> [@role]`

Awards currency to multiple members at once.

| Option | Description |
|--------|-------------|
| `amount` | Coin or gem amount per user |
| `currency` | `coin` or `gem` |
| `@role` | Restrict to members with this role. Omit for all members |

Uses `bulkWrite` for efficiency. Transaction type: `"bulk_distribute"` per user. Progress embed shown; large guilds are processed in batches.

### `/economy bulk` — Bulk Tax

`/economy bulk tax <amount> <currency> [@role]`

Deducts currency from multiple members at once.

| Option | Description |
|--------|-------------|
| `amount` | Flat amount to deduct per user |
| `currency` | `coin` or `gem` |
| `@role` | Restrict to members with this role. Omit for all members |

Members whose balance would go below 0 are set to 0 (no negative balances). Transaction type: `"bulk_tax"` per user.

## Data Models

### UserEconomy

| Field | Type | Default |
|-------|------|---------|
| `userId` | String | required |
| `guildId` | String | required |
| `coin` | Number | 0 |
| `gem` | Number | 0 |
| `lastPray` | Date | null |
| `lastCurse` | Date | null |
| `prayStreak` | Number | 0 |
| `lastStreakDate` | Date | null |
| `mineDepth` | Number | 1 |
| `mineCheckpoint` | Number | 1 |
| `dungeonDepth` | Number | 1 |
| `dungeonCheckpoint` | Number | 1 |

Mine/dungeon depth and checkpoint fields track per-user per-guild progression for the mini-game systems. See [mine-system.md](mine-system.md) and [dungeon-system.md](dungeon-system.md).

**Indexes**: Unique `(userId, guildId)`, `(guildId, coin: -1)` for coin leaderboard.

### ShopItem

| Field | Type | Default |
|-------|------|---------|
| `guildId` | String | required |
| `itemId` | String | required |
| `name` | String | required |
| `description` | String | required |
| `type` | Enum | `role` / `cosmetic` / `currency_exchange` |
| `price` | Number | required |
| `currencyType` | Enum | `coin` / `gem` |
| `roleId` | String | optional (for role type) |
| `stock` | Number / null | null (unlimited) |
| `enabled` | Boolean | true |

**Indexes**: Unique `(guildId, itemId)`, `(guildId, enabled)` for shop queries.

### Transaction

| Field | Type | Default |
|-------|------|---------|
| `userId` | String | required |
| `guildId` | String | required |
| `type` | Enum | see below |
| `coinDelta` | Number | 0 |
| `gemDelta` | Number | 0 |
| `metadata` | Mixed | {} |
| `createdAt` | Date | auto |

**Index**: `(userId, guildId, createdAt: -1)` for transaction history.

**Transaction types**:

| Type | Source |
|------|--------|
| `pray` | `/pray` command |
| `curse` | `/curse` command |
| `purchase` | Shop buy |
| `exchange` | Currency exchange |
| `streak_bonus` | Pray streak milestone |
| `admin` | `/economy admin set-*/add-*` |
| `level_up` | XP level-up passive reward |
| `voice_reward` | Voice time passive reward |
| `gambling` | `/gamble` games |
| `work` | `/work` command |
| `fish` | `/fish` command |
| `gift` | `/gift` transfer |
| `rob` | `/rob` steal |
| `rob_penalty` | `/rob` failed penalty |
| `bulk_distribute` | `/economy bulk distribute` |
| `bulk_tax` | `/economy bulk tax` |
| `reverse` | `/economy admin reverse` — undo of another transaction |
| `reset` | `/economy admin reset` — balance zeroed |
| `rollback` | `/economy admin rollback` — balance restored from snapshot |

> **Two-place edit rule**: Adding a `TransactionType` requires updating both the TypeScript union (line ~3) and the schema `enum` array (line ~44) in `transaction.model.ts`. Missing either causes runtime errors TypeScript will not catch.

**Metadata examples**:
- Pray: `{ targetId: "..." }` or `{}`
- Purchase: `{ itemId: "...", itemName: "..." }`
- Admin: `{ action: "set-coin", newTotal: 500 }`
- Streak bonus: `{ milestone: 7, bonusCoin: 150, bonusGem: 1 }`
- Reverse: `{ originalId: "<transaction short ID>", originalType: "admin" }`
- Reset: `{ scope: "all", resetBy: "<adminUserId>", snapshotId: "<snapshot short ID>" }`
- Rollback: `{ snapshotId: "<snapshot short ID>", restoredBy: "<adminUserId>" }`
- Bulk distribute/tax: `{ adminId: "<userId>", roleId?: "<roleId>", totalAffected: 42 }`

### EconomyFreeze

Tracks frozen users who cannot access economy features.

| Field | Type | Notes |
|-------|------|-------|
| `userId` | String | required |
| `guildId` | String | required |
| `frozenBy` | String | Admin user ID who applied the freeze |
| `reason` | String | Optional reason string |
| `createdAt` | Date | Auto-managed |

**Index**: Unique `(userId, guildId)`.

Admin balance edits (`set-coin`, `add-coin`, etc.) bypass freeze checks. All other economy actions check this collection before proceeding.

### EconomyLogConfig

Per-guild configuration for the economy event log channel.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `guildId` | String | required | Unique |
| `channelId` | String | required | Discord channel to post logs |
| `enabled` | Boolean | `true` | Master toggle |
| `minCoinDelta` | Number | `100` | Minimum absolute coin change to log |
| `minGemDelta` | Number | `1` | Minimum absolute gem change to log |
| `includedTypes` | String[] | all types | Transaction types to log (empty = all) |
| `updatedAt` | Date | Auto-managed | |

`EconomyLogService.shouldLog(transaction, config)` checks thresholds before posting. If no config exists for a guild, logging is silently skipped.

### EconomySnapshot

Economy state captured before a reset, used for rollback.

| Field | Type | Notes |
|-------|------|-------|
| `snapshotId` | String | Short ID for use with `admin rollback` |
| `guildId` | String | required |
| `scope` | Enum | `coin` / `gem` / `streak` / `all` |
| `createdBy` | String | Admin user ID who triggered the reset |
| `entries` | Array | `{ userId, coin, gem, prayStreak, lastStreakDate }[]` — one per affected user |
| `createdAt` | Date | Auto-managed |

Snapshots are immutable after creation. `admin rollback` reads `entries` and reapplies the stored values via `bulkWrite`.

## Services

### CurrencyService (`services/economy/currency.service.ts`)

| Method | Description |
|--------|-------------|
| `getBalance(userId, guildId)` | Returns coin, gem, prayStreak, lastPray, lastCurse. Creates record if missing |
| `addCoin(userId, guildId, amount, reason, metadata?)` | Increment coin + log transaction |
| `addGem(userId, guildId, amount, reason, metadata?)` | Increment gem + log transaction |
| `deduct(userId, guildId, coinAmount, gemAmount, reason, metadata?)` | Atomic check-and-deduct. Throws `InsufficientFundsError` if balance too low |
| `setCoin(userId, guildId, amount)` | Set exact coin + log delta |
| `setGem(userId, guildId, amount)` | Set exact gem + log delta |
| `exchange(userId, guildId, gemAmount, ratePerGem)` | Deduct coins, add gems |

### PrayService (`services/economy/pray.service.ts`)

| Helper | Description |
|--------|-------------|
| `randomInRange(min, max)` | Random integer inclusive of both bounds |
| `isSameUTCDay(d1, d2)` | Compare UTC year/month/date (ignores time) |
| `isConsecutiveUTCDay(prev, now)` | Check if dates are exactly 1 UTC day apart |
| `checkCooldown(lastAction)` | Returns true if already acted today |

### ShopService (`services/economy/shop.service.ts`)

| Method | Description |
|--------|-------------|
| `getItems(guildId, page)` | Paginated items (5/page), enabled only, sorted by price |
| `buyItem(userId, guildId, itemId, guild)` | Full purchase flow with atomic deduction and effect application |
| `addItem(guildId, data)` | Create shop item, prevent duplicate itemId |
| `removeItem(guildId, itemId)` | Soft delete (enabled: false) |

### EconomyAdminService (`services/economy/economyAdmin.service.ts`)

Handles all privileged administrative operations.

| Method | Description |
|--------|-------------|
| `getDashboard(guildId)` | Aggregates circulation stats, 24h flow, source/sink breakdown, wealth distribution, week comparison, and anomaly alerts |
| `getHistory(userId, guildId, options)` | Paginated transaction history with optional type and limit filters |
| `reverseTransaction(shortId, guildId, adminId)` | Looks up transaction by short ID, applies inverse delta, creates `reverse` transaction. Fails if balance would go negative or already reversed |
| `freezeUser(userId, guildId, frozenBy, reason?)` | Upserts `EconomyFreeze` record |
| `unfreezeUser(userId, guildId)` | Deletes `EconomyFreeze` record |
| `isFrozen(userId, guildId)` | Boolean check used by economy commands before processing |
| `resetEconomy(guildId, scope, adminId, userId?)` | Auto-snapshots then zeroes selected fields. Guild-wide if `userId` omitted |
| `rollback(snapshotId, guildId, adminId)` | Restores `UserEconomy` records from `EconomySnapshot.entries` via `bulkWrite`, creates `rollback` transactions |

### EconomyBulkService (`services/economy/economyBulk.service.ts`)

Handles mass currency operations via `bulkWrite` for efficiency.

| Method | Description |
|--------|-------------|
| `distribute(guildId, amount, currency, adminId, roleId?)` | Awards flat amount to all matching members. Uses MongoDB `bulkWrite` with `$inc`. Logs `bulk_distribute` transactions per user |
| `tax(guildId, amount, currency, adminId, roleId?)` | Deducts flat amount from matching members (floors at 0). Logs `bulk_tax` transactions per user |

Both methods return `{ affected: number }` and accept an optional `roleId` to restrict the target set to Discord role members.

### EconomyLogService (`services/economy/economyLog.service.ts`)

Opt-in per-guild transaction logging to a Discord channel.

| Method | Description |
|--------|-------------|
| `getConfig(guildId)` | Fetches `EconomyLogConfig` with Redis cache (TTL 5 min) |
| `setConfig(guildId, data)` | Upserts config, invalidates cache |
| `shouldLog(transaction, config)` | Returns `true` if the transaction passes threshold and type filters |
| `sendLog(transaction, guild)` | Posts a formatted embed to the configured channel. Silent no-op if no config or `shouldLog` is false |

`sendLog` is called from `CurrencyService` after each successful transaction write. Errors in `sendLog` are caught and logged internally — they never propagate to the caller.

## Passive Activity Rewards

Coin and gem rewards earned automatically through XP-tracked activity.

### Level Up Rewards

When a user levels up (via message or voice XP):
- **Coin**: `levelUpCoinBase + (level × levelUpCoinPerLevel)` — default: `50 + (level × 10)`
- **Gem**: Awarded at milestone levels only (default: Lv.10→1, Lv.25→2, Lv.50→3, Lv.75→4, Lv.100→5)
- Transaction type: `level_up`

### Voice Time Rewards

During active voice sessions (same eligibility as voice XP):
- Every `voiceCoinInterval` minutes (default: 30), user receives `voiceCoinReward` coins (default: 10)
- Tracked via Redis counter `voice_coin:{guildId}:{userId}`, cleaned up on session end
- Transaction type: `voice_reward`

### Configuration

Per-guild via `GuildEconomyRewardConfig` model:

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `true` | Master toggle for passive rewards |
| `levelUpCoinBase` | `50` | Base coin on level up |
| `levelUpCoinPerLevel` | `10` | Additional coin per level |
| `gemMilestones` | `{10:1, 25:2, 50:3, 75:4, 100:5}` | Level → gem reward map |
| `voiceCoinInterval` | `30` | Minutes between voice coin awards |
| `voiceCoinReward` | `10` | Coins per voice interval |

Admin commands (under `/economy config`): `reward-config-view`, `reward-config-toggle`, `reward-config-set`, `reward-config-milestone`

### Dependency on XP

Passive rewards hook into the XP flow. If `GuildXPConfig.enabled = false`, XP events don't fire and passive rewards are not awarded.

## Gambling Mini-Games

Coin-only betting games via `/gamble` command. Acts as a coin sink with house edge.

### Games

| Game | Command | House Edge | Mechanics |
|------|---------|-----------|-----------|
| Coinflip | `/gamble coinflip <bet>` | 0% | 50/50 heads/tails, win ×2 |
| Slots | `/gamble slots <bet>` | ~12% | Flat probability table, 7 outcomes (×0 to ×20) |
| Dice | `/gamble dice <bet> <mode>` | ~17% | 2d6, high(≥8)/low(≤6), 7 always loses, win ×2 |

### Configuration

Per-guild via `GuildGamblingConfig` model:

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `true` | Master toggle |
| `minBet` | `10` | Minimum coin bet |
| `maxBet` | `500` | Maximum coin bet |

The cooldown between games is **30 seconds (fixed constant)** — not admin-configurable.

Admin commands (under `/economy config`): `gambling-config-view`, `gambling-config-toggle`, `gambling-config-set`

### Bet Flow

1. Validate config enabled + bet within min/max
2. Check Redis cooldown (`gamble_cd:{guildId}:{userId}`, 30s fixed)
3. Atomic deduct via `CurrencyService.deduct()`
4. Play game via `GamblingService`
5. If win: `CurrencyService.addCoin(payout)`
6. Set Redis cooldown (30s)
7. Transaction type: `"gambling"` with game metadata

## Work & Task Commands

Cooldown-based coin earning commands for steady income between daily pray/curse cycles.

### Commands

| Command | Cooldown | Reward | Mechanics |
|---------|----------|--------|-----------|
| `/work` | Determined by premium tier (4h free, 2h Star, 1h Galaxy) | 80-200 coin | Random reward + flavor text |
| `/fish` | Determined by premium tier (1h free, 30m Star, 15m Galaxy) | 10-600 coin | 4-rarity fish roll (common/uncommon/rare/legendary) |

### Fish Rarity Table

| Rarity | Probability | Coin Range | Emoji |
|--------|------------|------------|-------|
| Common | 55% | 10-30 | 🐟 |
| Uncommon | 28% | 40-80 | 🐠 |
| Rare | 13% | 100-200 | 🐡 |
| Legendary | 4% | 300-600 | 🦈 |

Expected value: ~65 coin/hour at default settings.

### Configuration

Per-guild via `GuildWorkConfig` model:

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `true` | Master toggle for work + fish |
| `workMinReward` | `80` | Minimum work coin reward |
| `workMaxReward` | `200` | Maximum work coin reward |
| `fishRewardMultiplier` | `1.0` | Multiplier applied to all fish rewards |

Cooldowns are **not admin-configurable** — they are determined entirely by the user's premium tier (free: 4h work / 1h fish; Star: 2h / 30m; Galaxy: 1h / 15m). Read from `PremiumService.getConfig(userId)`.

Admin commands (under `/economy config`): `work-config-view`, `work-config-toggle`, `work-config-set`

Transaction types: `"work"`, `"fish"`

## Social Interactions

User-to-user coin transfer commands. Rob acts as a net coin sink.

### Commands

| Command | Mechanics |
|---------|-----------|
| `/gift <user> <amount>` | Direct transfer, max configurable (default 1000), no cooldown |
| `/rob <user>` | 40% success (steal 10-30% target balance), 60% fail (lose 10-20% own balance) |

### Rob Protections

- **Min balance:** Target must have ≥100 coin (configurable) to be robbed
- **Immunity:** Target gets **2h immunity** (fixed constant) after being successfully robbed
- **Cooldown:** Robber has **6h cooldown** (fixed constant) between attempts

### Rob Economics

- Average steal: ~20% × 40% = 8% of target transferred per attempt
- Average penalty: ~15% × 60% = 9% of robber destroyed per attempt
- **Net negative for robber** — rob is a coin sink on average

### Configuration

Per-guild via `GuildSocialConfig` model:

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `true` | Master toggle for gift + rob |
| `giftMaxAmount` | `1000` | Max coin per gift |
| `robSuccessRate` | `0.4` (40%) | Rob success chance |
| `robStealMinPct` / `robStealMaxPct` | `10` / `30` | Steal range (% of target) |
| `robPenaltyMinPct` / `robPenaltyMaxPct` | `10` / `20` | Fine range (% of robber) |
| `robMinBalance` | `100` | Target protection threshold |

Rob cooldown (6h) and immunity duration (2h) are **fixed constants** — not admin-configurable. This prevents economy imbalance from excessively short rob windows.

Admin commands (under `/economy config`): `social-config-view`, `social-config-toggle`, `social-config-set`

Transaction types: `"gift"`, `"rob"`, `"rob_penalty"`
