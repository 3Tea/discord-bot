# Dungeon Command (Phase 1)

**Date:** 2026-04-11
**Status:** Approved

## Overview

New `/dungeon` slash command. Users explore a dungeon with random encounters: monsters (turn-based combat via buttons), treasure chests, and traps. Floor system with prime-number checkpoints reuses the mine pattern. Phase 2 (NPC merchant) deferred.

## Gameplay Flow

```
User runs /dungeon
  1. Check cooldown (1 hour)
  2. Init run: HP = 100
  3. Roll encounter based on current floor
     - Monster (50%): combat with buttons
     - Treasure (25%): loot chest
     - Trap (15%): HP + coin loss
     - NPC (10%): flavor text only (Phase 2)
  4. Resolve encounter:
     - Monster win / Treasure: advance floor, reward coins/gems
     - Monster lose: reset to checkpoint, lose 100-200 coin
     - Trap: lose HP + coin, stay on same floor
     - If HP ≤ 0 from trap: collapse to checkpoint
  5. Check if new floor is prime → auto-save checkpoint
  6. Set cooldown (1 hour)
```

## Combat System

### Stats

| Stat | Formula |
|------|---------|
| User HP (per run) | 100 (not persisted) |
| Monster HP | `30 + floor × 5` |
| User attack damage | `randomInRange(15, 25) + floor × 2` |
| Monster attack damage | `randomInRange(10, 20) + floor × 3` |

### Actions (3 buttons)

| Button | Effect |
|--------|--------|
| ⚔️ Attack | User deals full damage, monster deals full damage |
| 🛡️ Defend | User deals 70% damage, takes 50% damage (counter-attack) |
| 🏃 Run | Escape immediately, no reward, no penalty |

### Combat Rules

- Max 3 turns per combat
- If monster still alive after 3 turns → user escapes (no reward, no penalty)
- Button timeout: 30 seconds → auto-run
- Combat state stored in Redis (60s TTL) for button handlers

### Combat State (Redis)

- **Key:** `dungeon_combat:{userId}`
- **Value:** `{ monsterHp, userHp, floor, turnsLeft, guildId, locale }`
- **TTL:** 60 seconds

Buttons read state from Redis, update it, and either continue combat (edit reply with new HP) or resolve (edit reply with outcome). State is deleted when combat ends.

## Encounters

### Monster (50%)

- Roll monster type by floor tier for flavor (names only, stats use formula above)
- Win: `50-150 + floor×10` coin, 10% chance 1 gem, `tryStarDrop(userId, 0.03, "dungeon")`
- Lose (HP ≤ 0): reset to checkpoint, lose `min(randomInRange(100, 200), userCoin)` coin

### Treasure Chest (25%)

- Reward: `30-100 + floor×8` coin
- 15% chance: +1 gem
- 3% chance: +1 star (roll `Math.random() < 0.03`, if hit call `WalletService.addStar` directly)
- Advance floor

### Trap (15%)

- Lose 10-20 HP + 30-60 coin
- Stay on same floor (no advance)
- If HP ≤ 0 after trap: collapse to checkpoint, lose additional 100-200 coin

### NPC Merchant (10%) — Phase 2 stub

- Show flavor text: "A mysterious merchant waves at you..."
- No interaction, no reward, no penalty
- Stay on same floor

## Floor & Checkpoint System

Reuses mine pattern:
- `dungeonDepth` starts at 1, increments on monster win or treasure
- `dungeonCheckpoint` auto-saved when `dungeonDepth` reaches a prime number
- Lose/collapse → reset `dungeonDepth` to `dungeonCheckpoint`
- Prime check: same `isPrime()` utility from mine service (extract to shared util or inline)

## Data Model

Add to `UserEconomy` model (`src/models/userEconomy.model.ts`):

```typescript
dungeonDepth: { type: Number, default: 1 }
dungeonCheckpoint: { type: Number, default: 1 }
```

## Button IDs

Add to `src/util/config/button.ts`:

```typescript
DUNGEON_ATTACK: "dungeon_attack"
DUNGEON_DEFEND: "dungeon_defend"
DUNGEON_RUN: "dungeon_run"
```

