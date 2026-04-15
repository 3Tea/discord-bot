# Economy Admin Tools — Design Spec

> Comprehensive admin toolkit for server economy management: dashboard, audit, log channel, reset/snapshot, bulk operations.

## Context

The current `/economy` command provides basic admin capabilities: set/add coin/gem for individual users and configure subsystem toggles (gambling, work, social, rewards). Server admins lack visibility into economic health, audit tools for investigating abuse, bulk operations, and reset/rollback mechanisms.

This spec restructures `/economy` from 17 flat subcommands into 4 subcommand groups, adding new admin tools while preserving all existing functionality.

**Breaking change**: All existing `/economy` subcommands move into groups. Users will type `/economy balance set-coin` instead of `/economy set-coin`. Discord autocomplete updates automatically after deploy.

## Command Structure

Restructure `/economy` into 4 subcommand groups (28 total subcommands, each group under Discord's 25 limit).

### `/economy balance` — Per-user currency management (existing, relocated)

| Subcommand | Options | Description |
|---|---|---|
| `set-coin` | `@user`, `amount` | Set user's coin to exact amount |
| `add-coin` | `@user`, `amount` | Add/subtract coin |
| `set-gem` | `@user`, `amount` | Set user's gem to exact amount |
| `add-gem` | `@user`, `amount` | Add/subtract gem |

### `/economy config` — Subsystem configuration (existing, relocated)

| Subcommand | Options | Description |
|---|---|---|
| `reward-view` | — | View passive reward config |
| `reward-toggle` | — | Enable/disable passive rewards |
| `reward-set` | `setting` (choice), `value` | Set reward config value |
| `reward-milestone` | `level`, `gems` | Set/remove gem milestone |
| `gambling-view` | — | View gambling config |
| `gambling-toggle` | — | Enable/disable gambling |
| `gambling-set` | `setting` (choice), `value` | Set gambling config value |
| `work-view` | — | View work/fish config |
| `work-toggle` | — | Enable/disable work/fish |
| `work-set` | `setting` (choice), `value` | Set work/fish config value |
| `social-view` | — | View gift/rob config |
| `social-toggle` | — | Enable/disable gift/rob |
| `social-set` | `setting` (choice), `value` | Set social config value |

### `/economy admin` — New admin tools

| Subcommand | Options | Description |
|---|---|---|
| `dashboard` | — | Server economy overview + health metrics |
| `history` | `@user`, `type?` (choice), `min-amount?` | Paginated transaction history |
| `reverse` | `transaction-id` (string) | Undo a specific transaction |
| `freeze` | `@user`, `reason?` | Lock user's economy access |
| `unfreeze` | `@user` | Unlock user's economy access |
| `reset` | `scope` (choice: coin/gem/streak/all), `target?` (@user) | Reset economy with auto-snapshot |
| `rollback` | `snapshot-id` (string) | Restore from snapshot |
| `log-setup` | `channel` | Set economy log channel |
| `log-config` | `setting` (choice), `value` | Configure log thresholds |

### `/economy bulk` — Mass operations

| Subcommand | Options | Description |
|---|---|---|
| `distribute` | `amount`, `currency` (coin/gem), `role?` | Distribute currency to members |
| `tax` | `amount`, `currency` (coin/gem), `role?` | Collect currency from members |

## Data Models

### New: `EconomySnapshot`

Stores economy state before reset operations for rollback capability.

| Field | Type | Default | Description |
|---|---|---|---|
| `snapshotId` | String | nanoid(8) | Short unique ID for admin reference |
| `guildId` | String | required | Guild this snapshot belongs to |
| `createdBy` | String | required | Admin userId who triggered reset |
| `scope` | String | required | `"coin"` / `"gem"` / `"streak"` / `"all"` |
| `target` | String | required | `"server"` or a specific userId |
| `data` | Array | required | `[{ userId, coin?, gem?, prayStreak?, lastStreakDate? }]` — only fields relevant to scope |
| `restoredAt` | Date | null | Set when rollback is performed |
| `createdAt` | Date | auto | Timestamp |

**Indexes**: `(guildId, createdAt: -1)`, unique `snapshotId`.

**Limits**: Max 10 snapshots per guild. On overflow, delete oldest restored snapshot first; if none restored, delete oldest overall.

**Size safety**: 5,000 users x ~100 bytes = ~500KB per snapshot, well under MongoDB's 16MB document limit.

### New: `EconomyLogConfig`

Per-guild configuration for the economy log channel. Default behavior: no logging until admin runs `log-setup`.

| Field | Type | Default | Description |
|---|---|---|---|
| `guildId` | String | unique | Guild ID |
| `channelId` | String | required | Discord text channel ID |
| `enabled` | Boolean | true | Master toggle (after setup) |
| `thresholds.coinTransaction` | Number | 500 | Log transactions >= X coin |
| `thresholds.gemTransaction` | Number | 5 | Log transactions >= X gem |
| `thresholds.gamblingWin` | Number | 1000 | Log gambling wins >= X coin |
| `thresholds.robSuccess` | Boolean | true | Log all successful robs |
| `thresholds.adminActions` | Boolean | true | Log all admin balance changes |
| `thresholds.bulkOperations` | Boolean | true | Log all bulk distribute/tax |

**Index**: unique `guildId`. **Cache**: Redis `eco_log_config:{guildId}` TTL 5 min.

### New: `EconomyFreeze`

Tracks frozen users who are blocked from all economy commands.

| Field | Type | Default | Description |
|---|---|---|---|
| `userId` | String | required | Frozen user |
| `guildId` | String | required | Guild context |
| `frozenBy` | String | required | Admin who froze |
| `reason` | String | optional | Reason for freeze |
| `createdAt` | Date | auto | Timestamp |

**Index**: unique `(userId, guildId)`. **Cache**: Redis `eco_freeze:{guildId}:{userId}` TTL 10 min.

### Changes to existing: `Transaction` model

Add new transaction types to the TypeScript union AND schema enum array:

| New Type | When |
|---|---|
| `bulk_distribute` | Admin bulk distribute |
| `bulk_tax` | Admin bulk tax |
| `reverse` | Admin reverses a transaction |
| `reset` | Economy reset (records delta per user) |
| `rollback` | Snapshot rollback (records delta per user) |

**Metadata conventions**:
- `reverse`: `{ originalTransactionId, originalType }`
- `bulk_distribute` / `bulk_tax`: `{ roleId?, affectedCount, amountEach }`
- `reset`: `{ scope, snapshotId }`
- `rollback`: `{ snapshotId }`

**Reversed transaction marking**: Original transaction gets `metadata.reversed = true`, `metadata.reversedBy = adminUserId`.

## Dashboard — Health Metrics & Anomaly Detection

`/economy admin dashboard` returns a multi-field embed computed via real-time MongoDB aggregation. Uses `deferReply()` immediately (queries may take 2-3s on large servers). No caching — always fresh data.

### Embed fields

**1. Circulation overview**
- Total coin in circulation: `UserEconomy.aggregate` sum of `coin` for guild
- Total gem in circulation: sum of `gem`
- Users with balance > 0: `countDocuments` with `$or`
- Top 5 richest: `find().sort({ coin: -1 }).limit(5)` — displays `@user: X coin, Y gem`

**2. Coin flow (24h)** — inflation tracking
- Coin earned: sum `coinDelta` where `coinDelta > 0` and `createdAt >= 24h ago`
- Coin spent/lost: sum `coinDelta` where `coinDelta < 0`
- Net flow: earned + spent — positive = inflationary, negative = deflationary
- Gem earned/spent: same logic with `gemDelta`

**3. Source breakdown** — largest coin earners
- Group transactions by `type`, sum positive `coinDelta` in 24h
- Display sorted desc: `pray: +12,500 (35%) | work: +8,200 (23%) | ...`

**4. Coin sink effectiveness**
- Group by `type`, sum negative `coinDelta` in 24h
- Display sorted desc: `gambling: -8,000 (45%) | purchase: -5,000 (28%) | ...`

**5. Wealth distribution**
- Bucket aggregation on `UserEconomy.coin`: 0, 1-100, 101-1,000, 1,001-10,000, 10,000+
- Display as text bar: `0 coin: ██████ 45 users | 1-100: ████ 30 users | ...`

**6. Week-over-week comparison**
- Coin earned this 7 days vs previous 7 days, with percentage change
- Active earners (distinct userId) this week vs last
- Display: `+15,000 coin (+12% vs last week) | 28 active (+4)`

### Anomaly alerts

Displayed as a separate warning-colored field at the bottom. Only shown if anomalies detected.

| Alert | Condition |
|---|---|
| Earning spike | User's 24h positive `coinDelta` sum > 3x server average |
| Gambling abuse | User has > 20 gambling transactions in 24h |
| Rob target | User robbed successfully >= 3 times in 24h |

Computed at query time — no background job.

## Audit & Investigation

### Transaction history (`/economy admin history`)

**Display**: Paginated embed, 10 transactions per page, Previous/Next buttons.

Each entry format:
```
#abc123 | pray | +150 coin | 2026-04-15 08:30
  -> target: @user2
#def456 | gambling | -200 coin | 2026-04-15 07:15
  -> game: slots, multiplier: 0x
```

Transaction short ID: `_id.toString().slice(-6)` — used by admin for `reverse` command. Collision within a guild's transactions is negligible (16M hex combinations). If multiple matches are found, prompt admin to provide more characters.

**Query**: `Transaction.find({ userId, guildId, ...typeFilter, ...amountFilter }).sort({ createdAt: -1 }).skip(page * 10).limit(10)`

### Reverse transaction (`/economy admin reverse`)

1. Find transaction by short ID (last 6 chars of `_id`) within guild
2. Validate: not already reversed (`metadata.reversed !== true`)
3. Create reverse transaction: negate `coinDelta` and `gemDelta`, type = `reverse`
4. Apply via `CurrencyService.addCoin` / `addGem` with negated deltas
5. Mark original: `metadata.reversed = true`, `metadata.reversedBy = adminUserId`

**Scope**: Only transactions with direct currency delta are reversible (pray, curse, work, fish, gambling, gift, rob, purchase, admin, bulk_*). Cannot reverse `level_up`, `voice_reward` (tied to XP flow).

### Freeze / unfreeze

**Freeze flow**:
1. Create `EconomyFreeze` record
2. Set Redis `eco_freeze:{guildId}:{userId}` = `"1"`, TTL 10 min
3. Reply ephemeral, send log channel

**Unfreeze flow**:
1. Delete `EconomyFreeze` record
2. Delete Redis key
3. Reply ephemeral, send log channel

**Enforcement**: Helper function `isEconomyFrozen(userId, guildId)`:
- Check Redis first (O(1))
- Fallback DB on cache miss, re-cache if found
- Called at the start of: pray, curse, work, fish, gamble, gift, rob, shop buy, mine, dungeon
- If frozen: reply ephemeral with explanation, do not execute command

## Reset & Snapshot

### Reset flow (`/economy admin reset`)

1. **Confirmation gate**: Embed showing scope, target, affected user count. Two buttons: `Confirm Reset` (red) / `Cancel`. 30s timeout. Only the invoking admin can click (filter by `interaction.user.id`).

2. **Auto-snapshot**: Query affected users, create `EconomySnapshot` with only scope-relevant fields. Reply includes snapshot ID.

3. **Execute**: 
   - `coin`: `updateMany({ guildId }, { $set: { coin: 0 } })`
   - `gem`: `updateMany({ guildId }, { $set: { gem: 0 } })`
   - `streak`: `updateMany({ guildId }, { $set: { prayStreak: 0, lastStreakDate: null } })`
   - `all`: all of the above
   - Single user: `updateOne({ userId, guildId }, ...)`
   - Bulk insert `reset` transactions for affected users

4. **Result**: Embed with affected count, snapshot ID, scope.

### Rollback flow (`/economy admin rollback`)

1. Find snapshot by `snapshotId`, validate guild ownership and `restoredAt == null`
2. **Confirmation gate**: similar to reset, shows snapshot date, scope, affected count
3. **Restore**: `bulkWrite` — set each user's fields back to snapshot values based on scope
4. Mark snapshot: `restoredAt = new Date()`
5. Bulk insert `rollback` transactions
6. Result embed: restored count, scope, original snapshot date

## Bulk Operations

### Distribute (`/economy bulk distribute`)

1. Fetch guild members, filter by role (if specified), exclude bots
2. Confirmation: "Distribute X coin to Y members (role: Z)?" + Confirm/Cancel
3. Execute: `UserEconomy.bulkWrite()` with `$inc: { coin: amount }` (upsert: true)
4. Bulk insert `bulk_distribute` transactions
5. Send log channel
6. Result embed: amount, currency, affected count

### Tax (`/economy bulk tax`)

1. Fetch affected members (same filter), only those with balance > 0
2. Confirmation with warning: "Users with balance < X will be set to 0"
3. Execute: aggregation pipeline update `[{ $set: { coin: { $max: [{ $add: ["$coin", -amount] }, 0] } } }]`
4. Bulk insert `bulk_tax` transactions with actual delta per user
5. Send log channel
6. Result embed: amount, currency, affected count, total collected

### Rate limiting

60s cooldown per guild via Redis `eco_bulk_cd:{guildId}`. Prevents admin spam/misclick.

## Log Channel System

### Service: `EconomyLogService` (`src/services/economy/economyLog.service.ts`)

| Method | Description |
|---|---|
| `shouldLog(guildId, eventType, amount?)` | Check config exists + enabled + threshold met |
| `sendLog(guildId, embed)` | Get channel, send embed. Silent fail on error (log warning, don't throw) |

Config cached in Redis 5 min. No config = no logging (opt-in only).

Called from existing services (pray, gambling, rob, shop, admin commands) after successful transactions. **Fire-and-forget** — call without await, errors swallowed via `.catch(() => logger.warn(...))`. Does not block user response.

### Log embed formats

| Event | Emoji | Content |
|---|---|---|
| Admin action | `wrench` | `@admin set coin for @user: +500 coin (total: 1,200)` |
| Gambling win | `slot_machine` | `@user won 5,000 coin on slots (x10)` |
| Rob success | `crossed_swords` | `@robber stole 450 coin from @victim (18%)` |
| Bulk operation | `package` | `@admin distributed 100 coin to 45 members (role: @Active)` |
| Freeze/unfreeze | `lock` / `unlock` | `@admin froze @user: "suspected exploit"` |
| Reset | `warning` | `@admin reset all coin for server (snapshot: abc12345)` |

### Setup command (`/economy admin log-setup`)

Validates channel is TextChannel with bot `SendMessages` + `EmbedLinks` permissions. Upserts `EconomyLogConfig`, sets Redis cache.

### Config command (`/economy admin log-config`)

Settings: `coin-threshold`, `gem-threshold`, `gambling-threshold`, `rob-success` (0/1), `admin-actions` (0/1), `bulk-operations` (0/1).

## Interaction Patterns

**Confirmation gates** (reset, rollback, bulk operations): Use `awaitMessageComponent()` collector on the reply message. 30s timeout, filter by `interaction.user.id`. No separate button handler files needed — these are one-time interactions tied to the admin who invoked the command.

**History pagination** (prev/next): Also use `awaitMessageComponent()` collector. 60s idle timeout. Admin clicks next/prev → edit the same message with new page. Collector expires → remove buttons from message.

This approach avoids creating 5 separate button handler files for what are essentially inline interactions.

## Files to Create

| File | Purpose |
|---|---|
| `src/models/economySnapshot.model.ts` | EconomySnapshot schema |
| `src/models/economyLogConfig.model.ts` | EconomyLogConfig schema |
| `src/models/economyFreeze.model.ts` | EconomyFreeze schema |
| `src/services/economy/economyLog.service.ts` | Log channel service |
| `src/services/economy/economyAdmin.service.ts` | Dashboard aggregation, reset/rollback, freeze/unfreeze logic |
| `src/services/economy/economyBulk.service.ts` | Bulk distribute/tax logic |

## Files to Modify

| File | Change |
|---|---|
| `src/commands/slash/economy.ts` | Full restructure: flat subcommands -> 4 subcommand groups + new subcommands |
| `src/models/transaction.model.ts` | Add 5 transaction types to union + schema enum |
| `src/util/config/button.ts` | Add button IDs for confirmations and pagination |
| `src/services/economy/pray.service.ts` | Add freeze check + log channel call |
| `src/services/economy/gambling.service.ts` | Add log channel call for big wins |
| `src/services/economy/social.service.ts` | Add log channel call for rob success |
| `src/services/economy/shop.service.ts` | Add log channel call for large purchases |
| `src/commands/slash/pray.ts` | Add freeze check at start |
| `src/commands/slash/curse.ts` | Add freeze check at start |
| `src/commands/slash/work.ts` | Add freeze check at start |
| `src/commands/slash/gamble.ts` | Add freeze check at start |
| `src/commands/slash/gift.ts` | Add freeze check at start |
| `src/commands/slash/rob.ts` | Add freeze check at start |
| `src/commands/slash/shop.ts` | Add freeze check at start (buy subcommand) |
| `src/commands/slash/mine.ts` | Add freeze check at start |
| `src/commands/slash/dungeon.ts` | Add freeze check at start |
| All 15 locale files | Add translation keys for all new admin features |
