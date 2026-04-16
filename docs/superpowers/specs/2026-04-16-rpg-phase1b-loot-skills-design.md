# RPG Phase 1B: Loot & Skills Design

**Date:** 2026-04-16
**Status:** Approved

## Overview

Phase 1B adds three systems to the RPG foundation: Mana/MP for skill costs, a tiered material drop system, and class-weighted equipment drop tables. These make dungeon combat more tactical and give players reason to farm deeper floors.

## 1. Mana/MP System

### MP Formula

| Aspect | Value |
|--------|-------|
| Base MP | `50 + level * 5` (Level 1 = 55, Level 50 = 300) |
| MP regen per turn | +5 (passive, every turn) |
| MP regen on Defend | +15 (added to existing Defend: -50% dmg + 5% HP heal) |
| Skill 1 cost | 20 MP |
| Skill 2 cost | 30 MP |
| Basic Attack cost | 0 MP |

All classes share the same MP formula. Balance comes from skill effects, not MP pool differences.

### MP Behavior

- **Combat start:** Full MP
- **Per turn:** +5 MP passive regen (applied at end of turn, after actions)
- **Defend action:** +15 MP (on top of passive regen = +20 total on defend turns)
- **Skill usage:** Deduct MP before action executes. If insufficient, skill button is disabled.
- **Between encounters:** MP carries over within a dungeon run (stored in `DungeonRunState.mp`)
- **Run start:** Full MP (reset each new `/dungeon` run)

### Combat UI Changes

- Combat embed adds MP line: `MP: **45**/100`
- Skill buttons disabled when MP < cost (with grayed out style)
- Defend button shows MP recovery hint in embed after use: "Recovered **20** MP"

### Config Constants (add to `rpg.config.ts`)

```typescript
export const MP_BASE = 50;
export const MP_PER_LEVEL = 5;
export const MP_REGEN_PER_TURN = 5;
export const MP_REGEN_ON_DEFEND = 15;
export const SKILL1_MP_COST = 20;
export const SKILL2_MP_COST = 30;
```

### State Changes

**`CombatantState`** (in `combat.service.ts`):
```typescript
interface CombatantState {
    hp: number;
    maxHp: number;
    mp: number;      // NEW
    maxMp: number;   // NEW
    stats: StatBlock;
    statusEffects: StatusEffect[];
}
```

**`DungeonRunState`** (in `dungeon.service.ts`):
```typescript
interface DungeonRunState {
    // ... existing fields ...
    mp: number;      // NEW — persists across encounters
    maxMp: number;   // NEW
}
```

**`CombatActionResult`** (in `combat.service.ts`):
```typescript
interface CombatActionResult {
    // ... existing fields ...
    mpCost: number;       // NEW — MP spent this action
    mpRegen: number;      // NEW — MP recovered this turn
    currentMp: number;    // NEW — MP after action
    insufficientMp: boolean; // NEW — action failed due to no MP
}
```

### Combat Logic Changes

In `CombatService.executeAction()`:
1. **Before skill execution:** Check `state.user.mp >= cost`. If insufficient, return `{ insufficientMp: true, ... }` without executing.
2. **On skill use:** `state.user.mp -= cost`
3. **End of every turn (including attack/defend):** `state.user.mp = Math.min(state.user.maxMp, state.user.mp + MP_REGEN_PER_TURN)`
4. **On defend:** Additional `state.user.mp += MP_REGEN_ON_DEFEND` (before the passive regen)

### `initCombat` Changes

```typescript
function initCombat(..., userMp: number, maxMp: number, ...): RpgCombatState {
    return {
        ...existing,
        user: {
            hp: userHp,
            maxHp,
            mp: userMp,    // from DungeonRunState.mp
            maxMp,
            stats: { ...userStats },
            statusEffects: [],
        },
        // monster has no MP
    };
}
```

## 2. Material System

### 6 Tiered Materials

| Material | Key | Emoji | Min Floor | Drop Chance | Drop Qty |
|----------|-----|-------|-----------|-------------|----------|
| Common Shard | `common_shard` | ⬜ | 1 | 60% | 2-4 |
| Uncommon Fragment | `uncommon_fragment` | 🟩 | 3 | 35% | 1-3 |
| Rare Essence | `rare_essence` | 🟦 | 6 | 20% | 1-2 |
| Epic Core | `epic_core` | 🟪 | 10 | 10% | 1 |
| Legendary Soul | `legendary_soul` | 🟨 | 15 | 5% | 1 |
| Mythic Heart | `mythic_heart` | 🟥 | 20 | 2% | 1 |

