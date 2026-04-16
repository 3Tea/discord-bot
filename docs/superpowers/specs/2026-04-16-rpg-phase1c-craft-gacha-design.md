# RPG Phase 1C: Craft & Gacha Design

**Date:** 2026-04-16
**Status:** Approved

## Overview

Phase 1C adds three features: a crafting system (`/adventure craft`), gacha crate opening (`/adventure crate`), and an equipment shop (`/adventure shop`). Materials from Phase 1B are consumed here. Crates drop from dungeon encounters and can also be purchased with Gold.

## 1. Craft System

### Command: `/adventure craft`

User selects equipment slot + rarity to craft. Materials + Gold are consumed. Equipment is generated with guaranteed rarity, class-weighted stats.

### UX Flow

```
/adventure craft
→ Select menu: choose slot (Weapon/Shield/Helmet/Armor/Boots/Accessory)
→ Select menu: choose rarity (only show rarities user has enough materials for)
→ Confirm embed: "Craft Rare Weapon? Cost: 3 Rare Essence + 5 Uncommon Fragment + 500 Gold"
→ Confirm/Cancel buttons (30s timeout)
→ On confirm: deduct materials + Gold → generate equipment → show result with stats
```

### Recipe Table

Each recipe requires materials of the target rarity tier + materials from one tier below + Gold.

| Rarity | Primary material | Qty | Secondary material | Qty | Gold cost |
|--------|-----------------|-----|-------------------|-----|-----------|
| Common | Common Shard | 5 | — | — | 50 |
| Uncommon | Uncommon Fragment | 3 | Common Shard | 5 | 150 |
| Rare | Rare Essence | 3 | Uncommon Fragment | 5 | 500 |
| Epic | Epic Core | 3 | Rare Essence | 5 | 1,500 |
| Legendary | Legendary Soul | 3 | Epic Core | 5 | 5,000 |
| Mythic | Mythic Heart | 3 | Legendary Soul | 5 | 15,000 |

### Craft Config (add to `rpg.config.ts`)

```typescript
export interface CraftRecipe {
    rarity: Rarity;
    materials: { key: string; qty: number }[];
    goldCost: number;
}

export const CRAFT_RECIPES: CraftRecipe[] = [
    { rarity: "common", materials: [{ key: "common_shard", qty: 5 }], goldCost: 50 },
    { rarity: "uncommon", materials: [{ key: "uncommon_fragment", qty: 3 }, { key: "common_shard", qty: 5 }], goldCost: 150 },
    { rarity: "rare", materials: [{ key: "rare_essence", qty: 3 }, { key: "uncommon_fragment", qty: 5 }], goldCost: 500 },
    { rarity: "epic", materials: [{ key: "epic_core", qty: 3 }, { key: "rare_essence", qty: 5 }], goldCost: 1500 },
    { rarity: "legendary", materials: [{ key: "legendary_soul", qty: 3 }, { key: "epic_core", qty: 5 }], goldCost: 5000 },
    { rarity: "mythic", materials: [{ key: "mythic_heart", qty: 3 }, { key: "legendary_soul", qty: 5 }], goldCost: 15000 },
];
```

### Equipment Generation on Craft

Reuses `EquipmentService.createEquipmentDrop(userId, floor, classType, source)` with a new source `"craft"`:
- Slot: user-selected (not random)
- Rarity: guaranteed (user-selected)
- Stats: generated via `generateEquipmentStats(slot, rarity, characterLevel)` — uses character level as "floor" for stat scaling
- Class-weighted: weapon/shield types match user's class

### Material Deduction

Uses `CharacterService.deductMaterials(userId, materials)` — new function. Atomic `$inc` with negative values. Validates all materials available before deducting (check-then-act with `findOne` + verify + `updateOne`).

### Error Cases

| Scenario | Response |
|----------|----------|
| Insufficient materials | Embed: "Not enough materials" with what's missing |
| Insufficient Gold | Embed: "Not enough Gold" with current balance |
| No character | Standard "Create character first" gate |

## 2. Gacha Crate System

### 3 Crate Tiers

| Crate | Key | Emoji | Rarity range | Gold cost (shop) |
|-------|-----|-------|-------------|-----------------|
| Bronze Crate | `bronze_crate` | 🟫 | Common — Rare | 200 |
| Silver Crate | `silver_crate` | 🥈 | Uncommon — Epic | 800 |
| Gold Crate | `gold_crate` | 🥇 | Rare — Mythic | 2,500 |

### Crate Rarity Distribution

**Bronze Crate:**
| Rarity | Chance |
|--------|--------|
| Common | 50% |
| Uncommon | 35% |
| Rare | 15% |

