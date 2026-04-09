# Gambling Mini-Games Design

## Context

The economy system now has passive rewards (Part 1) but lacks coin sinks beyond the shop. Users accumulate coins with no risk-based spending. Mini-games add entertainment, a natural coin drain (house edge), and daily engagement beyond pray/curse.

**Goal:** Add `/gamble` command with 3 mini-games (coinflip, slots, dice) — coin-only betting with per-guild configurable limits and cooldowns. Games act as a coin sink to balance the economy.

**Scope:** Part 2 of 4 economy expansions. This spec covers only gambling mini-games.

## Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Command structure | `/gamble` with subcommands | DRY, shared config/validation, 1 deploy |
| Games | Coinflip, Slots, Dice | Classic, varied complexity, good range of odds |
| Currency | Coin only | Keep gem rare, gambling is coin sink |
| House edge | 0% coinflip, ~12% slots, ~17% dice | Coinflip is fair gateway; slots/dice are sinks |
| Bet limits | Admin configurable min/max + cooldown | Per-server economy balance |
| Odds | Fixed, not admin configurable | Too complex, easy to misconfigure |

## 1. Game Mechanics

### 1.1 Coinflip

`/gamble coinflip <bet>`

- Random: heads or tails (50/50 via `Math.random() < 0.5`)
- **Win:** payout = bet × 2 (net profit = bet)
- **Lose:** lose bet
- House edge: **0%** — fair coin, gateway game

### 1.2 Slots

`/gamble slots <bet>`

Outcome determined by a flat probability table (not independent reels). The 3-emoji display is cosmetic — generated to match the predetermined outcome. This avoids complex reel math and gives precise control over house edge.

**Outcome table:**

| Display | Multiplier | Probability | EV per 1 coin |
|---------|-----------|-------------|---------------|
| 7️⃣ 7️⃣ 7️⃣ | ×20 | 0.5% | 0.100 |
| 💎 💎 💎 | ×8 | 1.5% | 0.120 |
| 🔔 🔔 🔔 | ×4 | 4.0% | 0.160 |
| 🍋 🍋 🍋 | ×2 | 10.0% | 0.200 |
| 🍒 🍒 🍒 | ×1.5 | 15.0% | 0.225 |
| 🍒 🍒 ✖ | ×0.5 | 15.0% | 0.075 |
| No match | ×0 | 54.0% | 0.000 |
| **Total** | | **100%** | **0.880** |

**House edge: ~12%**

Implementation: generate a random number 0-1, walk through cumulative probability ranges to determine outcome. Then generate display emojis to match (triple for matching combos, random non-cherry third for 🍒🍒✖, random mix for no match).

Symbols used in display: 🍒, 🍋, 🔔, 💎, 7️⃣

### 1.3 Dice

`/gamble dice <bet> <mode>`

- Roll 2d6: two independent dice, sum 2-12
- Mode `high`: win if total ≥ 8 (probability: 15/36 = 41.67%)
- Mode `low`: win if total ≤ 6 (probability: 15/36 = 41.67%)
- Total = 7 always loses (probability: 6/36 = 16.67%) — this is the house edge
- **Win:** payout = bet × 2 (net profit = bet)
- **Lose:** lose bet
- House edge: **~16.7%** (1 - 2 × 0.4167 = 0.1667)

## 2. Configuration

### GuildGamblingConfig Model

New Mongoose model:

```typescript
interface IGuildGamblingConfig extends Document {
    guildId: string;
    enabled: boolean;
    minBet: number;
    maxBet: number;
    cooldown: number; // seconds
}
```

**Defaults:**

| Field | Type | Default |
|-------|------|---------|
| `guildId` | String, required, unique | — |
| `enabled` | Boolean | `true` |
| `minBet` | Number | `10` |
| `maxBet` | Number | `500` |
| `cooldown` | Number | `30` |

**File:** `src/models/guildGamblingConfig.model.ts`

**Caching:** Redis cache `gambling_config:{guildId}` with 5-minute TTL. Invalidate on admin config change.

### Admin Commands

Extend `/economy` with new subcommands:

- `/economy gambling-config-view` — show current config
- `/economy gambling-config-toggle` — enable/disable gambling
- `/economy gambling-config-set <setting> <value>` — set minBet/maxBet/cooldown

All require `Administrator` permission.

### Cooldown

