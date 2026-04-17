---
title: Dungeon
description: Conquer the dungeon — learn combat tactics, encounter types, merchant strategies, and floor progression.
icon: "🏰"
order: 11
relatedCommands: ["dungeon", "adventure", "guild"]
---

## Overview

The dungeon is a **multi-encounter adventure** system. Each run gives you up to 5 encounters — monsters to fight, treasure to find, traps to survive, and merchants to trade with. Your HP carries across the entire run, so every decision matters.

> **Note:** You need an RPG character to enter the dungeon. Create one with `/adventure create` if you haven't already. See the [RPG Getting Started Guide](/en/guide/rpg-getting-started) for a full walkthrough.

## Getting Started

Run `/dungeon` to enter. There's a **1-hour cooldown** between runs. Once inside, the bot shows your first encounter and you interact through **buttons** — no commands needed during a run.

## Your Run

Each run starts with your character's **full HP** (based on your class, level, and equipment) and **5 encounters**. After each encounter, you choose:

- **Continue** — Face the next encounter
- **Leave** — Exit the dungeon and keep all rewards earned so far

The run automatically ends when you use all 5 encounters, your HP hits 0, or 15 minutes pass.

## Encounter Types

| Encounter | Chance | Floor Advance? |
|-----------|--------|---------------|
| Monster | 50% | Yes (on win) |
| Treasure | 25% | Yes |
| Trap | 15% | No |
| Merchant | 10% | No |

## Combat

Combat is **stat-based** — your character's actual STR, DEF, MAG, and SPD affect damage dealt and taken. Each class plays differently in combat.

### Actions

| Action | MP Cost | Effect |
|--------|---------|--------|
| ⚔️ Attack | 0 | Basic attack using your primary damage stat (STR or MAG) |
| Skill 1 | 20 MP | Your class's first skill (e.g., Power Strike, Fireball) |
| Skill 2 | 30 MP | Your class's second skill (e.g., Whirlwind, Heal) |
| 🛡️ Defend | 0 | Take 50% damage + regenerate 15 extra MP |
| 🏃 Run | 0 | Escape the encounter (no reward, no penalty) |
| Ultimate | 50 MP | Advanced class only — powerful once-per-encounter ability |

Normal monsters give you **5 turns** to defeat them. Boss encounters give **7 turns**.

> **Tip:** Defend is essential for MP management. It costs nothing, halves incoming damage, and gives you 15 extra MP on top of the 5 MP passive regen. One Defend turn sets you up for a big skill play next turn.

### MP System

- **Base MP:** 50 + (character level x 5)
- **MP regen per turn:** 5 (passive)
- **Defend bonus:** +15 MP (total 20 when defending)
- **Skill costs:** 20 MP (Skill 1), 30 MP (Skill 2), 50 MP (Ultimate)

If you try to use a skill without enough MP, the action automatically falls back to a basic Attack.

### Damage Formulas

Damage is calculated using your character's stats vs the monster's stats:

- **Physical damage:** Based on your STR vs monster DEF, with skill multipliers and DEF-ignore percentages
- **Magical damage:** Based on your MAG vs monster MAG_DEF
- **Critical hits:** Some skills (e.g., Assassin's Backstab) have crit chance for bonus damage
- **Multi-hit:** Some skills hit multiple times (e.g., Archer's Quick Shot hits 2x)
- **Status effects:** Poison deals % max HP per turn; DEF buffs increase defense; SPD debuffs slow enemies

For full skill details per class, see the [RPG Classes Guide](/en/guide/rpg-classes).

### Combat Outcomes

| Outcome | Result |
|---------|--------|
| Monster defeated | Gold + EXP + material drops + equipment chance + crate chance |
| Your HP hits 0 | Lose 100–200 Gold, reset to checkpoint, run ends |
| Turns exhausted | Auto-escape, no reward, no penalty |
| 30s timeout | Auto-escape |

## Boss Encounters

A **boss** appears every **5 floors** (floor 5, 10, 15, 20...). Bosses have:

- **2x all stats** compared to normal monsters at the same floor
- **7 turns** to defeat (vs 5 for normal monsters)
- **3x rewards** — triple Gold, EXP, and material drops
- **Guaranteed material drop** (100% chance)
- **50% equipment drop** chance
- **50% Silver crate** + 15% Gold crate drop chance

Boss fights are the single best source of rewards in the game. Prepare by keeping your HP high and MP full before engaging.

## Treasure Chests

No combat needed — just collect:

- **Gold:** 30 base + (floor x 10)
- **EXP:** 10 base + (floor x 5)
- **Materials:** 50% chance
- **Equipment:** 15% chance
- **Crate:** 15% Bronze, 5% Silver

Floor advances by 1.

## Traps

Bad luck. You take damage and lose Gold:

- **Gold loss:** 20 base + (floor x 5)

Floor does **not** advance. If a trap drops your HP to 0, you collapse — reset to checkpoint with an additional 100–200 Gold penalty.

## NPC Merchant

The merchant offers **one service** per encounter. Pick wisely:

| Service | Cost | Effect |
|---------|------|--------|
| 🧪 Heal | 80 + floor x 5 Gold | Restore 30 + floor x 2 HP (max to full) |
| ⚔️ Buff | 100 + floor x 5 Gold | Random buff for remaining encounters |
| 💱 Exchange | 300–600 Gold | 1 gem |

### Buff Types

| Buff | Effect | Duration |
|------|--------|----------|
| Attack | Your damage x 1.3 | Rest of run |
| Defense | Monster damage x 0.7 | Rest of run |
| Luck | More treasure (35%), fewer traps (5%) | Rest of run |

> **Tip:** Luck buff is incredibly powerful — it nearly triples your treasure rate while reducing traps to almost nothing. If you can afford it, always take Luck.

## Monster Scaling

Monsters scale with both floor and your character level:

- **Monster HP:** 80 + (floor x 15) + (your level x 5)
- **Monster STR:** 10 + (floor x 4)
- **Monster DEF:** 5 + (floor x 2)
- **Monster MAG:** 8 + (floor x 3)
- **Monster MAG_DEF:** 5 + (floor x 2)
- **Monster SPD:** 8 + (floor x 2)

Higher-level characters face tougher monsters, but their stats and equipment more than compensate.

## Floor Progression & Checkpoints

Floors work exactly like `/mine`:

- Floor increases by 1 on monster wins and treasure finds
- Checkpoints auto-save at **prime floors** (2, 3, 5, 7, 11, 13...)
- On death, floor resets to your last checkpoint
- Progress saves to the database **after each floor advance**, not at run end

## Team Dungeon

The team dungeon allows **2–4 players** to explore together. All players must have RPG characters.

### How It Works

- One player initiates the team dungeon and invites others
- Monster stats scale with team size for a balanced challenge
- All team members choose actions simultaneously each turn
- Rewards are shared among all team members
- If any player's HP reaches 0, they're knocked out for the rest of the encounter

Team dungeons are great for tackling boss floors that would be too dangerous solo, and for guild members working together on cooperative quests.

## Strategy Guide

### Early Floors (1–5)

Low risk. Monsters are weak compared to most characters. Use basic Attacks to conserve MP and push floors quickly.

### Mid Floors (6–10)

Monsters start hitting harder. Use Skill 1 for faster kills and Defend when HP gets below 50%. This is where class choice matters — Healers can self-sustain, Tanks shrug off damage, and glass cannons (Mage/Assassin) need to be more careful.

### Deep Floors (11+)

Monster damage is significant. Skill rotation becomes essential:
1. Open with a big skill (Skill 1 or Ultimate if available)
2. Defend to regen MP and reduce damage
3. Follow up with another skill
4. Leave when HP is dangerously low — don't risk a collapse

### Boss Strategy

1. **Save your Ultimate** for boss encounters — the 50 MP cost is worth the massive damage
2. **Enter with full HP and MP** — skip or Defend on the encounter before a boss floor
3. **Use status effects** — Poison deals % max HP, which is extra effective against bosses with 2x HP
4. **Don't be greedy** — leaving before the boss is better than dying and losing Gold + floor progress

### Run Priority

1. **Get a buff early** — Luck or Defense are the best
2. **Heal when below 50% HP** — traps can finish you off
3. **Save MP for boss floors** (every 5 floors)
4. **Leave before your 5th encounter** if HP is dangerously low — you can always come back

## Rewards Summary

| Source | Gold | EXP | Materials | Equipment | Crates |
|--------|------|-----|-----------|-----------|--------|
| Monster | 50 + floor x 15 | 20 + floor x 8 | 30% chance | 10% chance | 5% Bronze |
| Treasure | 30 + floor x 10 | 10 + floor x 5 | 50% chance | 15% chance | 15% Bronze, 5% Silver |
| Boss | 3x monster rewards | 3x monster rewards | Guaranteed | 50% chance | 50% Silver, 15% Gold |
| Trap | -(20 + floor x 5) | — | — | — | — |

## Commands Reference

| Command | Description |
|---------|-------------|
| `/dungeon` | Start a dungeon run (1h cooldown) |
| `/adventure profile` | Check your character stats and equipment |
| `/adventure inventory` | View materials and equipment |
| `/adventure equip` | Equip better gear before a run |
| `/guild quests` | Check quests that track dungeon progress |
