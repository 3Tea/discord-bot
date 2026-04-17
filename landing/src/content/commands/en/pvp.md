---
title: PvP
command: pvp
category: rpg
description: Player vs Player battles — challenge other players and track your rating.
cooldown: "5m"
---

## Overview

The `/pvp` command lets you challenge other players to 1v1 battles using your RPG characters. Combat uses simultaneous turns with an Elo-based rating system.

## Subcommands

| Subcommand | Description | Example |
|------------|-------------|---------|
| `challenge <user>` | Challenge another player to a PvP battle | `/pvp challenge @player` |
| `stats` | View your PvP win/loss record and rating | `/pvp stats` |

## How It Works

### Challenging

Use `/pvp challenge @player` to send a battle request. The target player must:
- Have an RPG character (created via `/adventure create`)
- Accept the challenge within the timeout period

### Combat

PvP combat uses the same stat-based system as dungeons, but against another player. Both players choose actions **simultaneously** each turn — neither player knows what the other picked until the turn resolves.

Available actions:

| Action | Effect |
|--------|--------|
| Attack | Basic attack based on STR/MAG |
| Skill 1 | Class-specific skill (costs MP) |
| Skill 2 | Class-specific skill (costs MP) |
| Defend | Reduce incoming damage |
| Ultimate | Powerful skill for advanced classes (level 20+) |

### Rating System

PvP uses an Elo-based rating system. Wins against higher-rated opponents grant more rating points, while losses against lower-rated opponents cost more. Your rating reflects your competitive standing among all players.

### Stats

Use `/pvp stats` to view:
- Total wins and losses
- Win rate percentage
- Current Elo rating
- Recent match history

> **Tip:** Class matchups matter — learn your class strengths and weaknesses. Defending at the right time can turn the tide of a battle, especially against burst-damage classes like Mage and Assassin.
