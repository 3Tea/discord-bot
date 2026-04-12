# Mine System

> Steering doc for AI assistants and contributors. Covers the mining mini-game — minerals, depth progression, checkpoints, collapse risk, and star drops.

## Overview

`/mine` is a cooldown-based economy command where users dig for minerals at increasing depth. Deeper mining yields better rewards but raises collapse risk. Progress is saved at prime-numbered floors as checkpoints, preventing total loss on collapse. Per-guild, per-user progression stored in `UserEconomy`.

## Gameplay Loop

1. User runs `/mine`
2. Check 2-hour cooldown (`mine_cd:{guildId}:{userId}`)
3. Roll collapse chance (scales with depth)
4. **On collapse**: lose coins, reset depth to last checkpoint
5. **On success**: roll mineral by rarity, award coins (base + depth bonus), advance depth by 1
6. If new depth is prime → auto-save checkpoint
7. Roll 4% star drop on success only
8. Set 2-hour cooldown

## Mineral Table

| Mineral | Probability | Base Coin | Depth Bonus | Rarity | Emoji | Embed Color |
|---------|------------|-----------|-------------|--------|-------|-------------|
| Stone | 45% | 10-30 | depth × 2 | Common | 🪨 | #95a5a6 (gray) |
| Iron | 28% | 40-80 | depth × 3 | Uncommon | ⛓️ | #3498db (blue) |
| Gold | 15% | 100-200 | depth × 5 | Rare | 🥇 | #9b59b6 (purple) |
| Diamond | 8% | 300-500 | depth × 8 | Epic | 💎 | #e91e63 (pink) |
| Emerald | 4% | 500-800 | depth × 12 | Legendary | 🟢 | #f1c40f (yellow) |

**Reward formula**: `randomInt(baseCoinMin, baseCoinMax) + (depth × depthMultiplier)`

## Collapse System

| Depth Range | Collapse Chance |
|-------------|----------------|
| 1-5 | 5% |
| 6-10 | 10% |
| 11+ | 15% |

**On collapse**:
- Lose 50-100 coins (random, capped at user's actual balance — no debt)
- `mineDepth` resets to `mineCheckpoint`
- Checkpoint is unchanged
- No mineral reward

## Depth & Checkpoint System

- **Depth** starts at 1, increments by 1 per successful mine (unlimited ceiling)
- **Checkpoints** auto-save when depth reaches a prime number (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, …)
- Prime detection uses trial division (`isPrime()` in mine service)
- On collapse, depth resets to last checkpoint — prevents complete progress loss
- Both fields persisted to MongoDB immediately after each successful mine

## Star Drop

- **Rate**: 4% chance on successful mine (not on collapse)
- **Reward**: 1 star to global wallet (cross-guild)
- Uses `tryStarDrop(userId, 0.04, "mine")` utility from `src/util/economy/starDrop.ts`

## Redis Caching

| Key | Value | TTL | Purpose |
|-----|-------|-----|---------|
| `mine_cd:{guildId}:{userId}` | `true` | 7200s (2h) | Mine cooldown per user per guild |

## Data Model

### UserEconomy (mine fields)

| Field | Type | Default |
|-------|------|---------|
| `mineDepth` | Number | 1 |
| `mineCheckpoint` | Number | 1 |

Part of `UserEconomy` model — per-guild, per-user (compound unique index `(userId, guildId)`).

### Transaction

- Type: `"mine"`
- Metadata on success: `{ mineral: "gold", rarity: "rare", depth: 15, reward: 825 }`
- Metadata on collapse: `{ collapsed: true, depth: 12, penalty: 75 }`

## Services

### MineService (`services/economy/mine.service.ts`)

| Export | Description |
|--------|-------------|
| `mine(userId, guildId)` | Core game logic — collapse roll, mineral roll, reward, depth/checkpoint update |
| `getRarityColor(rarity)` | Returns embed color integer for mineral rarity |
| `isPrime(n)` | Trial division prime check for checkpoint detection |

**Return type**: `MineResult { collapsed, mineral, penalty, newDepth, checkpoint, checkpointReached }`

### CurrencyService

- `addCoin()` called on successful mine with mineral metadata
- Collapse penalty also via `addCoin()` with negative amount

## Command (`/mine`)

- **File**: `src/commands/slash/mine.ts`
- **Cooldown**: 2 hours
- **Category**: Economy (in help system)
- **Embeds**:
  - Collapse: red (0xed4245), "💥 Mining" title, penalty and checkpoint info
  - Success: color-coded by rarity, mineral name, reward amount, depth/checkpoint display
- **i18n**: Full localization via `resolveLocale()` + `t()`

## i18n Keys

| Key | Purpose |
|-----|---------|
| `cmd.mine.desc` | Command description |
| `mine.title` | Embed title |
| `mine.cooldown` | Cooldown message (`{{time}}`) |
| `mine.success` | Success message (`{{depth}}`) |
| `mine.reward` | Reward display (`{{amount}}`) |
| `mine.depth` | Depth/checkpoint info (`{{depth}}`, `{{checkpoint}}`) |
| `mine.checkpoint_reached` | Checkpoint saved notification |
| `mine.collapse` | Collapse message (`{{depth}}`) |
| `mine.collapse_penalty` | Penalty message (`{{amount}}`, `{{checkpoint}}`) |
| `mine.mineral.stone` | Mineral name: Stone |
| `mine.mineral.iron` | Mineral name: Iron |
| `mine.mineral.gold` | Mineral name: Gold |
| `mine.mineral.diamond` | Mineral name: Diamond |
| `mine.mineral.emerald` | Mineral name: Emerald |

All keys present in 15 locale files.

## Cross-References

- **Economy system**: [economy-system.md](economy-system.md) — CurrencyService, transaction logging
- **Global wallet**: [global-wallet.md](global-wallet.md) — star drop mechanics
- **Dungeon system**: [dungeon-system.md](dungeon-system.md) — shares depth/checkpoint pattern
