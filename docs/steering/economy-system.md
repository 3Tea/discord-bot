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

All require `Administrator` permission. Responses are ephemeral.

| Subcommand | Action | Transaction logged |
|------------|--------|-------------------|
| `set-coin` | Set exact coin amount | Delta (new - old) |
| `add-coin` | Add/subtract coins | Exact amount |
| `set-gem` | Set exact gem amount | Delta (new - old) |
| `add-gem` | Add/subtract gems | Exact amount |

Transaction type: `"admin"` with metadata `{ action: "set-coin" | "add-coin" | ... }`.

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
| `type` | Enum | `pray` / `curse` / `purchase` / `exchange` / `streak_bonus` / `admin` |
| `coinDelta` | Number | 0 |
| `gemDelta` | Number | 0 |
| `metadata` | Mixed | {} |
| `createdAt` | Date | auto |

**Index**: `(userId, guildId, createdAt: -1)` for transaction history.

**Metadata examples**:
- Pray: `{ targetId: "..." }` or `{}`
- Purchase: `{ itemId: "...", itemName: "..." }`
- Admin: `{ action: "set-coin", newTotal: 500 }`
- Streak bonus: `{ milestone: 7, bonusCoin: 150, bonusGem: 1 }`

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

Admin commands: `/economy reward-config-view`, `reward-config-toggle`, `reward-config-set`, `reward-config-milestone`

### Dependency on XP

Passive rewards hook into the XP flow. If `GuildXPConfig.enabled = false`, XP events don't fire and passive rewards are not awarded.