## Cooldown

- **Duration:** 1 hour (3600 seconds)
- **Redis key:** `dungeon_cd:{guildId}:{userId}`

## i18n Keys

| Key | EN Value |
|-----|----------|
| `cmd.dungeon.desc` | `"Explore the dungeon — fight monsters, find treasure"` |
| `dungeon.title` | `"Dungeon"` |
| `dungeon.cooldown` | `"You're recovering. Try again in {{time}}."` |
| `dungeon.encounter.monster` | `"A **{{monster}}** appears on floor **{{floor}}**!"` |
| `dungeon.encounter.treasure` | `"You found a treasure chest on floor **{{floor}}**!"` |
| `dungeon.encounter.trap` | `"You triggered a trap on floor **{{floor}}**!"` |
| `dungeon.encounter.npc` | `"A mysterious merchant waves at you..."` |
| `dungeon.combat.hp` | `"Your HP: **{{userHp}}**/100 | {{monster}} HP: **{{monsterHp}}**"` |
| `dungeon.combat.attack` | `"You dealt **{{userDmg}}** damage and took **{{monsterDmg}}** damage."` |
| `dungeon.combat.defend` | `"You blocked and countered for **{{userDmg}}** damage, taking **{{monsterDmg}}** damage."` |
| `dungeon.combat.win` | `"You defeated the **{{monster}}**!"` |
| `dungeon.combat.lose` | `"You were defeated! Fell back to floor **{{checkpoint}}**."` |
| `dungeon.combat.run` | `"You escaped safely."` |
| `dungeon.combat.timeout` | `"No response — you fled the dungeon."` |
| `dungeon.combat.turns_up` | `"The monster is too tough — you escaped after 3 turns."` |
| `dungeon.reward.coin` | `"+**{{amount}}** coin"` |
| `dungeon.reward.gem` | `"+**{{amount}}** gem"` |
| `dungeon.penalty` | `"Lost **{{amount}}** coin."` |
| `dungeon.trap.damage` | `"Lost **{{hp}}** HP and **{{coin}}** coin."` |
| `dungeon.floor` | `"Floor: **{{floor}}** | Checkpoint: **{{checkpoint}}**"` |
| `dungeon.checkpoint_reached` | `"Checkpoint saved at floor **{{floor}}**!"` |
| `dungeon.collapse` | `"You collapsed! Fell back to floor **{{checkpoint}}**."` |
| `dungeon.btn.attack` | `"Attack"` |
| `dungeon.btn.defend` | `"Defend"` |
| `dungeon.btn.run` | `"Run"` |

All keys in all 15 locale files with native translations.

## Files

| File | Action | Responsibility |
|------|--------|----------------|
| `src/services/economy/dungeon.service.ts` | Create | Encounter roll, combat logic, reward calc, floor management |
| `src/commands/slash/dungeon.ts` | Create | Slash command — cooldown, init encounter, build embeds |
| `src/buttons/dungeonAttack.button.ts` | Create | Attack button — deal damage, check win/lose |
| `src/buttons/dungeonDefend.button.ts` | Create | Defend button — counter-attack, check win/lose |
| `src/buttons/dungeonRun.button.ts` | Create | Run button — escape combat |
| `src/util/config/button.ts` | Modify | Add 3 dungeon button IDs |
| `src/models/userEconomy.model.ts` | Modify | Add `dungeonDepth`, `dungeonCheckpoint` |
| `src/util/help/commandCategories.ts` | Modify | Add `dungeon: "economy"` |
| `src/locales/*.json` (15 files) | Modify | Add `dungeon.*` and `cmd.dungeon.desc` keys |

## Edge Cases

- **Button clicked by wrong user**: Check `interaction.user.id` matches combat state `userId`
- **Button after timeout**: Redis key expired → reply "combat ended"
- **Concurrent /dungeon**: Check existing combat state in Redis before starting new run
- **User has fewer coins than penalty**: Lose what they have, balance goes to 0
- **Trap kills user (HP ≤ 0)**: Treated as collapse, back to checkpoint + coin penalty
