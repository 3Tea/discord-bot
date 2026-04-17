---
title: "RPG Getting Started"
description: "Begin your fantasy adventure — create a character, choose a class, and explore dungeons"
icon: "⚔️"
order: 18
relatedCommands: ["adventure", "dungeon", "guild"]
---

## Overview

The RPG system is a full fantasy adventure built into 3AT. Create a character, choose a class, fight monsters in stat-based dungeon combat, collect equipment, craft gear, and climb the Adventurer Guild ranks. Everything uses a separate **Gold** currency (not server coins/gems), so your RPG progress is global across all servers.

## Step 1: Create Your Character

Run `/adventure create` and pick one of the 6 base classes. Your character starts at level 1 with a starter weapon and leather armor.

> **Tip:** You cannot change your base class after creation, but at level 20 you can advance into one of two specializations. Choose based on your preferred playstyle.

## Step 2: Choose Your Class

Each class has different stats, skills, and roles in combat:

| Class | Emoji | Role | Primary Damage | Strengths |
|-------|-------|------|---------------|-----------|
| Swordsman | ⚔️ | Balanced Melee | STR | Well-rounded stats, good for beginners |
| Tank | 🛡️ | Defender | STR | Highest HP and DEF, great survivability |
| Mage | 🔮 | Burst Magic | MAG | Highest magic damage, fragile |
| Archer | 🏹 | Fast Ranged | STR | High speed, armor-piercing skills |
| Assassin | 🗡️ | Crit & Speed | STR | Fastest class, critical hit specialist |
| Healer | 💚 | Support | MAG | Self-healing, balanced defenses |

For full stat tables, skills, and advanced classes, see the [RPG Classes Guide](/en/guide/rpg-classes).

## Step 3: Explore the Dungeon

Run `/dungeon` to enter. Each run gives you up to 5 encounters — monsters, treasure, traps, and merchants. Combat is stat-based and uses your character's actual stats and equipment.

### Combat Actions

| Action | MP Cost | Effect |
|--------|---------|--------|
| ⚔️ Attack | 0 | Basic attack using your primary stat |
| Skill 1 | 20 MP | Class-specific skill (e.g., Power Strike, Fireball) |
| Skill 2 | 30 MP | Class-specific utility skill |
| 🛡️ Defend | 0 | Take 50% damage, regen +15 MP |
| 🏃 Run | 0 | Escape the encounter |
| Ultimate | 50 MP | Advanced class only, powerful once-per-fight ability |

Defeating monsters earns **Gold, EXP, materials, and equipment**. Boss encounters appear every 5 floors with 2x stats and 3x rewards.

For the full dungeon guide, see the [Dungeon Guide](/en/guide/dungeon).

## Step 4: Manage Equipment

Use `/adventure inventory` to view your gear and materials. Key equipment commands:

| Command | What It Does |
|---------|-------------|
| `/adventure equip` | Equip an item from your inventory |
| `/adventure unequip` | Unequip an item back to inventory |
| `/adventure craft` | Craft equipment using materials + Gold |
| `/adventure crate` | Open crates for random equipment |
| `/adventure shop` | Buy crates from the Gold shop |

Equipment comes in 6 rarity tiers from Common (1x stats) to Mythic (3.2x stats). Higher rarity gear drops on deeper dungeon floors. See the [Equipment & Crafting Guide](/en/guide/rpg-equipment) for full details.

## Step 5: Join the Adventurer Guild

Run `/guild register` to join. The guild gives you:

- **Daily quests** for Gold, EXP, and Guild Points (GP)
- **Rank progression** from F (Novice) to Legendary
- **Branch guild events** if your server admin sets one up

Completing quests and ranking up unlocks better rewards. See the [Adventurer Guild Guide](/en/guide/adventurer-guild).

## What's Next?

Once you're comfortable with the basics, explore these systems:

- **[RPG Classes](/en/guide/rpg-classes)** — Deep dive into all 6 base classes and 12 advanced specializations
- **[Equipment & Crafting](/en/guide/rpg-equipment)** — Crafting recipes, crate tiers, material farming
- **[Adventurer Guild](/en/guide/adventurer-guild)** — Ranks, quests, branch guilds, monthly events
- **[PvP Battles](/en/guide/pvp)** — Challenge other players to simultaneous-turn combat
- **[Dungeon](/en/guide/dungeon)** — Advanced dungeon strategy and team dungeons

## Tips for Beginners

1. **Do your daily guild quests** — they are the most consistent source of Gold and EXP
2. **Don't sell your materials** — you'll need them for crafting better gear later
3. **Upgrade your weapon first** — it has the biggest impact on combat performance
4. **Defend when low on HP** — the MP regen from defending lets you use skills next turn
5. **Save Gold for crates** — Silver and Gold crates give much better equipment than Bronze
6. **Check your profile** with `/adventure profile` to track your level, stats, and equipment

## Commands Reference

| Command | Description |
|---------|-------------|
| `/adventure create` | Create your RPG character |
| `/adventure profile` | View your character stats and equipment |
| `/adventure equip` | Equip an item |
| `/adventure unequip` | Unequip an item |
| `/adventure inventory` | View inventory and materials |
| `/adventure craft` | Craft equipment from materials |
| `/adventure crate` | Open a crate for random gear |
| `/adventure shop` | Buy crates with Gold |
| `/adventure advance` | Advance to a specialized class (level 20+) |
| `/dungeon` | Enter the dungeon |
| `/guild register` | Join the Adventurer Guild |
| `/pvp challenge` | Challenge another player |
