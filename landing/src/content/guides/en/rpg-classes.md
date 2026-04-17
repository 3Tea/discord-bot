---
title: "RPG Classes"
description: "Complete guide to all 6 base classes, 12 advanced specializations, skills, and stats"
icon: "🎭"
order: 19
relatedCommands: ["adventure"]
---

## Overview

Your class determines your stats, skills, and combat role. There are **6 base classes** available at character creation and **12 advanced classes** (2 per base) unlocked at level 20.

## Base Classes

### Stats Overview

| Class | HP | STR | DEF | MAG | MAG_DEF | SPD | Primary |
|-------|-----|-----|-----|-----|---------|-----|---------|
| ⚔️ Swordsman | 120 | 25 | 20 | 5 | 10 | 12 | STR |
| 🛡️ Tank | 180 | 15 | 30 | 5 | 15 | 8 | STR |
| 🔮 Mage | 80 | 5 | 8 | 30 | 20 | 10 | MAG |
| 🏹 Archer | 90 | 20 | 12 | 5 | 10 | 18 | STR |
| 🗡️ Assassin | 85 | 22 | 10 | 8 | 12 | 25 | STR |
| 💚 Healer | 100 | 8 | 15 | 25 | 22 | 10 | MAG |

### Growth Rates (per level)

| Class | HP | STR | DEF | MAG | MAG_DEF | SPD |
|-------|-----|-----|-----|-----|---------|-----|
| ⚔️ Swordsman | +12 | +4 | +3 | +1 | +1 | +2 |
| 🛡️ Tank | +18 | +2 | +5 | +1 | +2 | +1 |
| 🔮 Mage | +8 | +1 | +1 | +5 | +3 | +1 |
| 🏹 Archer | +9 | +3 | +2 | +1 | +1 | +3 |
| 🗡️ Assassin | +8 | +4 | +1 | +1 | +2 | +4 |
| 💚 Healer | +10 | +1 | +2 | +4 | +3 | +1 |

## Class Roles and Playstyles

### ⚔️ Swordsman — Balanced Melee

The all-rounder. Good stats across the board with strong physical skills. Excellent for players who want a straightforward experience without worrying about weaknesses.

**Skills:**

| Skill | Emoji | MP Cost | Type | Effect |
|-------|-------|---------|------|--------|
| Power Strike | ⚡ | 20 | Physical | 1.8x damage multiplier |
| Whirlwind | 🌀 | 30 | Physical | 1.3x damage, ignores 30% DEF |

### 🛡️ Tank — Defender

The wall. Highest HP and DEF in the game, but slowest. Perfect for players who want to outlast enemies rather than burst them down.

**Skills:**

| Skill | Emoji | MP Cost | Type | Effect |
|-------|-------|---------|------|--------|
| Shield Bash | 🔨 | 20 | Physical | 1.4x damage + self DEF buff (20%, 2 turns) |
| Fortify | 🏰 | 30 | Heal | Heal 20% max HP + self DEF buff (40%, 1 turn) |

### 🔮 Mage — Burst Magic

The glass cannon. Highest magic damage but lowest HP and DEF. Ideal for players who want to end fights quickly with devastating spells.

**Skills:**

| Skill | Emoji | MP Cost | Type | Effect |
|-------|-------|---------|------|--------|
| Fireball | 🔥 | 20 | Magical | 2.0x damage multiplier |
| Ice Shard | ❄️ | 30 | Magical | 1.5x damage + SPD debuff on enemy (30%, 2 turns) |

### 🏹 Archer — Fast Ranged

The precision fighter. High speed means you attack first, and armor-piercing skills ignore enemy defenses. Great for taking down armored enemies.

**Skills:**

| Skill | Emoji | MP Cost | Type | Effect |
|-------|-------|---------|------|--------|
| Precision Shot | 🎯 | 20 | Physical | 1.8x damage, ignores 50% DEF |
| Quick Shot | 💨 | 30 | Physical | 1.2x damage, hits 2 times |

### 🗡️ Assassin — Crit & Speed

The critical hit specialist. Fastest class with the highest burst potential. High risk, high reward — low HP but can one-shot with critical strikes.

**Skills:**

| Skill | Emoji | MP Cost | Type | Effect |
|-------|-------|---------|------|--------|
| Backstab | 🗡️ | 20 | Physical | 2.2x damage, 30% crit chance (3x crit multiplier) |
| Poison Blade | 💀 | 30 | Physical | 1.0x damage + poison on enemy (10% HP/turn, 3 turns) |

### 💚 Healer — Support

The survivor. Balanced magic stats with self-healing. Not the fastest killer, but extremely hard to take down. Best for cautious players who want to push deep in dungeons.

