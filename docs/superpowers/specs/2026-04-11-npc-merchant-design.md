# NPC Merchant System (Dungeon Phase 2)

**Date:** 2026-04-11
**Status:** Approved

## Overview

Expand the dungeon `/dungeon` command from single-encounter to **multi-encounter runs** (max 5 per run) and replace the NPC flavor-text stub with a fully interactive **merchant** offering 3 services: HP heal, temporary buff, and coin→gem exchange. Each service is a button interaction; user picks one per merchant encounter.

## Multi-Encounter Run System

### Run State (Redis)

- **Key:** `dungeon_run:{userId}`
- **TTL:** 900s (15 minutes — Discord interaction limit)

```typescript
interface DungeonRunState {
  userId: string;
  guildId: string;
  locale: string;
  hp: number;              // starts 100, persists across encounters
  floor: number;           // current floor
  checkpoint: number;      // last prime checkpoint
  encountersLeft: number;  // starts 5, decrements each encounter
  activeBuff: Buff | null; // from merchant, applies to remaining encounters
  messageId: string;       // for editReply
}

interface Buff {
  type: "attack" | "defense" | "luck";
  encountersLeft: number;  // decrements each encounter, removed when 0
}
```

### Run Flow

```
/dungeon
  1. Check cooldown (1 hour)
  2. Check no existing run: dungeon_run:{userId}
  3. Create RunState: hp=100, encountersLeft=5, floor/checkpoint from DB
  4. Roll first encounter → show embed
  5. Resolve encounter:
     - Combat: combat buttons → resolve → Continue/Leave buttons
     - Treasure/Trap/NPC: resolve → Continue/Leave buttons
  6. User clicks Continue → encountersLeft--, roll next encounter
  7. User clicks Leave → end run, set cooldown
  8. Run ends when: encountersLeft=0, HP≤0, user Leaves, or timeout (15min)
  9. On run end → persist floor/checkpoint to DB, set cooldown
```

### Continue/Leave Buttons

After each resolved encounter (unless HP ≤ 0 or encounters exhausted), display:
- `[⬇️ Go Deeper]` — roll next encounter, edit reply
- `[🚪 Leave Dungeon]` — end run, keep all rewards earned

### Buff Application

| Buff Type | Effect |
|-----------|--------|
| Attack | `userDmg *= 1.3` in combat |
| Defense | `monsterDmg *= 0.7` in combat |
| Luck | Treasure 25%→35%, Trap 15%→5% (shift 10% from trap to treasure) |

Buff `encountersLeft` decrements after each encounter. Removed when reaches 0.

### Encounter Distribution

| Encounter | Normal | With Luck Buff |
|-----------|--------|----------------|
| Monster | 50% | 50% |
| Treasure | 25% | 35% |
| Trap | 15% | 5% |
| NPC | 10% | 10% |

### Cooldown Change

**Before (Phase 1):** Cooldown set immediately when `/dungeon` runs.
**After (Phase 2):** Cooldown set **when run ends** (leave, death, max encounters, timeout).

## NPC Merchant Encounter

### Merchant State (Redis)

- **Key:** `dungeon_merchant:{userId}`
- **TTL:** 60s (merchant timeout)

```typescript
interface MerchantState {
  userId: string;
  guildId: string;
  locale: string;
  floor: number;
  healCost: number;       // pre-calculated on encounter
  healAmount: number;     // pre-calculated on encounter
  buffType: "attack" | "defense" | "luck";  // pre-rolled
  buffCost: number;       // pre-calculated on encounter
  exchangeRate: number;   // pre-rolled coin per gem
  currentHp: number;      // from run state, for display
}
```

### Pricing Formulas

| Service | Cost Formula | Effect |
|---------|-------------|--------|
| Heal | `80 + floor × 5` coin | Restore `30 + floor × 2` HP (cap at 100) |
| Buff | `100 + floor × 5` coin | Random 1 of 3 types, lasts remaining encounters in run |
| Exchange | `randomInRange(300, 600)` coin | 1 gem |

### Embed Display

```
🏪 A mysterious merchant appears on floor {floor}!

"Welcome, adventurer! What can I do for you?"

🧪 Heal — Restore {healAmount} HP (Cost: {healCost} coin)
✨ Buff — {buffType} boost for remaining encounters (Cost: {buffCost} coin)
💎 Exchange — 1 gem (Cost: {exchangeRate} coin)

Your HP: {hp}/100 | Coin: {coin}
Floor: {floor} | Checkpoint: {checkpoint}
```

