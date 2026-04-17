---
title: "PvP Battles"
description: "Challenge other players to simultaneous-turn combat — actions, strategies, and rating system"
icon: "⚔️"
order: 22
relatedCommands: ["pvp", "adventure"]
---

## Overview

PvP lets you challenge other players to a 1v1 battle using your RPG character's stats and skills. Both players choose actions simultaneously each turn, making it a game of prediction and strategy rather than pure stats.

## How to Challenge

Use `/pvp challenge @user` to challenge another player. Both players must have an RPG character (created via `/adventure create`). The defender has 60 seconds to accept or decline.

**Requirements:**
- Both players must have an RPG character
- Neither player can be in an active PvP match
- 5-minute cooldown between matches

## How Combat Works

### Simultaneous Turns

Unlike dungeon combat where you act first, PvP uses **simultaneous turns**. Both players choose their action secretly, then actions resolve at the same time. Speed (SPD) determines who goes first when order matters (e.g., if both players would die, the faster player wins).

### Maximum Turns

Matches last up to **10 turns**. If neither player is defeated by then, the player with the **higher HP percentage** wins. If both have the same HP%, it's a draw.

### Available Actions

| Action | MP Cost | Effect |
|--------|---------|--------|
| ⚔️ Attack | 0 | Basic attack using your primary damage stat |
| Skill 1 | 20 MP | Your class's first skill |
| Skill 2 | 30 MP | Your class's second skill |
| 🛡️ Defend | 0 | Take 50% damage + heal 5% max HP + regen 15 extra MP |
| Ultimate | 50 MP | Advanced class only, once per match |

> **Tip:** If you don't have enough MP for a skill, the action automatically falls back to a basic Attack. Defend is free and regenerates extra MP — use it to set up big skill turns.

### PvP Damage Modifier

All damage in PvP is multiplied by **0.6x** compared to dungeon combat. This makes fights last longer and more strategic, rather than one-shot kills.

### MP System

- Base MP: 50 + (level x 5)
- MP regeneration per turn: 5 (passive)
- Defend bonus MP regen: +15 (total 20 MP when defending)
- Skills cost 20/30/50 MP

### Status Effects

Skills that apply status effects in dungeons work the same way in PvP:

| Effect | Description |
|--------|-------------|
| DEF Buff | Increases your DEF by the specified percentage |
| SPD Debuff | Reduces opponent's SPD |
| Poison | Deals % of max HP as damage each turn |

### Auto-Defend & Forfeit

If a player doesn't submit an action within the time limit, they automatically **Defend**. Three consecutive auto-defends count as a **forfeit**, ending the match in a loss.

## Rewards

### Win Rewards

| Reward | Amount |
|--------|--------|
| Gold | 100 |
| GP | 20 |
| Rating | +25 |

### Loss Rewards

| Reward | Amount |
|--------|--------|
| GP | 5 |
| Rating | -10 (minimum 0) |

### Draw

Both players receive 5 GP. No Gold or rating change.

## Rating System

PvP has a simple rating system starting at 0. Win to gain **+25 rating**, lose to lose **-10 rating** (never drops below 0). Check your rating with `/pvp stats`.

The rating system rewards active PvP participation — even a 50% win rate will climb your rating over time.

## Strategy Tips

### General Strategy

1. **Open with Defend** to build MP, then spend on skills in turns 2–3
2. **Track your opponent's MP** — if they just used a big skill, they likely can't use another next turn
3. **Predict Defend turns** — if your opponent is low HP, they'll likely Defend. Use a skill to punch through the damage reduction
4. **Speed matters** — the faster player resolves first on simultaneous KOs

### Class Matchup Tips

- **vs Tank**: Use armor-piercing skills (Archer/Swordsman) or magic damage (Mage) to bypass high DEF
- **vs Assassin**: Defend frequently to survive burst damage. Poison wears off — outlast them
- **vs Healer**: Apply pressure with consistent damage. Don't let them freely heal every other turn
- **vs Mage**: Rush them down — low HP means they can't survive sustained damage. Physical attacks bypass MAG_DEF
- **vs Swordsman**: Balanced matchup. Superior class skills or Ultimate usage usually decides it

### Advanced Class Ultimates in PvP

- **Priest's Resurrection** is the strongest PvP ultimate — it gives you a second life
- **Sniper's Headshot** (5.0x damage) can end fights instantly
- **Phantom's Shadow Strike** ignores 100% DEF — devastating against Tanks
- **Paladin's Divine Shield** heals 50% HP — effectively doubles your remaining HP
- **Warlock's Soul Burn** (4.0x magic damage) melts any non-Tank class

## Commands Reference

| Command | Description |
|---------|-------------|
| `/pvp challenge @user` | Challenge a player to PvP |
| `/pvp stats` | View your PvP record and rating |
| `/adventure profile` | Check your character's stats before fighting |