Redis key: `gamble_cd:{guildId}:{userId}` with TTL = `config.cooldown` seconds.

- Before play: `redis.ttlKey(key)` — if > 0, reply with remaining seconds
- After play: `redis.setJson(key, 1, config.cooldown)` — set cooldown

## 3. Transaction Type

Add `"gambling"` to `TransactionType` union and schema enum.

Transaction metadata per game:

- **Coinflip:** `{ game: "coinflip", bet: number, result: "heads"|"tails", won: boolean, payout: number }`
- **Slots:** `{ game: "slots", bet: number, reels: [string, string, string], combo: string, won: boolean, payout: number }`
- **Dice:** `{ game: "dice", bet: number, dice: [number, number], total: number, mode: "high"|"low", won: boolean, payout: number }`

Win transactions log `coinDelta: payout - bet` (net). Loss transactions log `coinDelta: -bet`.

Note: the deduct happens first, then addCoin for the full payout if won. So there are potentially 2 operations: one deduct and one add. To keep it as a single transaction record, log one transaction after the game resolves:
- **Win:** `coinDelta: payout - bet` (net gain), type `"gambling"`
- **Lose:** `coinDelta: -bet` (loss), type `"gambling"`

However, the actual flow uses `CurrencyService.deduct()` then `CurrencyService.addCoin()` which each log their own transaction. To avoid double-logging, the gambling flow should handle transactions manually:
1. Deduct bet via direct `UserEconomyModel.findOneAndUpdate` (atomic balance check)
2. Play game
3. If won: add payout via `CurrencyService.addCoin(payout, "gambling", metadata)`
4. If lost: log transaction manually via `TransactionModel.create({ coinDelta: -bet, type: "gambling", metadata })`

Alternative simpler approach: use `CurrencyService.deduct()` with type `"gambling"` for the bet, and if won, use `CurrencyService.addCoin()` with type `"gambling"` for the payout. This creates 2 transaction records per win (deduct + add) and 1 per loss (deduct only). The metadata distinguishes them. This is simpler and consistent with existing patterns (e.g., `exchange()` also creates 2 transactions).

**Chosen approach:** Use existing `CurrencyService.deduct()` and `addCoin()` — 2 records per win, 1 per loss. Simpler, follows existing patterns.

## 4. Service Layer

### GamblingService (`src/services/economy/gambling.service.ts`)

Pure game logic — no Discord/DB concerns:

```typescript
interface CoinflipResult {
    result: "heads" | "tails";
    won: boolean;
    multiplier: number;
}

interface SlotsResult {
    reels: [string, string, string];
    combo: string;
    won: boolean;
    multiplier: number;
}

interface DiceResult {
    dice: [number, number];
    total: number;
    won: boolean;
    multiplier: number;
}

function coinflip(): CoinflipResult
function slots(): SlotsResult
function dice(mode: "high" | "low"): DiceResult
```

Each function uses `Math.random()` and returns a result object. No side effects.

### Slots implementation detail

```typescript
const SLOTS_TABLE = [
    { threshold: 0.005, combo: "777",    reels: ["7️⃣","7️⃣","7️⃣"], multiplier: 20 },
    { threshold: 0.020, combo: "diamond", reels: ["💎","💎","💎"], multiplier: 8 },
    { threshold: 0.060, combo: "bell",   reels: ["🔔","🔔","🔔"], multiplier: 4 },
    { threshold: 0.160, combo: "lemon",  reels: ["🍋","🍋","🍋"], multiplier: 2 },
    { threshold: 0.310, combo: "cherry3", reels: ["🍒","🍒","🍒"], multiplier: 1.5 },
    { threshold: 0.460, combo: "cherry2", reels: null,              multiplier: 0.5 },
    { threshold: 1.000, combo: "none",   reels: null,              multiplier: 0 },
];
```

For `cherry2`: generate `["🍒", "🍒", randomNonCherry]`.
For `none`: generate 3 random symbols ensuring no triple match and not `🍒🍒X`.

## 5. Command Flow

### `/gamble` command (`src/commands/slash/gamble.ts`)