**Silver Crate:**
| Rarity | Chance |
|--------|--------|
| Uncommon | 40% |
| Rare | 35% |
| Epic | 25% |

**Gold Crate:**
| Rarity | Chance |
|--------|--------|
| Rare | 35% |
| Epic | 30% |
| Legendary | 25% |
| Mythic | 10% |

### Crate Storage

Crates stored on `CharacterModel` as a simple object:

```typescript
// Add to ICharacter interface
crates: {
    bronze: number;
    silver: number;
    gold: number;
};
```

Default: `{ bronze: 0, silver: 0, gold: 0 }`.

### Crate Drop from Dungeon

| Source | Bronze | Silver | Gold |
|--------|--------|--------|------|
| Monster win | 5% | — | — |
| Treasure chest | 15% | 5% | — |
| Boss win | — | 50% | 15% |

Crate drops are independent of equipment/material drops (can get both in same encounter).

### Command: `/adventure crate`

```
/adventure crate
→ Embed: "Your Crates: 🟫 ×3 | 🥈 ×1 | 🥇 ×0"
→ Select menu: choose crate to open (disabled if 0)
→ Opening embed with rarity reveal color
→ Result: "🟦 Rare Crystal Staff (MAG +12, SPD +3)" — added to inventory
```

### Crate Config (add to `rpg.config.ts`)

```typescript
export type CrateType = "bronze" | "silver" | "gold";

export interface CrateDef {
    key: CrateType;
    emoji: string;
    shopCost: number;
    rarityWeights: Partial<Record<Rarity, number>>;
}

export const CRATES: Record<CrateType, CrateDef> = {
    bronze: {
        key: "bronze",
        emoji: "🟫",
        shopCost: 200,
        rarityWeights: { common: 50, uncommon: 35, rare: 15 },
    },
    silver: {
        key: "silver",
        emoji: "🥈",
        shopCost: 800,
        rarityWeights: { uncommon: 40, rare: 35, epic: 25 },
    },
    gold: {
        key: "gold",
        emoji: "🥇",
        shopCost: 2500,
        rarityWeights: { rare: 35, epic: 30, legendary: 25, mythic: 10 },
    },
};

export const CRATE_DROP_RATES = {
    monster: { bronze: 0.05 },
    treasure: { bronze: 0.15, silver: 0.05 },
    boss: { silver: 0.50, gold: 0.15 },
} as const;
```

## 3. Equipment Shop

### Command: `/adventure shop`

```
/adventure shop
→ Embed: "Equipment Crate Shop" with 3 crates + prices
→ Buttons: [🟫 Bronze 200🪙] [🥈 Silver 800🪙] [🥇 Gold 2500🪙]
→ On buy: deduct Gold → generate equipment from crate rarity table → show result
→ Equipment added to inventory immediately
```

Shop buys = instant open. No crate stored in inventory. This is different from `/adventure crate` which opens stored crates.

### Disabled Buttons

Buttons disabled when user Gold < crate cost.

## Data Model Changes

### `CharacterModel` — add `crates` field

```typescript
// Add to schema
crates: {
    bronze: { type: Number, default: 0, min: 0 },
    silver: { type: Number, default: 0, min: 0 },
    gold: { type: Number, default: 0, min: 0 },
},
```

Add to `ICharacter` interface:
```typescript
crates: {
    bronze: number;
    silver: number;
    gold: number;
};
```

## Service Changes

### `character.service.ts` — new functions

```typescript
// Deduct materials (for craft)
async function deductMaterials(userId: string, materials: { key: string; qty: number }[]): Promise<void>

// Check if user has enough materials
async function hasEnoughMaterials(userId: string, materials: { key: string; qty: number }[]): Promise<boolean>

// Add crates
async function addCrate(userId: string, crateType: CrateType, qty?: number): Promise<void>

// Deduct crate
async function deductCrate(userId: string, crateType: CrateType): Promise<boolean>
```

### `equipment.service.ts` — new functions

```typescript
// Generate equipment from crate (uses crate rarity distribution)
async function openCrate(ownerId: string, crateType: CrateType, classType: ClassType, level: number): Promise<IEquipment>

// Generate equipment for craft (guaranteed slot + rarity)
async function craftEquipment(ownerId: string, slot: EquipmentSlot, rarity: Rarity, classType: ClassType, level: number): Promise<IEquipment>
```

### `dungeon.service.ts` — add crate drops

In `resolveCombatWin`, `resolveTreasure`: after material/equipment drops, roll for crate drops using `CRATE_DROP_RATES`. Call `CharacterService.addCrate()` if dropped.

Update `CombatResolveResult` and `TreasureResult` to include:
```typescript
crateDrops: { type: CrateType; qty: number }[];
```

