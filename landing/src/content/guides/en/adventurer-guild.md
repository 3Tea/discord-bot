---
title: "Adventurer Guild"
description: "Complete guide to the Adventurer Guild — ranks, quests, branch guilds, and competitive events"
icon: "🏛️"
order: 21
relatedCommands: ["guild", "guild-admin"]
---

## Overview

The Adventurer Guild is your progression system beyond character leveling. Register to receive daily quests, earn Guild Points (GP), climb through 10 ranks, and compete in monthly events. If your server admin sets up a Branch Guild, you can participate in weekly cooperative quests and server-vs-server competitions.

## Getting Started

Run `/guild register` to join the Adventurer Guild. You start at **F Rank (Novice)** with 0 GP. From there, complete quests to earn GP and climb the ranks.

Use `/guild profile` to check your rank, GP, quest progress, and stats.

## Ranks

There are **10 ranks**, each requiring more GP, a higher character level, and more boss kills:

| Rank | Label | Emoji | GP Required | Min Level | Min Boss Kills |
|------|-------|-------|-------------|-----------|----------------|
| F | Novice | 🟤 | 0 | 1 | 0 |
| E | Beginner | ⚪ | 100 | 5 | 1 |
| D | Apprentice | 🟢 | 300 | 10 | 3 |
| C | Intermediate | 🔵 | 700 | 15 | 8 |
| B | Advanced | 🟣 | 1,500 | 20 | 15 |
| A | Expert | 🟡 | 3,000 | 25 | 25 |
| S | Elite | 🟠 | 6,000 | 30 | 40 |
| SS | Master | 🔴 | 12,000 | 35 | 60 |
| SSS | Grandmaster | ⭐ | 25,000 | 40 | 100 |
| Legendary | Legend | 👑 | 50,000 | 50 | 200 |

> **Tip:** You must meet ALL three requirements (GP, level, and boss kills) to rank up. Focus on dungeon boss fights to keep your boss kill count progressing alongside your GP.

## Quest System

The guild provides two types of daily quests:

### Board Quests (3 per day)

Shared across all guild members in the server. Three quests appear daily on the board, each requiring a different rank tier:

- Quest 1: Available from **F Rank**
- Quest 2: Available from **D Rank**
- Quest 3: Available from **B Rank**

View the board with `/guild board`.

### Personal Quests (2 per day)

Unique to you, generated based on your current rank. View them with `/guild quests`.

### Quest Action Types

There are **12 possible quest actions**:

| Action | Example Target |
|--------|---------------|
| Kill Monsters | Kill 5–60 monsters |
| Defeat Bosses | Defeat 1–8 bosses |
| Reach Floor | Reach floor 3–55 in dungeon |
| Earn Gold | Earn 200–25,000 Gold |
| Craft Equipment | Craft 1–7 items |
| Open Crates | Open 1–12 crates |
| Collect Materials | Collect 5–200 materials |
| Use Work | Use /work 2–12 times |
| Use Fish | Use /fish 2–12 times |
| Send Messages | Send 20–1,000 messages |
| Use Pray | Use /pray 1–10 times |
| Complete Quests | Complete 2–8 other quests |

Target amounts scale with your rank — higher ranks face bigger targets but earn more rewards.

### Quest Rewards

Each quest grants **Gold, EXP, and GP**. Rewards scale by rank:

| Rank | GP per Quest | Gold Multiplier | EXP Multiplier | Material Chance | Crate Chance |
|------|-------------|----------------|----------------|----------------|-------------|
| F | 10 | 1.0x | 1.0x | 20% | 0% |
| E | 15 | 1.2x | 1.2x | 30% | 5% |
| D | 20 | 1.4x | 1.4x | 40% | 10% |
| C | 30 | 1.6x | 1.6x | 50% | 15% |
| B | 45 | 1.8x | 1.8x | 60% | 20% |
| A | 65 | 2.0x | 2.0x | 70% | 25% |
| S | 90 | 2.5x | 2.5x | 80% | 35% |
| SS | 120 | 3.0x | 3.0x | 90% | 45% |
| SSS | 160 | 3.5x | 3.5x | 95% | 55% |
| Legendary | 200 | 4.0x | 4.0x | 100% | 70% |

You can hold up to **3 active quests** at a time.

## Branch Guilds

Branch Guilds are per-server extensions of the Adventurer Guild, set up by server admins using `/guild-admin setup`.

### What They Are

A Branch Guild represents your server's chapter of the global Adventurer Guild. Members contribute to shared objectives and compete against other servers.

### Weekly Cooperative Quests

Each week, the branch guild receives **3 cooperative quests** that all members contribute to together. Quest types are drawn from:

- Kill Monsters (base target: 100)
- Defeat Bosses (base target: 15)
- Earn Gold (base target: 10,000)
- Collect Materials (base target: 50)
- Complete Quests (base target: 30)
- Craft Equipment (base target: 10)

Targets scale with member count (base target x ceil(members / 5), max 20x).

#### Weekly Reward Tiers

| Quests Completed | Gold | EXP | GP | Crate |
|-----------------|------|-----|----|-------|
| 3 of 3 | 50 | 30 | 15 | Silver 🥈 |
| 2 of 3 | 30 | 20 | 10 | — |
| 1 of 3 | 15 | 10 | 5 | — |

### Monthly Competitive Events

Every month, a themed competitive event pits branch guilds against each other. The theme rotates through 6 options:

| Theme | Action | Emoji |
|-------|--------|-------|
| Boss Slayer | Defeat Bosses | ⚔️ |
| Gold Rush | Earn Gold | 🪙 |
| Monster Hunter | Kill Monsters | 🐉 |
| Master Crafter | Craft Equipment | 🔨 |
| Quest Champion | Complete Quests | 📜 |
| Material Collector | Collect Materials | 💎 |

Scoring uses **per-capita points** (total score / member count) so smaller servers can compete fairly.

#### Event Rewards (per member)

| Placement | Gold | EXP | GP | Crate |
|-----------|------|-----|----|-------|
| 1st | 200 | 100 | 50 | Gold 🥇 |
| 2nd | 100 | 50 | 25 | Silver 🥈 |
| 3rd | 50 | 25 | 10 | Bronze 🟫 |
| 4th–10th | 25 | 15 | 5 | — |

View the event with `/guild event` and the server ranking with `/guild ranking`.

## Guild Commands Reference

| Command | Description |
|---------|-------------|
| `/guild register` | Join the Adventurer Guild |
| `/guild profile` | View your guild rank, GP, and stats |
| `/guild board` | View daily board quests |
| `/guild quests` | View your personal quests |
| `/guild ranking` | View guild ranking leaderboard |
| `/guild branch` | View your server's branch guild info |
| `/guild event` | View current monthly competitive event |

### Admin Commands

| Command | Description |
|---------|-------------|
| `/guild-admin setup` | Create a branch guild for your server |
| `/guild-admin config` | Configure branch guild settings |
| `/guild-admin disband` | Disband the branch guild |
