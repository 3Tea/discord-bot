# Global Wallet System Design

**Date:** 2026-04-09
**Status:** Approved
**Approach:** Hybrid — New Model (`UserWallet`), Shared Transaction Log

---

## Problem Statement

The current economy system is entirely per-guild, creating 4 core problems:

1. **Coin has nowhere to be spent** — Shop depends on server admins creating items. Many servers have empty shops, making coin accumulation meaningless.
2. **Gem is nearly useless** — 5% chance from pray, very rare, but only usable for confession VIP and admin-created shop items. Premium currency without a premium ecosystem.
3. **No economic reason to be in multiple servers** — Each server is an isolated island. User in 3 servers = 3 unrelated wallets. Bot creates no network effect between communities.
4. **No long-term goals** — Pray streak is the only short-term goal. Nothing to save up for. No endgame for economy.

### Root Cause

The bot lacks a **bot-managed spending ecosystem**. All spending destinations depend on server admins. A global wallet only has value when the bot itself provides things worth buying.

### Critical Constraint

Admin commands (`/economy add-coin`, `add-gem`, `set-coin`, `set-gem`) can arbitrarily inflate guild currency. **Guild currency CANNOT exchange to global currency** — this would allow any admin to destroy the global economy. The global currency must be a completely separate system, bot-controlled, with no admin manipulation.

---

## Design

### Currency

A third currency called **star** — entirely separate from per-guild coin/gem.

- Bot-controlled: no admin commands to set/add star
- No exchange: star cannot be converted to/from coin or gem
- No transfer: users cannot send star to each other (prevents RMT)
- Global: earned and spent across all servers, 1 wallet per user

### Data Model

#### `UserWallet` (new model)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `userId` | String, unique, required | — | Discord user ID |
| `star` | Number | 0 | Global currency balance |
| `lastDaily` | Date | null | Last daily claim timestamp |
| `dailyStreak` | Number | 0 | Consecutive daily claim streak |
| `lastStreakDate` | Date | null | For consecutive day tracking |
| `claimedMilestones` | String[] | [] | Milestone keys already claimed |

**Indexes:**
- `userId` (unique)
- `star: -1` (global leaderboard)

#### Transaction Model (existing, extended)

Add new transaction types to existing `TransactionType` enum:
- `global_daily` — daily star claim
- `global_streak_bonus` — streak milestone bonus
- `global_milestone` — one-time achievement reward
- `global_spend` — spending star on commands

All global transactions use `guildId: "global"` to distinguish from guild transactions in the shared collection. Global transactions store star changes in the `coinDelta` field (repurposed — `coinDelta` represents the primary currency delta for the given context: coin for guild transactions, star for global transactions). `gemDelta` is always `0` for global transactions.

**No changes to `User` model or `UserEconomy` model.** The two economic systems are completely separate.

### Earning Mechanics

#### Global Daily Claim

- 1 claim per day across the entire bot (UTC reset)
- Can be claimed from any server the bot is in
- Cooldown check uses `isSameUTCDay` pattern (same as pray)
- Base reward: **1-3 star** (uniform random, equal probability)
- Streak: consecutive days, resets if user misses a day
- Streak milestones:

| Day | Bonus |
|-----|-------|
| 3 | +2 star |
| 7 | +5 star |
| 14 | +10 star |
| 30 | +20 star |

#### Milestones (one-time rewards)

Awarded when user hits a threshold for the first time. Cannot be farmed — tracked in `claimedMilestones` array.

| Milestone Key | Condition | Star |
|---------------|-----------|------|
| `level_10` | Reach level 10 in any server | 5 |
| `level_25` | Reach level 25 in any server | 15 |
| `level_50` | Reach level 50 in any server | 30 |
| `level_100` | Reach level 100 in any server | 50 |
| `pray_streak_7` | 7-day pray streak in any server | 3 |
| `pray_streak_14` | 14-day pray streak in any server | 8 |
| `pray_streak_30` | 30-day pray streak in any server | 20 |
| `leaderboard_top3` | Top 3 all-time XP leaderboard in any server (checked on leaderboard query) | 10 |
| `multi_server_3` | Bot present in 3+ servers user is in | 5 |
| `multi_server_5` | Bot present in 5+ servers user is in | 10 |
| `multi_server_10` | Bot present in 10+ servers user is in | 20 |

