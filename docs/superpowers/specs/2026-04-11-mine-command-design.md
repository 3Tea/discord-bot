# Mine Command

**Date:** 2026-04-11
**Status:** Approved

## Overview

New `/mine` slash command. Users dig for minerals with rarity tiers. A depth system tracks progress — deeper = better rewards but higher collapse risk. Checkpoints at prime-number depths prevent full progress loss.

## Gameplay Flow

```
User runs /mine
  1. Check cooldown (2 hours)
  2. Roll collapse chance based on current depth
     - Depth 1-5: 5%
     - Depth 6-10: 10%
     - Depth 11+: 15%
  3a. COLLAPSE:
     - Lose 50-100 coin penalty
     - Reset depth to last checkpoint (or 1 if none)
     - Reply with collapse embed
  3b. SUCCESS:
     - Roll mineral by rarity
     - Calculate reward: base coin + (depth × depth bonus multiplier)
     - Award coins via CurrencyService
     - Increment depth by 1
     - If new depth is prime → auto-save as checkpoint
     - Roll star drop (4% chance, 1 star)
     - Reply with success embed showing mineral + reward + depth
  4. Set cooldown (2 hours)
```

## Minerals

| Mineral | Rarity | Base Coin | Depth Bonus | Emoji |
|---------|--------|-----------|-------------|-------|
| Stone | 45% | 10-30 | +depth×2 | 🪨 |
| Iron | 28% | 40-80 | +depth×3 | ⛓️ |
| Gold | 15% | 100-200 | +depth×5 | 🥇 |
| Diamond | 8% | 300-500 | +depth×8 | 💎 |
| Emerald | 4% | 500-800 | +depth×12 | 🟢 |

Reward formula: `randomInt(baseCoinMin, baseCoinMax) + (depth × depthBonus)`

## Depth & Checkpoint System

- **Depth**: Starts at 1, increments by 1 on each successful mine
- **Checkpoints**: Auto-saved at prime-number depths (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31...)
- **Collapse**: Resets depth to last saved checkpoint. If no checkpoint exists (depth was 1), stays at 1
- **Collapse penalty**: Lose 50-100 coins (random). If user has fewer coins, lose what they have (no negative balance)
- **Prime check**: Simple trial division — depths won't exceed ~100 so performance is not a concern

## Collapse Rates

| Depth Range | Collapse Chance |
|-------------|----------------|
| 1-5 | 5% |
| 6-10 | 10% |
| 11+ | 15% |

## Data Model

Add two fields to existing `UserEconomy` model (`src/models/userEconomy.model.ts`):

```typescript
mineDepth: { type: Number, default: 1 }
mineCheckpoint: { type: Number, default: 1 }
```

These are per-guild per-user (same as coin/gem), stored in the existing `UserEconomy` document.

## Cooldown

- **Duration**: 2 hours (7200 seconds)
- **Redis key**: `mine_cd:{guildId}:{userId}`
- **Pattern**: Same as work/fish — `redis.ttlKey()` check, `redis.setJson()` to set

## Star Drop

Call `tryStarDrop(userId, 0.04, "mine")` after successful mine (not on collapse). 4% rate — same tier as work (2h cooldown).

## i18n Keys

| Key | EN Value |
|-----|----------|
| `cmd.mine.desc` | `"Dig for minerals — go deeper for better rewards"` |
| `mine.title` | `"Mining"` |
| `mine.disabled` | `"Mining is disabled in this server."` |
| `mine.cooldown` | `"You're resting. Try again in {{time}}."` |
| `mine.success` | `"You dug at depth **{{depth}}** and found:"` |
| `mine.reward` | `"+**{{amount}}** coin"` |
| `mine.depth` | `"Depth: **{{depth}}** | Checkpoint: **{{checkpoint}}**"` |
| `mine.checkpoint_reached` | `"Checkpoint saved at depth **{{depth}}**!"` |
| `mine.collapse` | `"The mine collapsed at depth **{{depth}}**!"` |
| `mine.collapse_penalty` | `"You lost **{{amount}}** coin and fell back to depth **{{checkpoint}}**."` |
| `mine.mineral.stone` | `"Stone"` |
| `mine.mineral.iron` | `"Iron"` |
| `mine.mineral.gold` | `"Gold"` |
| `mine.mineral.diamond` | `"Diamond"` |
| `mine.mineral.emerald` | `"Emerald"` |
| `mine.rarity.common` | `"Common"` |
| `mine.rarity.uncommon` | `"Uncommon"` |
| `mine.rarity.rare` | `"Rare"` |
| `mine.rarity.epic` | `"Epic"` |
| `mine.rarity.legendary` | `"Legendary"` |

All keys must be added to all 15 locale files with native translations.

## Files

| File | Action | Responsibility |
|------|--------|----------------|
| `src/services/economy/mine.service.ts` | Create | Mineral roll, collapse logic, depth/checkpoint, prime check |
| `src/commands/slash/mine.ts` | Create | Slash command — cooldown, call service, build embed |
| `src/models/userEconomy.model.ts` | Modify | Add `mineDepth`, `mineCheckpoint` fields |
| `src/util/help/commandCategories.ts` | Modify | Add `mine: "economy"` |
| `src/locales/*.json` (15 files) | Modify | Add `mine.*` and `cmd.mine.desc` keys |

## Edge Cases

- **User has no economy record**: `findOneAndUpdate` with `$setOnInsert` handles creation (existing pattern)
- **Collapse at depth 1 with no checkpoint**: Stay at depth 1, still lose coin penalty
- **User has fewer coins than penalty**: Lose what they have, balance goes to 0 (not negative)
- **Collapse penalty DB error**: Log and continue — user keeps their depth, no penalty applied (fail-safe)
