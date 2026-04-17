---
title: Guild
command: guild
category: rpg
description: Adventurer Guild — join the guild, complete quests, earn GP, and climb the ranks.
---

## Overview

The `/guild` command lets you join the Adventurer Guild, take on daily quests, earn Guild Points (GP), and rank up through 10 tiers. Compete with other adventurers on the leaderboard and participate in branch guild activities.

## Subcommands

| Subcommand | Description | Example |
|------------|-------------|---------|
| `register` | Join the Adventurer Guild | `/guild register` |
| `profile` | View your guild rank, GP, and quest stats | `/guild profile` |
| `board` | View today's daily quest board | `/guild board` |
| `quests` | View and manage your active quests | `/guild quests` |
| `ranking` | View the guild leaderboard | `/guild ranking` |
| `branch` | View branch guild info and weekly quests | `/guild branch` |
| `event` | View the monthly competitive event | `/guild event` |

## Getting Started

Use `/guild register` to join the Adventurer Guild. You start at F rank with 0 GP. Complete quests to earn GP and rank up.

> **Requires an RPG character.** Use `/adventure create` first if you haven't already.

## Ranks

Progress through 10 ranks by accumulating Guild Points:

| Rank | Tier |
|------|------|
| F | Beginner |
| E | Novice |
| D | Apprentice |
| C | Journeyman |
| B | Veteran |
| A | Expert |
| S | Elite |
| SS | Master |
| SSS | Grandmaster |
| Legendary | Legendary |

Higher ranks unlock better quest rewards and guild perks.

## Daily Quest Board

The quest board refreshes daily with **3 shared board quests** available to all guild members plus **2 personal quests** unique to you. There are 12 quest action types covering various RPG activities.

Use `/guild board` to see available quests and `/guild quests` to track your active progress.

## Branch Guild

Each Discord server can have its own branch guild (set up by admins via `/guild-admin setup`). Branch guilds offer:

- **Weekly co-op quests** — collaborative objectives for all branch members
- **Monthly competitive events** — server vs server competitions

Use `/guild branch` to view your server's branch guild and `/guild event` to check the current monthly event.

## Leaderboard

Use `/guild ranking` to view rankings. Optional type parameter:

| Type | What It Shows |
|------|--------------|
| `gp` | Ranked by Guild Points |
| `rank` | Ranked by guild rank |
| `quests` | Ranked by quests completed |

> **Tip:** Complete your daily quests consistently to maximize GP gain. Streak bonuses from daily activity add up fast over time.