#### Milestone Trigger Points

| Trigger | Hook Location |
|---------|---------------|
| Level up | `messageCreate` event, after XP causes level increase |
| Pray streak milestone | `PrayService.pray()`, after streak update |
| Top 3 leaderboard | Leaderboard command query — check user's rank after fetching, award if top 3 |
| Join server with bot | `guildMemberAdd` event |

Each trigger calls `WalletService.checkAndAwardMilestone(userId, key, amount)` — idempotent, checks `claimedMilestones` before awarding.

### Spending

#### Commands

| Command | Cost | Description |
|---------|------|-------------|
| `/wallet` | free | View star balance, streak, claimed milestones |
| `/wallet daily` | free | Claim daily star |
| `/wallet history [page]` | free | Paginated global transaction history |

Additional commands that cost star will be added incrementally. Each new command only needs to call `WalletService.deductStar()`.

#### Spending Flow

```
User invokes a star-costing command
  → WalletService.deductStar(userId, amount, "global_spend", { command: "xxx" })
    → Atomic check: filter { userId, star: { $gte: amount } }
    → If insufficient → throw InsufficientStarError
    → If sufficient → $inc: { star: -amount }
    → Log Transaction(userId, "global", "global_spend", coinDelta: -amount, gemDelta: 0, metadata)
  → Execute command logic
  → If command fails → refund via addStar
```

#### Explicitly NOT supported

- No star ↔ coin/gem exchange (prevents admin inflation exploit)
- No star transfer between users (prevents RMT)
- No admin set/add star commands (bot-controlled only)

### Service Layer

#### `WalletService` (`src/services/economy/wallet.service.ts`)

Follows `CurrencyService` patterns:

```
getBalance(userId) → { star, dailyStreak, lastDaily, claimedMilestones }
addStar(userId, amount, reason, metadata) → atomic $inc + upsert + log transaction
deductStar(userId, amount, reason, metadata) → atomic $gte check + deduct + log transaction
claimDaily(userId) → check cooldown → roll reward → streak logic → addStar
checkAndAwardMilestone(userId, milestoneKey, starAmount) → check claimedMilestones → addStar if unclaimed
```

**Transaction logging:** All methods log to existing `Transaction` model with `guildId: "global"` and appropriate `global_*` type.

### Security

| Concern | Mitigation |
|---------|------------|
| Admin inflation | No admin commands for star. No exchange from guild currency. |
| Double-spend | Atomic `$gte` filter on deduction (MongoDB guarantees). |
| Milestone farming | `claimedMilestones` string array, checked before every award. Idempotent. |
| Timezone abuse | UTC-based daily reset, same pattern as pray cooldown. |
| RMT / gold selling | No star transfer between users. |
| Audit | Every star change logged to Transaction with full metadata. |

### i18n

New translation keys under `wallet.*` namespace, added to all 15 locale files:

- `wallet.title`, `wallet.balance`, `wallet.daily.*`, `wallet.history.*`
- `wallet.milestone.*` for each milestone description
- `wallet.error.cooldown`, `wallet.error.insufficient`
- `cmd.wallet.desc` for command description localizations

### File Structure

```
src/
  models/userWallet.model.ts          # UserWallet schema
  services/economy/wallet.service.ts  # WalletService
  commands/slash/wallet.ts            # /wallet, /wallet daily, /wallet history
```

Hooks into existing files (no structural changes):
- `src/models/transaction.model.ts` — add `global_*` types to enum
- `src/events/messageCreate.ts` — call milestone check on level up
- `src/services/economy/pray.service.ts` — call milestone check on streak