**Skills:**

| Skill | Emoji | MP Cost | Type | Effect |
|-------|-------|---------|------|--------|
| Holy Light | ✨ | 20 | Magical | 1.6x damage multiplier |
| Heal | 💚 | 30 | Heal | Restore 30% of max HP |

## Advanced Classes

At **level 20**, you can advance into a specialization. Each base class has two paths: **offensive** and **defensive**.

### Requirements

To advance, you need:
- Character level **20**
- **5x Epic Core** + **10x Rare Essence** (materials)
- **3,000 Gold**

Use `/adventure advance` to choose your path.

### Advanced Class Table

| Base Class | Offensive Path | Defensive Path |
|------------|---------------|----------------|
| ⚔️ Swordsman | Berserker ⚔️ | Knight 🛡️ |
| 🛡️ Tank | Fortress 🏰 | Paladin ✨ |
| 🔮 Mage | Warlock 😈 | Archmage 🔮 |
| 🏹 Archer | Sniper 🎯 | Ranger 🌿 |
| 🗡️ Assassin | Phantom 👻 | Shadow 🌑 |
| 💚 Healer | Druid 🌱 | Priest 🙏 |

### Stat Bonuses

Advanced classes gain percentage-based stat bonuses (applied on top of your current stats):

| Class | Stat Bonuses |
|-------|-------------|
| Berserker | STR +20%, HP -10% |
| Knight | DEF +15%, STR +5% |
| Fortress | DEF +25%, SPD -15% |
| Paladin | HP +20%, MAG_DEF +15% |
| Warlock | MAG +25%, HP -15% |
| Archmage | MAG +10%, MAG_DEF +20% |
| Sniper | STR +15%, SPD +10%, DEF -15% |
| Ranger | SPD +20%, DEF +10% |
| Phantom | STR +20%, SPD +10%, HP -20% |
| Shadow | SPD +15%, MAG +10% |
| Druid | MAG +15%, HP +10% |
| Priest | HP +15%, MAG +10%, MAG_DEF +15% |

### Ultimate Skills

Every advanced class unlocks a powerful **Ultimate** ability (50 MP cost, usable once per combat encounter):

| Class | Ultimate | Emoji | Type | Effect |
|-------|----------|-------|------|--------|
| Berserker | Blood Frenzy | 🩸 | Physical | 3.0x damage |
| Knight | Guardian's Oath | ⚔️ | Physical | 1.5x damage + DEF buff (100%, 3 turns) |
| Fortress | Stone Wall | 🪨 | Buff | Defensive buff |
| Paladin | Divine Shield | ✨ | Heal | Restore 50% max HP |
| Warlock | Soul Burn | 💀 | Magical | 4.0x damage |
| Archmage | Arcane Barrier | 🌟 | Magical | 2.5x damage + DEF buff (100%, 2 turns) |
| Sniper | Headshot | 💥 | Physical | 5.0x damage |
| Ranger | Arrow Rain | 🏹 | Physical | 1.0x damage, hits 5 times |
| Phantom | Shadow Strike | 🌀 | Physical | 3.5x damage, ignores 100% DEF |
| Shadow | Toxic Cloud | ☠️ | Physical | Poison (20% HP/turn, 4 turns) |
| Druid | Nature's Wrath | 🌿 | Magical | 2.5x damage + heal 25% HP + poison (10%, 3 turns) |
| Priest | Resurrection | 💫 | Buff | Auto-revive when HP reaches 0 |

## Which Class Should I Choose?

### For Beginners

**Swordsman** or **Tank** — both are forgiving with strong base stats. Swordsman deals more damage while Tank survives longer. You can't go wrong with either.

### For Damage Dealers

**Mage** for consistent high magic damage, **Assassin** for critical hit spikes. Mage is safer because magic ignores physical DEF; Assassin is riskier but can one-shot bosses with crits.

### For Survivability

**Healer** is the tankiest class in the long run — self-healing plus decent magic damage means you'll rarely die. **Tank** is pure defense but lacks self-sustain.

### For Speed

**Assassin** and **Archer** are the fastest. Speed determines turn order in PvP and helps you act before enemies in dungeons. Archer has more consistent damage while Assassin has burst potential.

### For PvP

**Assassin** (Phantom path) for burst kills, **Mage** (Warlock path) for the highest single-hit damage, or **Healer** (Priest path) for the Resurrection ultimate that gives you a second life in PvP.

## Commands Reference

| Command | Description |
|---------|-------------|
| `/adventure create` | Create your character and choose a class |
| `/adventure profile` | View your current stats, class, and equipment |
| `/adventure advance` | Advance to a specialized class at level 20 |