### 3 Button Interactions

Buttons: `[🧪 Heal] [✨ Buff] [💎 Exchange]`

User picks **one** service per merchant encounter. Merchant disappears after purchase.

Each button handler:
1. Read merchant state from Redis
2. Guard: check `userId` match (wrong user → `deferUpdate()` and return)
3. Guard: check sufficient coin (insufficient → ephemeral "Not enough coin")
4. Deduct coin via `CurrencyService.deduct()`
5. Apply effect:
   - **Heal:** update `runState.hp` (capped at 100)
   - **Buff:** set `runState.activeBuff` (replaces existing buff if any)
   - **Exchange:** `CurrencyService.addGem(userId, guildId, 1, ...)`
6. Delete merchant state from Redis
7. Edit reply → show result + Continue/Leave buttons
8. Merchant **does not advance floor** — user stays on same floor

### Edge Cases

- **HP already 100 and Heal chosen:** disable Heal button (greyed out) if `currentHp >= 100`
- **Already has buff and merchant offers buff:** new buff replaces old one, show replacement notice
- **Insufficient coin for a service:** disable that button (greyed out)
- **Merchant timeout (60s):** merchant vanishes, run continues → show Continue/Leave buttons
- **Button clicked by wrong user:** `deferUpdate()` and return silently
- **Run timeout (15min):** run state expires — floor/checkpoint already persisted to DB after each advance, so no progress lost

## Changes to Existing Dungeon System

### Dungeon Service Refactor

Current `rollEncounter()` handles encounter + reward in one call. Split into:

- `startRun(userId, guildId, locale)` — create RunState, return first encounter
- `rollNextEncounter(runState)` — roll encounter applying luck buff if active
- `endRun(userId, guildId)` — persist floor/checkpoint to DB, cleanup Redis keys, set cooldown

Combat functions keep existing signatures but gain buff awareness:
- `processCombatAction(state, action, buff?)` — apply attack/defense buff to damage calc

### Slash Command Changes

- First encounter: `reply()` with embed
- Subsequent encounters: `editReply()` on same message (stored as `messageId` in RunState)
- All encounters within a single run use one Discord message, edited each time

### Combat State Adaptation

`dungeon_combat:{userId}` retained for combat turns. On combat resolve:
- Win → update RunState (HP, floor), show Continue/Leave
- Lose (HP ≤ 0) → end run, reset to checkpoint, persist to DB
- Run/Timeout → keep current HP, show Continue/Leave

## Data Model

No new model fields required. `UserEconomy.dungeonDepth` and `UserEconomy.dungeonCheckpoint` already exist and are sufficient. All run-time state (HP, buff, encounters) lives in Redis only.

**Important:** `dungeonDepth` and `dungeonCheckpoint` are persisted to DB immediately after each floor advance (monster win or treasure), not deferred to run end. This ensures no progress is lost if the run state expires in Redis.

## Transaction Types

Merchant transactions use existing `"dungeon"` TransactionType with metadata distinguishing the action:
- `{ action: "merchant_heal", floor, cost, healAmount }`
- `{ action: "merchant_buff", floor, cost, buffType }`
- `{ action: "merchant_exchange", floor, cost, gemGained: 1 }`

## Button IDs

Add to `src/util/config/button.ts`:

```typescript
DUNGEON_HEAL: "dungeon_heal",
DUNGEON_BUFF: "dungeon_buff",
DUNGEON_EXCHANGE: "dungeon_exchange",
DUNGEON_CONTINUE: "dungeon_continue",
DUNGEON_LEAVE: "dungeon_leave",
```

## i18n Keys