```
1. deferReply()
2. Load GuildGamblingConfig (from cache or DB)
3. If !config.enabled → reply "gambling disabled"
4. Validate bet: >= config.minBet, <= config.maxBet
5. Check cooldown: redis.ttlKey(`gamble_cd:{guildId}:{userId}`)
   If > 0 → reply "wait Xs"
6. Deduct bet: CurrencyService.deduct(userId, guildId, bet, 0, "gambling", metadata)
   If InsufficientFundsError → reply "not enough coin"
7. Play game: GamblingService.coinflip() / slots() / dice(mode)
8. Calculate payout = Math.floor(bet * result.multiplier)
9. If payout > 0: CurrencyService.addCoin(userId, guildId, payout, "gambling", metadata)
10. Set cooldown: redis.setJson(`gamble_cd:{guildId}:{userId}`, 1, config.cooldown)
11. Build embed with result + reply
```

## 6. Embed Display

### Coinflip

```
🪙 Coinflip
Bet: 100 coin
Result: Heads ✅
+100 coin (×2)
```

### Slots

```
🎰 Slots
┃ 🍒 ┃ 💎 ┃ 🍒 ┃
Bet: 50 coin
No match ❌
-50 coin
```

Win example:
```
🎰 Slots
┃ 🍋 ┃ 🍋 ┃ 🍋 ┃
Bet: 50 coin
Triple Lemon! ✅
+50 coin (×2)
```

### Dice

```
🎲 Dice — High
🎲 3 + 🎲 5 = 8
Bet: 100 coin
Win! ✅
+100 coin (×2)
```

Embed color: green (`0x57f287`) on win, red (`0xed4245`) on loss.

## 7. i18n

New keys needed (all 15 locale files):

```
"gamble.coinflip.title": "Coinflip"
"gamble.coinflip.heads": "Heads"
"gamble.coinflip.tails": "Tails"
"gamble.slots.title": "Slots"
"gamble.slots.combo.777": "JACKPOT 7️⃣7️⃣7️⃣"
"gamble.slots.combo.diamond": "Triple Diamond!"
"gamble.slots.combo.bell": "Triple Bell!"
"gamble.slots.combo.lemon": "Triple Lemon!"
"gamble.slots.combo.cherry3": "Triple Cherry!"
"gamble.slots.combo.cherry2": "Double Cherry"
"gamble.slots.combo.none": "No match"
"gamble.dice.title": "Dice"
"gamble.dice.high": "High"
"gamble.dice.low": "Low"
"gamble.win": "Win! ✅"
"gamble.lose": "Lose ❌"
"gamble.bet": "Bet: {{amount}} coin"
"gamble.payout.win": "+{{amount}} coin (×{{multiplier}})"
"gamble.payout.lose": "-{{amount}} coin"
"gamble.payout.partial": "{{amount}} coin back (×{{multiplier}})"
"gamble.cooldown": "Wait **{{seconds}}s** before gambling again."
"gamble.disabled": "Gambling is disabled in this server."
"gamble.min_bet": "Minimum bet is **{{min}}** coin."
"gamble.max_bet": "Maximum bet is **{{max}}** coin."
"gamble.insufficient": "Not enough coin. Balance: **{{balance}}**"
"gambling_config.title": "Gambling Config"
"gambling_config.enabled": "Gambling"
"gambling_config.min_bet": "Min Bet"
"gambling_config.max_bet": "Max Bet"
"gambling_config.cooldown": "Cooldown (sec)"
"gambling_config.updated": "Gambling config updated."
"gambling_config.toggled_on": "Gambling **enabled**."
"gambling_config.toggled_off": "Gambling **disabled**."
```

EN + VI fully translated. 13 other locales with English placeholder.

## 8. Files Changed Summary

| Action | File |
|--------|------|
| **New** | `src/commands/slash/gamble.ts` |
| **New** | `src/services/economy/gambling.service.ts` |
| **New** | `src/models/guildGamblingConfig.model.ts` |
| **Modified** | `src/models/transaction.model.ts` — add `"gambling"` type |
| **Modified** | `src/commands/slash/economy.ts` — add gambling-config subcommands |
| **Modified** | `src/locales/*.json` (15 files) — add gambling + config i18n keys |

## Out of Scope

- Gem betting (gem stays rare)
- PvP gambling (e.g., coinflip vs another user)
- Admin-configurable odds / payout tables
- Gambling leaderboard / statistics
- Roulette, blackjack, poker (can be added as subcommands later)
- Gambling addiction warnings (could be added later as a configurable message)
