# Dungeon System

> Steering doc for AI assistants and contributors. Covers the dungeon mini-game — multi-encounter runs, turn-based combat, NPC merchants, buffs, traps, treasure, and floor progression.

## Overview

`/dungeon` is an interactive economy command where users explore a dungeon across multiple encounters per run. Each run has up to 5 encounters (monster combat, treasure chests, traps, NPC merchants). Users progress through floors with risk-reward scaling — deeper floors give better rewards but tougher monsters and more dangerous traps. Progression uses the same prime-number checkpoint system as mining.

## Run Lifecycle

1. User runs `/dungeon`
2. Check 1-hour cooldown (`dungeon_cd:{guildId}:{userId}`)
3. Check no existing run (`dungeon_run:{userId}`) or combat (`dungeon_combat:{userId}`)
4. Create `DungeonRunState` in Redis (TTL: 900s / 15 minutes)
5. Roll first encounter, display embed with action buttons
6. After each encounter resolve:
   - If HP ≤ 0 → run ends (collapse to checkpoint, penalty applied)
   - If encounters exhausted (5 used) → run ends normally
   - Otherwise → show **Continue** / **Leave** buttons
7. **Continue**: decrement `encountersLeft`, roll next encounter, edit same message
8. **Leave**: end run, set 1-hour cooldown
9. Run also ends on 15-minute timeout (progress already persisted per-encounter)

## Encounter Types

| Encounter | Base Rate | With Luck Buff | Advances Floor |
|-----------|-----------|----------------|----------------|
| Monster | 50% | 50% | Yes (on win) |
| Treasure | 25% | 35% | Yes |
| Trap | 15% | 5% | No |
| NPC Merchant | 10% | 10% | No |

## Monster Combat

### Monster Stats

- **HP**: `30 + (floor × 5)`
- **Damage**: `random(10-20) + (floor × 3)`

### User Stats

- **HP**: Starts at 100 per run, persists across encounters
- **Damage**: `random(15-25) + (floor × 2)`

### Combat Actions (button-driven)

| Button | Effect |
|--------|--------|
| ⚔️ Attack | Full damage both ways |
| 🛡️ Defend | User deals 70% damage, takes 50% damage |
| 🏃 Run | Escape immediately — no reward, no penalty |

### Combat Rules

- Max **3 turns** per combat encounter
- Monster still alive after 3 turns → user escapes (no reward, no penalty)
- Button timeout: **30 seconds** → auto-run
- Combat state stored in Redis (`dungeon_combat:{userId}`, TTL: 60s)

### Combat Rewards (on win)

| Reward | Amount |
|--------|--------|
| Coin | `random(50-150) + (floor × 10)` |
| Gem | 10% chance for 1 |
| Star | 3% chance via `tryStarDrop()` |

Floor advances by 1. Checkpoint auto-saved if new floor is prime.

### Combat Loss (HP ≤ 0)

- Reset `dungeonDepth` to `dungeonCheckpoint`
- Coin penalty: `min(random(100-200), userBalance)` — no debt
- Run ends immediately, cooldown set

## Treasure Chest

| Reward | Amount |
|--------|--------|
| Coin | `random(30-100) + (floor × 8)` |
| Gem | 15% chance for 1 |
| Star | 3% chance via `tryStarDrop()` |

Floor advances by 1. Checkpoint auto-saved if new floor is prime.

## Trap

- **HP loss**: `random(10-20)`
- **Coin loss**: `min(random(30-60), userBalance)`
- Floor does **not** advance

**If HP ≤ 0 after trap (collapse)**:
- Reset `dungeonDepth` to `dungeonCheckpoint`
- Additional coin penalty: `random(100-200)`
- Run ends, cooldown set

## NPC Merchant

Merchant appears as an encounter offering **one** service per visit. Buttons are disabled after selection or if insufficient coin. Merchant timeout: **60 seconds** → merchant vanishes, continue/leave buttons remain.

### Services

| Service | Cost | Effect |
|---------|------|--------|
| 🧪 Heal | `80 + (floor × 5)` coin | Restore `30 + (floor × 2)` HP (capped at 100) |
| ⚔️ Buff | `100 + (floor × 5)` coin | Random buff for remaining encounters |
| 💱 Exchange | `random(300-600)` coin | 1 gem |

- Heal button disabled if HP already 100
- Buff replaces existing buff if user already has one
- Merchant does **not** advance floor

### Buff System

Acquired from merchant. Applies to remaining encounters in the run. Ticks down after each encounter.

| Buff Type | Effect |
|-----------|--------|
| Attack | User damage × 1.3 |
| Defense | Monster damage × 0.7 |
| Luck | Treasure 25% → 35%, Trap 15% → 5% |

## Floor & Checkpoint System

Same pattern as mine system:
- **Floor** (`dungeonDepth`) starts at 1, increments on monster win or treasure
- **Checkpoint** (`dungeonCheckpoint`) auto-saved at prime-numbered floors
- On death/collapse: floor resets to checkpoint
- Both fields written to MongoDB **immediately** after each floor advance (not deferred to run end)

## Monster Tiers (Flavor)

| Tier | Floor Range | Monsters |
|------|------------|----------|
| Tier 1 | 1-5 | Rat 🐀, Bat 🦇, Slime 🟢, Goblin 👺, Spider 🕷️ |
| Tier 2 | 6-10 | Skeleton 💀, Zombie 🧟, Wolf 🐺, Orc 👹, Ghost 👻 |
| Tier 3 | 11+ | Dragon 🐉, Demon 😈, Lich 🧙, Hydra 🐍, Titan ⚡ |

Monster names are cosmetic — HP and damage are calculated by floor formula, not per-monster.

## Redis State Management

### Run State (`dungeon_run:{userId}`, TTL: 900s)