## Command Changes

### `/adventure` — add 3 new subcommands

| Subcommand | Description |
|------------|-------------|
| `/adventure craft` | Craft equipment from materials |
| `/adventure crate` | Open crates from inventory |
| `/adventure shop` | Buy crates with Gold |

### `/adventure profile` — show crates

Add crate counts to profile embed:
```
Crates: 🟫 ×3 | 🥈 ×1 | 🥇 ×0
```

### `/adventure inventory` — show materials

Add materials section before equipment list:
```
Materials: ⬜ Common Shard ×15 | 🟩 Uncommon Fragment ×8 | 🟦 Rare Essence ×3
```

## Dungeon Changes

### Button handlers — show crate drops

When a crate drops in dungeon, add to the reward embed:
```
🟫 Bronze Crate ×1
```

Format alongside material drops and equipment drops.

## i18n Keys (new)

| Key | EN | Purpose |
|-----|-----|---------|
| `adventure.craft.title` | `Craft Equipment` | Craft flow title |
| `adventure.craft.select_slot` | `Select equipment slot to craft` | Slot selection placeholder |
| `adventure.craft.select_rarity` | `Select rarity (showing craftable only)` | Rarity selection placeholder |
| `adventure.craft.confirm` | `Craft {{rarity}} {{slot}}?\nCost: {{materials}} + {{gold}} Gold 🪙` | Confirm embed |
| `adventure.craft.success` | `Crafted: {{rarity}} **{{name}}** ({{slot}})` | Success message |
| `adventure.craft.no_materials` | `Not enough materials. You need: {{missing}}` | Error |
| `adventure.craft.no_gold` | `Not enough Gold. You have **{{balance}}**, need **{{required}}** 🪙` | Error |
| `adventure.craft.cancelled` | `Craft cancelled.` | Cancel |
| `adventure.crate.title` | `Your Crates` | Crate inventory title |
| `adventure.crate.empty` | `You don't have any crates. Earn them from dungeon or buy at `/adventure shop`.` | No crates |
| `adventure.crate.opening` | `Opening {{crate}}...` | Opening animation |
| `adventure.crate.result` | `{{rarity}} **{{name}}** ({{slot}}) — added to inventory!` | Result |
| `adventure.shop.title` | `Equipment Crate Shop` | Shop title |
| `adventure.shop.desc` | `Buy crates with Gold. Equipment is generated for your class.` | Shop desc |
| `adventure.shop.bought` | `Purchased and opened {{crate}}!` | Purchase confirm |
| `adventure.shop.no_gold` | `Not enough Gold!` | Error |
| `rpg.crate.bronze` | `Bronze Crate` | Crate name |
| `rpg.crate.silver` | `Silver Crate` | Crate name |
| `rpg.crate.gold` | `Gold Crate` | Crate name |
| `dungeon.reward.crate` | `{{emoji}} {{name}} ×{{amount}}` | Crate drop in dungeon |

## Files Changed

### New Files

None — all changes in existing files.

### Modified Files

| File | Changes |
|------|---------|
| `src/services/rpg/rpg.config.ts` | Add `CRAFT_RECIPES`, `CRATES`, `CRATE_DROP_RATES`, `CrateType`, `CrateDef`, `CraftRecipe` |
| `src/models/character.model.ts` | Add `crates` field to schema + interface |
| `src/services/rpg/character.service.ts` | Add `deductMaterials`, `hasEnoughMaterials`, `addCrate`, `deductCrate` |
| `src/services/rpg/equipment.service.ts` | Add `openCrate`, `craftEquipment` |
| `src/services/economy/dungeon.service.ts` | Add crate drops to resolve functions |
| `src/commands/slash/adventure.ts` | Add `craft`, `crate`, `shop` subcommands + update `profile`/`inventory` |
| `src/buttons/dungeonAttack.button.ts` | Show crate drops in win embed |
| `src/buttons/dungeonContinue.button.ts` | Show crate drops in treasure embed |
| `src/locales/*.json` (15 files) | Add ~20 new i18n keys |

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Craft with exactly enough materials | Deduct succeeds, equipment created |
| Craft race condition (two craft at once) | `deductMaterials` uses atomic `$inc` with negative values + `findOne` pre-check |
| Open crate with 0 count | Select menu option disabled |
| Buy crate with insufficient Gold | Button disabled + error if somehow clicked |
| Crate drops during boss that also drops equipment | Both shown in embed — independent rolls |
| Character at level 1 crafting Mythic | Allowed — equipment `requiredLevel` set to character's level. Stats scale with level. |
| Assassin crafts Shield (no shield types for assassin) | Craft generates accessory instead (fallback, same as equipment drop) |
