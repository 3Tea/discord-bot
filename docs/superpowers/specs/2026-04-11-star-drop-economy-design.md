# Star Drop from Economy Commands

**Date:** 2026-04-11
**Status:** Approved

## Problem

Stars (global currency) are only earnable via `/wallet daily` (~2/day) and one-time milestones. Users who actively use economy commands (pray, curse, work, fish) have no way to passively earn stars through gameplay. This makes stars feel disconnected from daily activity.

## Requirements

- Economy commands (pray, curse, work, fish) have a small chance to drop 1 star after successfully earning coins
- Drop rate scales with cooldown length: longer cooldown = higher chance
- Star drop logged as transaction for audit trail
- User sees a message in the command embed when they receive a star

## Design

### Helper: `src/util/economy/starDrop.ts`

```typescript
async function tryStarDrop(userId: string, rate: number, source: string): Promise<boolean>
```

- Rolls `Math.random() < rate`
- If hit: calls `WalletService.addStar(userId, 1, "star_drop", { source })`
- Returns `true` if star was awarded, `false` otherwise
- Does not throw — star drop failure should never break the parent command

### Transaction Type

Add `"star_drop"` to `TransactionType` union and schema enum in `src/models/transaction.model.ts`.

### Drop Rates

| Command | Cooldown | Rate |
|---------|----------|------|
| pray | 1/day | 5% |
| curse | 1/day | 5% |
| work | 4 hours | 4% |
| fish | 1 hour | 3% |

### Integration Pattern

Each command calls `tryStarDrop()` after successful coin reward. If `true`, append a star drop line to the embed response using `economy.star_drop` i18n key.

### i18n

One new key across all 15 locale files:

| Key | EN value |
|-----|----------|
| `economy.star_drop` | `"You found a star!"` |

### Files Changed

| File | Change |
|------|--------|
| `src/util/economy/starDrop.ts` | New — `tryStarDrop()` helper |
| `src/models/transaction.model.ts` | Add `"star_drop"` to type union + schema enum |
| `src/commands/slash/pray.ts` | Call `tryStarDrop(userId, 0.05, "pray")` after reward |
| `src/commands/slash/curse.ts` | Call `tryStarDrop(userId, 0.05, "curse")` after reward |
| `src/commands/slash/work.ts` | Call `tryStarDrop(userId, 0.04, "work")` after reward |
| `src/commands/slash/fish.ts` | Call `tryStarDrop(userId, 0.03, "fish")` after reward |
| `src/locales/*.json` (15 files) | Add `economy.star_drop` key |

### Edge Cases

- **Star drop fails (DB error)**: Silently log and continue — user still gets their coins
- **User has no wallet yet**: `WalletService.addStar()` handles `getOrCreate` internally
- **Future commands (mine, dungeon)**: Call same `tryStarDrop()` with their own rates
