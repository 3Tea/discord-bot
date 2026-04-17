---
title: Adventure
command: adventure
category: rpg
description: RPG adventure — manage your character, equipment, stats, crafting, and crates.
---

## Overview

The `/adventure` command is your gateway to the RPG system. Create a character, choose a class, manage equipment, craft gear, and open crates.

## Subcommands

| Subcommand | Description | Example |
|------------|-------------|---------|
| `create` | Choose a class and create your character | `/adventure create` |
| `profile` | View stats, level, Gold, equipment | `/adventure profile` |
| `equip <item>` | Equip an item by name | `/adventure equip Iron Sword` |
| `unequip <slot>` | Remove equipment from a slot | `/adventure unequip weapon` |
| `inventory` | Browse your equipment and materials | `/adventure inventory` |
| `craft` | Craft equipment from materials + Gold | `/adventure craft` |
| `crate` | Open crates earned from dungeons | `/adventure crate` |
| `shop` | Buy crates with Gold | `/adventure shop` |
| `advance` | Evolve to an advanced class (level 20+) | `/adventure advance` |

## Character Creation

Use `/adventure create` to begin. Choose from 6 classes:

| Class | Role | Primary Stats |
|-------|------|--------------|
| Swordsman | Balanced melee | STR, DEF |
| Tank | High HP defender | HP, DEF |
| Mage | Burst magic damage | MAG, MAG_DEF |
| Archer | Fast ranged | STR, SPD |
| Assassin | Crit and speed | STR, SPD |
| Healer | Support and sustain | MAG, HP |

> **This choice is permanent!** Choose carefully based on your playstyle.

## Equipment

6 equipment slots: Weapon, Shield, Helmet, Armor, Boots, Accessory. 6 rarity tiers from Common to Mythic. Get equipment from dungeon drops, crafting, or crate opening.

| Rarity | Color |
|--------|-------|
| Common | White |
| Uncommon | Green |
| Rare | Blue |
| Epic | Purple |
| Legendary | Orange |
| Mythic | Red |

## Crafting

`/adventure craft` lets you turn materials + Gold into guaranteed-rarity equipment. Higher rarity requires more materials and Gold. Materials are earned from dungeon encounters.

## Crates

Three crate tiers: Bronze, Silver, Gold. Earned from dungeon encounters or bought at `/adventure shop`. Each contains a random equipment piece matching your class.

## Class Advancement

At level 20, use `/adventure advance` to evolve into one of two advanced class paths. Advanced classes receive bonus stats and unlock a powerful ultimate skill for use in dungeons and PvP.

> **Tip:** Focus on leveling through dungeons and equipping the best gear you can find. Crafting is a reliable way to target specific rarity tiers when RNG isn't in your favor.