### Drop Logic

Each encounter can drop **multiple materials**. Roll each tier independently from highest to lowest:

```
for each material tier (high → low):
    if currentFloor >= material.minFloor:
        if random() < material.dropChance:
            add random(material.minQty, material.maxQty) to drops
```

### Drop Sources

| Source | Material drop | Special rules |
|--------|---------------|---------------|
| Monster win | 30% chance to trigger material rolls | Normal tier rolls |
| Treasure chest | Always trigger material rolls | Always drops at least 1 material (if no rolls pass, give 1 Common Shard) |
| Boss win | Always trigger material rolls | Guaranteed 1 Rare+ material (reroll if all < Rare). Plus normal tier rolls on top. |
| Trap | No materials | — |

### Storage

Uses existing `CharacterModel.materials: Map<string, number>`. Already in schema from Phase 1A.

### Config (add to `rpg.config.ts`)

```typescript
export interface MaterialDef {
    key: string;
    emoji: string;
    minFloor: number;
    dropChance: number;
    minQty: number;
    maxQty: number;
}

export const MATERIALS: MaterialDef[] = [
    { key: "mythic_heart", emoji: "🟥", minFloor: 20, dropChance: 0.02, minQty: 1, maxQty: 1 },
    { key: "legendary_soul", emoji: "🟨", minFloor: 15, dropChance: 0.05, minQty: 1, maxQty: 1 },
    { key: "epic_core", emoji: "🟪", minFloor: 10, dropChance: 0.10, minQty: 1, maxQty: 1 },
    { key: "rare_essence", emoji: "🟦", minFloor: 6, dropChance: 0.20, minQty: 1, maxQty: 2 },
    { key: "uncommon_fragment", emoji: "🟩", minFloor: 3, dropChance: 0.35, minQty: 1, maxQty: 3 },
    { key: "common_shard", emoji: "⬜", minFloor: 1, dropChance: 0.60, minQty: 2, maxQty: 4 },
];
```

Note: Array ordered high → low for the roll-from-top algorithm.

### Service Functions

**`equipment.service.ts`** — add:
```typescript
function rollMaterialDrops(floor: number, source: "monster" | "treasure" | "boss"): { key: string; qty: number }[]
```

**`character.service.ts`** — add:
```typescript
async function addMaterials(userId: string, materials: { key: string; qty: number }[]): Promise<void>
```
Uses atomic `$inc` on the materials map fields.

## 3. Equipment Drop Tables (Class-weighted)

### Slot Selection: 70% Class Priority / 30% Random

When equipment drops, slot is chosen by:
1. Roll: 70% → class priority table, 30% → uniform random all 6 slots
2. If class priority: weighted random from 3 priority slots

### Class Priority Slots

| Class | Slot 1 (40%) | Slot 2 (35%) | Slot 3 (25%) |
|-------|-------------|-------------|-------------|
| Swordsman | weapon | armor | shield |
| Tank | shield | armor | helmet |
| Mage | weapon | accessory | shield |
| Archer | weapon | boots | accessory |
| Assassin | weapon | boots | accessory |
| Healer | weapon | shield | helmet |

### Source-based Rarity

| Source | Rarity logic |
|--------|-------------|
| Monster | Normal `rollRarity(floor)` |
| Treasure | Shifted: `rollRarity(floor + 5)` (~1 tier higher) |
| Boss | Minimum Rare: reroll if result < Rare |

### Boss Equipment

- Drop chance: 100% (guaranteed from `DUNGEON_REWARDS.boss.equipChance = 0.5` → change to 1.0 for boss)
- Slot: 100% from class priority table (no 30% random)
- Rarity: minimum Rare

### Config (add to `rpg.config.ts`)

```typescript
export const CLASS_PRIORITY_SLOTS: Record<ClassType, [EquipmentSlot, EquipmentSlot, EquipmentSlot]> = {
    swordsman: ["weapon", "armor", "shield"],
    tank: ["shield", "armor", "helmet"],
    mage: ["weapon", "accessory", "shield"],
    archer: ["weapon", "boots", "accessory"],
    assassin: ["weapon", "boots", "accessory"],
    healer: ["weapon", "shield", "helmet"],
};

export const CLASS_PRIORITY_WEIGHTS = [0.4, 0.35, 0.25] as const;
export const CLASS_MATCH_CHANCE = 0.7;
```