| Field | Type | Description |
|-------|------|-------------|
| `userId` | String | Owner of the run |
| `guildId` | String | Guild context |
| `locale` | String | Resolved locale |
| `hp` | Number | Current HP (starts 100) |
| `floor` | Number | Current dungeon depth |
| `checkpoint` | Number | Last saved checkpoint |
| `encountersLeft` | Number | Remaining encounters (starts 5) |
| `activeBuff` | Object / null | Active buff with type and remaining ticks |
| `messageId` | String | Discord message ID (reused across encounters) |

### Combat State (`dungeon_combat:{userId}`, TTL: 60s)

| Field | Type | Description |
|-------|------|-------------|
| `encounterId` | String | Unique encounter ID |
| `userId` | String | Owner |
| `monsterHp` | Number | Monster remaining HP |
| `userHp` | Number | User remaining HP |
| `floor` | Number | Current floor |
| `checkpoint` | Number | Current checkpoint |
| `turnsLeft` | Number | Remaining turns (starts 3) |
| `guildId` | String | Guild context |
| `locale` | String | Resolved locale |
| `monsterName` | String | Display name |
| `monsterEmoji` | String | Display emoji |

### Merchant State (`dungeon_merchant:{userId}`, TTL: 60s)

| Field | Type | Description |
|-------|------|-------------|
| `encounterId` | String | Unique encounter ID |
| `userId` | String | Owner |
| `guildId` | String | Guild context |
| `locale` | String | Resolved locale |
| `floor` | Number | Current floor |
| `checkpoint` | Number | Current checkpoint |
| `healCost` | Number | Heal price |
| `healAmount` | Number | HP to restore |
| `buffType` | String | `"attack"` / `"defense"` / `"luck"` |
| `buffCost` | Number | Buff price |
| `exchangeRate` | Number | Coin cost for 1 gem |
| `currentHp` | Number | User HP at time of merchant |

### Cooldown (`dungeon_cd:{guildId}:{userId}`, TTL: 3600s)

Simple flag. 1-hour expiry.

## Button Handlers

| Button | customId | File | Behavior |
|--------|----------|------|----------|
| ⚔️ Attack | `dungeon_attack` | `dungeonAttack.button.ts` | Full damage exchange |
| 🛡️ Defend | `dungeon_defend` | `dungeonDefend.button.ts` | Reduced damage both ways |
| 🏃 Run | `dungeon_run` | `dungeonRun.button.ts` | Escape combat |
| 🧪 Heal | `dungeon_heal` | `dungeonHeal.button.ts` | Buy heal from merchant |
| ⚔️ Buff | `dungeon_buff` | `dungeonBuff.button.ts` | Buy buff from merchant |
| 💱 Exchange | `dungeon_exchange` | `dungeonExchange.button.ts` | Exchange coins for gem |
| ➡️ Continue | `dungeon_continue` | `dungeonContinue.button.ts` | Next encounter |
| 🚪 Leave | `dungeon_leave` | `dungeonLeave.button.ts` | Exit dungeon |

All handlers follow the safety pattern:
1. Validate state exists in Redis (ephemeral error if expired)
2. Owner check (`interaction.user.id === state.userId`) — silent return if wrong user
3. Atomic state update or deletion before side effects
4. Edit original reply with new embed state

## Data Model

### UserEconomy (dungeon fields)

| Field | Type | Default |
|-------|------|---------|
| `dungeonDepth` | Number | 1 |
| `dungeonCheckpoint` | Number | 1 |

Part of `UserEconomy` model — per-guild, per-user (compound unique index `(userId, guildId)`).

### Transaction

- Type: `"dungeon"`
- Metadata examples:
  - Monster win: `{ encounter: "monster_win", floor: 5 }`
  - Treasure: `{ encounter: "treasure", floor: 3 }`
  - Merchant heal: `{ action: "merchant_heal", floor: 7, cost: 120, healAmount: 45 }`
  - Merchant buff: `{ action: "merchant_buff", floor: 7, cost: 135, buffType: "attack" }`
  - Merchant exchange: `{ action: "merchant_exchange", floor: 7 }`

## Services

### DungeonService (`services/economy/dungeon.service.ts`)

Core game logic — encounter rolling, combat resolution, trap/treasure processing, state management.

### MerchantService (`services/economy/merchant.service.ts`)

NPC merchant pricing and mechanics — heal amount calculation, buff assignment, exchange rates.

### CurrencyService

- `addCoin()` / `addGem()` for rewards
- `deduct()` for merchant purchases (throws `InsufficientFundsError`)
- Collapse penalty via `addCoin()` with negative amount

## Command (`/dungeon`)

- **File**: `src/commands/slash/dungeon.ts`
- **Cooldown**: 1 hour
- **Category**: Economy (in help system)
- **Single-message pattern**: All encounters edit the same Discord message (stored as `messageId` in run state)
- **i18n**: Full localization via `resolveLocale()` + `t()`

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Wrong user clicks button | Silent `deferUpdate()`, no action |
| Button after state timeout | Ephemeral error "encounter ended" |
| Combat 30s timeout | Auto-run, no reward/penalty |
| Merchant 60s timeout | Merchant vanishes, continue/leave remain |
| Run 15min timeout | Progress already persisted to DB per-encounter |
| Insufficient coin for merchant | Button disabled; error if somehow clicked |
| Concurrent `/dungeon` calls | Second call rejected with "already in dungeon" |
| 0 coin + penalty | Balance stays at 0 (no debt) |

## Cross-References

- **Economy system**: [economy-system.md](economy-system.md) — CurrencyService, transaction logging
- **Global wallet**: [global-wallet.md](global-wallet.md) — star drop mechanics
- **Mine system**: [mine-system.md](mine-system.md) — shares depth/checkpoint pattern