| Key | EN Value |
|-----|----------|
| `dungeon.merchant.title` | `"A mysterious merchant appears on floor **{{floor}}**!"` |
| `dungeon.merchant.greeting` | `"\"Welcome, adventurer! What can I do for you?\""` |
| `dungeon.merchant.heal_option` | `"Restore **{{amount}}** HP (Cost: **{{cost}}** coin)"` |
| `dungeon.merchant.buff_option` | `"**{{buffType}}** boost for remaining encounters (Cost: **{{cost}}** coin)"` |
| `dungeon.merchant.exchange_option` | `"1 gem (Cost: **{{rate}}** coin)"` |
| `dungeon.merchant.heal_result` | `"The merchant heals you for **{{amount}}** HP. (HP: **{{hp}}**/100)"` |
| `dungeon.merchant.buff_result` | `"You gained **{{buffType}}** boost for **{{turns}}** encounters!"` |
| `dungeon.merchant.exchange_result` | `"Exchanged **{{cost}}** coin for **1** gem."` |
| `dungeon.merchant.no_coin` | `"Not enough coin!"` |
| `dungeon.merchant.hp_full` | `"Your HP is already full!"` |
| `dungeon.merchant.timeout` | `"The merchant vanishes into the shadows..."` |
| `dungeon.merchant.buff_replaced` | `"New buff replaced your previous **{{oldBuff}}** buff."` |
| `dungeon.run.continue` | `"Go deeper? (**{{left}}** encounters remaining)"` |
| `dungeon.run.leave` | `"You leave the dungeon with your rewards."` |
| `dungeon.run.max_reached` | `"You've explored as far as you can this run."` |
| `dungeon.run.timeout` | `"You waited too long — the dungeon collapses around you."` |
| `dungeon.btn.heal` | `"Heal"` |
| `dungeon.btn.buff` | `"Buff"` |
| `dungeon.btn.exchange` | `"Exchange"` |
| `dungeon.btn.continue` | `"Go Deeper"` |
| `dungeon.btn.leave` | `"Leave"` |
| `dungeon.buff.attack` | `"Attack +30%"` |
| `dungeon.buff.defense` | `"Defense +30%"` |
| `dungeon.buff.luck` | `"Luck"` |

All 24 keys added to all 15 locale files with native translations.

## Files

### New Files

| File | Responsibility |
|------|----------------|
| `src/services/economy/merchant.service.ts` | Pricing formulas, heal calc, buff roll, exchange rate generation |
| `src/buttons/dungeonHeal.button.ts` | Heal button — deduct coin, update run HP |
| `src/buttons/dungeonBuff.button.ts` | Buff button — deduct coin, set activeBuff on run state |
| `src/buttons/dungeonExchange.button.ts` | Exchange button — deduct coin, add gem |
| `src/buttons/dungeonContinue.button.ts` | Continue — decrement encountersLeft, roll next encounter, edit reply |
| `src/buttons/dungeonLeave.button.ts` | Leave — end run, persist floor/checkpoint, set cooldown |

### Modified Files

| File | Change |
|------|--------|
| `src/services/economy/dungeon.service.ts` | Add `startRun`, `rollNextEncounter`, `endRun`; buff-aware combat damage |
| `src/commands/slash/dungeon.ts` | Multi-encounter flow, merchant embed builder, continue/leave embed builders |
| `src/buttons/dungeonAttack.button.ts` | After combat resolve → update run state, show Continue/Leave |
| `src/buttons/dungeonDefend.button.ts` | Same as attack |
| `src/buttons/dungeonRun.button.ts` | After flee → show Continue/Leave (instead of final embed) |
| `src/util/config/button.ts` | Add 5 new button IDs |
| `src/locales/*.json` (15 files) | Add 24 `dungeon.merchant.*`, `dungeon.run.*`, `dungeon.buff.*` keys |

## Edge Cases Summary

| Scenario | Behavior |
|----------|----------|
| Button clicked by wrong user | `deferUpdate()`, return silently |
| Merchant timeout (60s) | Merchant vanishes, run continues with Continue/Leave |
| Run timeout (15min) | Run state expires — floor/checkpoint already persisted after each advance, no progress lost |
| Insufficient coin for service | Disable that merchant button (greyed out) |
| HP full, Heal chosen | Disable Heal button if `currentHp >= 100` |
| Already has buff, new buff offered | New replaces old, show replacement notice |
| User has fewer coins than penalty | Lose what they have, balance → 0 |
| Concurrent `/dungeon` while run active | Check `dungeon_run:{userId}` exists → reject with "already in dungeon" |
| Trap kills user mid-run (HP ≤ 0) | End run, collapse to checkpoint, coin penalty |
| Combat loss mid-run (HP ≤ 0) | End run, reset to checkpoint, coin penalty |
| All 5 encounters used | Show final summary, end run |