### Equipment Service Changes

Refactor `createEquipmentDrop` to accept `source` parameter:

```typescript
async function createEquipmentDrop(
    ownerId: string,
    floor: number,
    classType: ClassType,
    source: "monster" | "treasure" | "boss"
): Promise<IEquipment>
```

Internal helpers:
- `rollSlotForClass(classType, source)` — applies 70/30 class-weight logic (100% class for boss)
- `rollRarityForSource(floor, source)` — applies rarity shift for treasure, minimum for boss

## i18n Keys (new)

| Key | EN | Purpose |
|-----|-----|---------|
| `dungeon.combat.mp` | `MP: **{{mp}}**/{{maxMp}}` | MP display in combat embed |
| `dungeon.combat.mp_recover` | `Recovered **{{amount}}** MP` | MP recovery on defend |
| `dungeon.combat.mp_cost` | `(-{{cost}} MP)` | MP cost display after skill use |
| `dungeon.combat.insufficient_mp` | `Not enough MP for this skill!` | Ephemeral when skill button clicked with low MP |
| `rpg.material.common_shard` | `Common Shard` | Material name |
| `rpg.material.uncommon_fragment` | `Uncommon Fragment` | Material name |
| `rpg.material.rare_essence` | `Rare Essence` | Material name |
| `rpg.material.epic_core` | `Epic Core` | Material name |
| `rpg.material.legendary_soul` | `Legendary Soul` | Material name |
| `rpg.material.mythic_heart` | `Mythic Heart` | Material name |

## Files Changed

### Modified Files

| File | Changes |
|------|---------|
| `src/services/rpg/rpg.config.ts` | Add MP constants, `MATERIALS` array, `CLASS_PRIORITY_SLOTS`, `CLASS_PRIORITY_WEIGHTS`, `CLASS_MATCH_CHANCE` |
| `src/services/rpg/combat.service.ts` | Add `mp`/`maxMp` to `CombatantState`, MP deduct on skills, MP regen per turn + defend, `insufficientMp` result, accept `userMp`/`maxMp` in `initCombat` |
| `src/services/rpg/equipment.service.ts` | Add `rollMaterialDrops()`, refactor `createEquipmentDrop` with `source` param, add `rollSlotForClass()`, `rollRarityForSource()` |
| `src/services/rpg/character.service.ts` | Add `addMaterials()`, add `getMaxMp()` helper |
| `src/services/economy/dungeon.service.ts` | Pass `source` to equipment drops, add material drops to resolve functions, add `mp`/`maxMp` to `DungeonRunState`, update `startRun` to init MP |
| `src/commands/slash/dungeon.ts` | MP display in combat embed, disable skill buttons when low MP, material drops in embeds, pass MP to `initCombat` |
| `src/buttons/dungeonAttack.button.ts` | MP display, material drops in win embed |
| `src/buttons/dungeonSkill1.button.ts` | MP check before action, MP cost display |
| `src/buttons/dungeonSkill2.button.ts` | MP check before action, MP cost display |
| `src/buttons/dungeonDefend.button.ts` | MP recovery display |
| `src/buttons/dungeonContinue.button.ts` | Material drops in treasure embed, MP carry-over between encounters |
| `src/locales/*.json` (15 files) | Add MP + material i18n keys |

### No New Files

All changes are modifications to existing files. Material storage uses the existing `CharacterModel.materials` map.

## Edge Cases

| Scenario | Handling |
|----------|----------|
| MP = 0, both skills disabled | User can only Attack, Defend, or Run. Defend recovers MP for next turn. |
| MP exactly = skill cost | Skill executes, MP drops to 0 (or near 0 after regen) |
| Floor 1 player, material drop | Only Common Shard can drop (minFloor = 1). Others require deeper floors. |
| Treasure chest, no material rolls pass | Fallback: give 1 Common Shard (treasure always drops at least 1) |
| Boss at floor 5, material drop | Guaranteed Rare+ material. But Rare Essence minFloor = 6. Since boss is floor 5, give Uncommon Fragment as "Rare minimum" since Rare hasn't unlocked yet. Logic: clamp to highest available tier at current floor. |
| `createEquipmentDrop` source param backward compat | Old callers (if any) that don't pass `source` default to `"monster"` |
