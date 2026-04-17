---
title: "Equipment & Crafting"
description: "Master the equipment system — slots, rarities, crafting recipes, crates, and material farming"
icon: "🛡️"
order: 20
relatedCommands: ["adventure", "dungeon"]
---

## Overview

Equipment is the primary way to power up your RPG character. Each piece of gear provides stat bonuses that add to your base stats. Better equipment makes a bigger difference than leveling up alone — a well-geared character at level 15 can outperform a poorly-geared character at level 25.

## Equipment Slots

Your character has **6 equipment slots**:

| Slot | Primary Stats | Notes |
|------|--------------|-------|
| Weapon | STR or MAG | Class-restricted (each class has unique weapon types) |
| Shield | DEF, MAG_DEF | Class-restricted (Assassins cannot equip shields) |
| Helmet | DEF, MAG_DEF | Universal |
| Armor | DEF, HP | Universal |
| Boots | SPD, DEF | Universal |
| Accessory | Various | Universal |

### Class Weapon Types

| Class | Weapon Types |
|-------|-------------|
| Swordsman | Sword, Greatsword |
| Tank | Mace, Hammer |
| Mage | Staff, Wand |
| Archer | Bow, Crossbow |
| Assassin | Dagger, Katana |
| Healer | Staff, Scepter |

### Class Shield Types

| Class | Shield Types |
|-------|-------------|
| Swordsman | Shield |
| Tank | Heavy Shield |
| Mage | Magic Tome |
| Archer | Quiver |
| Assassin | (none) |
| Healer | Holy Tome |

## Rarity Tiers

Equipment comes in **6 rarity tiers**, each with a stat multiplier applied to the item's base stats:

| Rarity | Emoji | Color | Stat Multiplier | Drop Weight |
|--------|-------|-------|----------------|-------------|
| Common | ⬜ | Gray | 1.0x | 45% |
| Uncommon | 🟩 | Green | 1.3x | 25% |
| Rare | 🟦 | Blue | 1.6x | 15% |
| Epic | 🟪 | Purple | 2.0x | 10% |
| Legendary | 🟨 | Gold | 2.5x | 4% |
| Mythic | 🟥 | Red | 3.2x | 1% |

> **Tip:** The stat multiplier is huge at higher tiers. A Mythic weapon has 3.2x the stats of a Common one. Even a single rarity upgrade is worth the investment.

## How to Get Equipment

### Dungeon Drops

Monsters and treasure encounters in the dungeon can drop equipment:

| Source | Drop Chance | Notes |
|--------|------------|-------|
| Monster kill | 10% | Standard encounter |
| Treasure chest | 15% | No combat needed |
| Boss kill | 50% | Every 5 floors, much higher chance |

Equipment rarity from drops follows the standard drop weight table — most drops will be Common/Uncommon. Boss encounters are the best source of rare gear.

### Class-Weighted Drops

Equipment drops are **weighted toward your class**. There is a 70% chance the drop matches your class, and the slot is weighted based on your class priority:

| Class | Priority Slots (40% / 35% / 25%) |
|-------|----------------------------------|
| Swordsman | Weapon, Armor, Shield |
| Tank | Shield, Armor, Helmet |
| Mage | Weapon, Accessory, Shield |
| Archer | Weapon, Boots, Accessory |
| Assassin | Weapon, Boots, Accessory |
| Healer | Weapon, Shield, Helmet |

### Crafting

Use `/adventure craft` to create equipment from materials and Gold. See the crafting section below.

### Crates

Use `/adventure crate` to open crates for random equipment. Crates can be purchased from the shop or earned as dungeon rewards.

## Crafting Recipes

Craft equipment by rarity using materials collected from dungeon runs:

| Target Rarity | Materials Required | Gold Cost |
|---------------|-------------------|-----------|
| ⬜ Common | 5x Common Shard | 50 |
| 🟩 Uncommon | 3x Uncommon Fragment + 5x Common Shard | 150 |
| 🟦 Rare | 3x Rare Essence + 5x Uncommon Fragment | 500 |
| 🟪 Epic | 3x Epic Core + 5x Rare Essence | 1,500 |
| 🟨 Legendary | 3x Legendary Soul + 5x Epic Core | 5,000 |
| 🟥 Mythic | 3x Mythic Heart + 5x Legendary Soul | 15,000 |

Crafted equipment is class-appropriate and slot-weighted just like dungeon drops.

## Materials

Six tiers of crafting materials, each dropping from different dungeon depth:

| Material | Emoji | Min Floor | Drop Chance | Quantity |
|----------|-------|-----------|-------------|----------|
| Common Shard | ⬜ | Floor 1 | 60% | 2–4 |
| Uncommon Fragment | 🟩 | Floor 3 | 35% | 1–3 |
| Rare Essence | 🟦 | Floor 6 | 20% | 1–2 |
| Epic Core | 🟪 | Floor 10 | 10% | 1 |
| Legendary Soul | 🟨 | Floor 15 | 5% | 1 |
| Mythic Heart | 🟥 | Floor 20 | 2% | 1 |

Materials drop from monster kills (30% base chance) and treasure chests (50% base chance). Boss encounters guarantee material drops.

> **Tip:** If you need a specific material tier, farm dungeons at or above the minimum floor for that material. Floor 10+ runs are the sweet spot for Epic Cores.

## Crates

Three crate tiers with different rarity distributions:

### Bronze Crate 🟫 (200 Gold)

| Rarity | Chance |
|--------|--------|
| Common | 50% |
| Uncommon | 35% |
| Rare | 15% |

### Silver Crate 🥈 (800 Gold)

| Rarity | Chance |
|--------|--------|
| Uncommon | 40% |
| Rare | 35% |
| Epic | 25% |

### Gold Crate 🥇 (2,500 Gold)

| Rarity | Chance |
|--------|--------|
| Rare | 35% |
| Epic | 30% |
| Legendary | 25% |
| Mythic | 10% |

### Crate Drops from Dungeon

Crates can also drop during dungeon runs:

| Source | Bronze | Silver | Gold |
|--------|--------|--------|------|
| Monster kill | 5% | — | — |
| Treasure chest | 15% | 5% | — |
| Boss kill | — | 50% | 15% |

## Strategy Tips

### What to Craft First

1. **Weapon** — biggest damage increase, directly affects all combat
2. **Armor** — DEF + HP bonus helps you survive longer runs
3. **Boots** — SPD determines turn order, crucial for PvP and dodging

### When to Use Crates

- **Bronze crates** early game (levels 1–10) for quick upgrades
- **Silver crates** mid game (levels 10–20) when you need Epic gear for advancement
- **Gold crates** late game — the only reliable way to get Legendary/Mythic gear besides crafting

### Material Farming

- Run dungeons consistently — floor 6+ for Rare Essence, floor 10+ for Epic Core
- Boss encounters (every 5 floors) guarantee material drops and have the best equipment drop chance
- Don't waste materials on Common/Uncommon crafts once you can farm Rare+ materials

### Inventory Management

- Keep all materials — they're always needed for higher-tier crafting
- Equip your best gear immediately — there's no benefit to saving equipment
- Sell duplicate low-rarity equipment once you have better gear in that slot

## Commands Reference

| Command | Description |
|---------|-------------|
| `/adventure inventory` | View all equipment and materials |
| `/adventure equip` | Equip an item from inventory |
| `/adventure unequip` | Unequip an item to inventory |
| `/adventure craft` | Craft equipment from materials |
| `/adventure crate` | Open a crate for random equipment |
| `/adventure shop` | Buy crates with Gold |
| `/adventure profile` | View currently equipped items |
| `/dungeon` | Farm materials and equipment drops |
